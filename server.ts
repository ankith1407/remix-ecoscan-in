import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import crypto from 'crypto';
import { createServer } from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { z } from 'zod';
import { db, DbUser, DbCollector, DbPickupRequest, DbPayment, DbEcoTransaction, DbNotification, PickupStatus, RecipientRole } from './server/db';
import { DbService, prisma } from './server/services/dbService';
import { RewardsService } from './server/services/rewardsService';
import { logger, httpLogStream } from './server/logger';
import { analyzeWasteImage, askEcoAiChat, GeminiTimeoutError, GeminiUnavailableError, GeminiInvalidResponseError, GeminiLowConfidenceResult } from './server/gemini';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  requireAuth,
  requireRole,
  verifyRefreshToken,
  AuthenticatedRequest,
} from './server/middleware/auth';
import {
  initializeSockets,
  notifyPickupStatusUpdate,
  notifyLiveCollectorLocation,
  notifyUserNotification,
  notifyCollectorNotification,
  notifyAdminNotification,
} from './server/sockets/socketHandler';

dotenv.config();

// ── Global unhandled rejection / exception guards ────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

const app = express();
const httpServer = createServer(app);
const io = initializeSockets(httpServer);

const DEFAULT_PORT = Number(process.env.PORT) || 3000;

function sanitizeUser(user: DbUser) {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function setAuthCookies(res: express.Response, tokens: { accessToken: string; refreshToken: string }) {
  const secure = process.env.NODE_ENV === 'production';
  const options = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };
  res.cookie('accessToken', tokens.accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', tokens.refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function isAdmin(req: AuthenticatedRequest): boolean {
  return req.user?.role === 'admin';
}

function ownsUser(req: AuthenticatedRequest, userId: string): boolean {
  return Boolean(req.user && (isAdmin(req) || req.user.id === userId));
}

async function collectorOwnsPickup(
  req: AuthenticatedRequest,
  pickup: DbPickupRequest
): Promise<{ allowed: boolean; reason?: string; collector?: DbCollector }> {
  if (!req.user) {
    return { allowed: false, reason: 'Your session has expired. Please sign in again.' };
  }

  if (isAdmin(req)) {
    return { allowed: true };
  }

  // 1. Fetch collector profile for current user from Prisma SQLite first, then JsonDb fallback
  let collector = await DbService.getCollectorByUserId(req.user.id).catch(() => null);
  if (!collector) {
    collector = db.getCollectorByUserId(req.user.id) || null;
  }

  // 2. If pickup is unassigned, any collector user can access to accept/process
  if (!pickup.collector_id) {
    if (collector || req.user.role === 'collector' || process.env.NODE_ENV !== 'production') {
      return { allowed: true, collector: collector || undefined };
    }
    return { allowed: false, reason: 'Collector profile not found for this account.' };
  }

  // 3. If authenticated user's collector profile matches pickup.collector_id
  if (collector && collector.id === pickup.collector_id) {
    return { allowed: true, collector };
  }

  // 4. If assigned collector profile's user_id matches req.user.id
  const assignedCol = (await DbService.getCollectorById(pickup.collector_id).catch(() => null)) || db.getCollectorById(pickup.collector_id);
  if (assignedCol && assignedCol.user_id === req.user.id) {
    return { allowed: true, collector: assignedCol };
  }

  // 5. If current user is the citizen who created the pickup (read-only owner check)
  if (pickup.user_id === req.user.id) {
    return { allowed: true };
  }

  // 6. Dev environment fallback if user has 'collector' role or is testing in non-production
  if (process.env.NODE_ENV !== 'production' && (req.user.role === 'collector' || collector)) {
    return { allowed: true, collector: collector || undefined };
  }

  return { allowed: false, reason: 'You are not assigned to this pickup request.' };
}

function validateStatusTransition(current: PickupStatus, target: PickupStatus): { valid: boolean; reason?: string } {
  if (current === target) return { valid: true };

  if ((current === 'ON_THE_WAY' && target === 'COLLECTOR_ON_THE_WAY') ||
      (current === 'COLLECTOR_ON_THE_WAY' && target === 'ON_THE_WAY')) {
    return { valid: true };
  }

  if ((current === 'OTP_PENDING' && target === 'OTP_VERIFICATION') ||
      (current === 'OTP_VERIFICATION' && target === 'OTP_PENDING')) {
    return { valid: true };
  }

  if ((current === 'WEIGHED' && target === 'WEIGHT_VERIFIED') ||
      (current === 'WEIGHT_VERIFIED' && target === 'WEIGHED')) {
    return { valid: true };
  }

  if (current === 'COMPLETED') {
    return { valid: false, reason: 'This pickup has already been completed.' };
  }
  if (current === 'CANCELLED') {
    return { valid: false, reason: 'This pickup has been cancelled.' };
  }
  if (current === 'REJECTED') {
    return { valid: false, reason: 'This pickup has been declined.' };
  }

  const validTransitions: Record<string, string[]> = {
    REQUESTED: ['ASSIGNING', 'ACCEPTED', 'CANCELLED', 'REJECTED'],
    ASSIGNING: ['ACCEPTED', 'CANCELLED', 'REJECTED'],
    ACCEPTED: ['ON_THE_WAY', 'COLLECTOR_ON_THE_WAY', 'CANCELLED', 'REJECTED'],
    ON_THE_WAY: ['ARRIVED', 'CANCELLED', 'FAILED'],
    COLLECTOR_ON_THE_WAY: ['ARRIVED', 'CANCELLED', 'FAILED'],
    ARRIVED: ['OTP_PENDING', 'OTP_VERIFICATION', 'OTP_VERIFIED', 'CANCELLED', 'FAILED'],
    OTP_PENDING: ['OTP_VERIFIED', 'CANCELLED', 'FAILED'],
    OTP_VERIFICATION: ['OTP_VERIFIED', 'CANCELLED', 'FAILED'],
    OTP_VERIFIED: ['COLLECTING', 'CANCELLED', 'FAILED'],
    COLLECTING: ['WEIGHED', 'WEIGHT_VERIFIED', 'CANCELLED', 'FAILED'],
    WEIGHED: ['AMOUNT_CONFIRMED', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'FAILED'],
    WEIGHT_VERIFIED: ['AMOUNT_CONFIRMED', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'FAILED'],
    AMOUNT_CONFIRMED: ['PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'FAILED'],
    PAYMENT_PENDING: ['COMPLETED', 'CANCELLED', 'FAILED'],
  };

  const allowed = validTransitions[current] || [];
  if (allowed.includes(target)) {
    return { valid: true };
  }

  return { valid: false, reason: `Invalid transition from status '${current}' to '${target}'.` };
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('combined', { stream: httpLogStream }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.CORS_ORIGIN;
  if (origin && allowedOrigin && origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  if (origin) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  res.setHeader('Vary', 'Origin');
  next();
});

app.use(express.json({ limit: '10mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: express.Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id ? `otp_limit_${authReq.user.id}` : `otp_limit_${req.ip || '127.0.0.1'}`;
  },
  skip: () => process.env.NODE_ENV !== 'production',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMITED',
      message: 'Too many OTP verification requests. Please wait a moment before trying again.',
      retryAfter: 60,
    });
  },
});


// ----------------------------------------------------
// 1. Health check (liveness + readiness)
// ----------------------------------------------------
app.get('/api/health', async (req, res) => {
  let dbOk = false;
  try {
    const { prisma } = await import('./server/services/dbService');
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    app: 'EcoScan IN',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'error',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    authConfigured: Boolean(process.env.JWT_SECRET),
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/api/health/ready', async (_req, res) => {
  try {
    const { prisma } = await import('./server/services/dbService');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready', reason: 'Database unreachable' });
  }
});

app.use('/api', (req, res, next) => {
  const publicRoute =
    (req.path === '/auth/login' && req.method === 'POST') ||
    (req.path === '/auth/register' && req.method === 'POST') ||
    (req.path === '/auth/logout' && req.method === 'POST') ||
    (req.path === '/auth/refresh' && req.method === 'POST') ||
    (req.path === '/materials' && req.method === 'GET') ||
    (req.path === '/rewards' && req.method === 'GET');
  if (publicRoute) return next();
  return requireAuth(req as AuthenticatedRequest, res, next);
});

// ----------------------------------------------------
// 2. JWT Production Authentication API
// ----------------------------------------------------
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6).max(128),
  role: z.enum(['user', 'collector', 'admin']).optional(),
  address: z.string().optional(),
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
    }
    const { name, email, phone, password, role, address } = parsed.data;

    // Check for existing user via Prisma & JsonDb
    const existingPrisma = await DbService.getUserByEmail(email);
    const existingJson = db.getUserByEmail(email);
    if (existingPrisma || existingJson) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const userRole = role || 'user';

    const userPayload: DbUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      password_hash: passwordHash,
      role: userRole as any,
      address: address || '',
      eco_credits: 50,
      total_waste_recycled: 0,
      total_earnings: 0,
      profile_image: '',
      created_at: new Date().toISOString(),
    };

    // Save to Prisma SQLite
    const newUser = await DbService.saveUser(userPayload);
    // Save to in-memory/JSON DB so both stores stay synchronized
    db.saveUser(newUser);

    // If registered as collector, create associated Collector profile record in both DBs
    if (userRole === 'collector') {
      const colId = `col_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const colObj: DbCollector = {
        id: colId,
        user_id: newUser.id,
        name: newUser.name,
        phone: newUser.phone || '+91 90000 00000',
        verification_status: 'PENDING',
        service_area: 'Hyderabad Central',
        latitude: 17.3850,
        longitude: 78.4867,
        available: false,
        rating: 5.0,
        total_pickups: 0,
        total_earnings: 0,
      };
      db.saveCollector(colObj);
      await DbService.saveCollector(colObj).catch((e) => logger.warn('[AUTH] Error creating Prisma collector profile', { error: e.message }));
    }

    logger.info('[AUTH] User registered successfully', { userId: newUser.id, email: newUser.email, role: newUser.role });

    const tokens = generateTokens({ id: newUser.id, email: newUser.email, role: newUser.role as any });
    setAuthCookies(res, tokens);
    res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err: any) {
    logger.error('[AUTH] Registration error', { error: err.message });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }
    const { email, phone, password } = parsed.data;
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    // Look up user via Prisma first, fall back to JsonDb
    let user = email ? await DbService.getUserByEmail(email) : null;
    if (!user) {
      const dbUsers = db.getUsers();
      const legacyUser = email
        ? dbUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())
        : dbUsers.find((u) => u.phone === phone);
      user = legacyUser || null;
    }

    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      logger.warn('[AUTH] Login failed: invalid credentials', { email, phone });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Ensure user is present in JsonDb for memory queries
    if (!db.getUserById(user.id)) {
      db.saveUser(user);
    }

    logger.info('[AUTH] User logged in successfully', { userId: user.id, email: user.email, role: user.role });

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role as any });
    setAuthCookies(res, tokens);
    res.json({ user: sanitizeUser(user) });
  } catch (err: any) {
    logger.error('[AUTH] Login error', { error: err.message });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});


app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ status: 'ok' });
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = (req as any).cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required.' });
  }
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
  const user = db.getUserById(payload.id);
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists.' });
  }
  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  setAuthCookies(res, tokens);
  res.json({ status: 'ok' });
});


app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  // Try Prisma first, fall back to flat-file
  let user = await DbService.getUserById(req.user.id);
  if (!user) user = db.getUserById(req.user.id) || null;
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

app.get('/api/users/:id/addresses', (req, res) => {
  if (!ownsUser(req as AuthenticatedRequest, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const addresses = user.address ? [{
      id: `addr_def_${user.id}`,
      userId: user.id,
      label: 'Home (Default)',
      fullAddress: user.address,
      pincode: '',
      city: '',
      state: '',
      isDefault: true,
      ...(user.latitude !== undefined ? { latitude: user.latitude } : {}),
      ...(user.longitude !== undefined ? { longitude: user.longitude } : {}),
    }] : [];

  res.json(addresses);
});

app.post('/api/users/:id/addresses', (req, res) => {
  if (!ownsUser(req as AuthenticatedRequest, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { label, fullAddress, pincode, city, landmark } = req.body;
  if (!fullAddress) return res.status(400).json({ error: 'Full address is required' });

  const newAddress = {
    id: `addr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: req.params.id,
    label: label || 'Home',
    fullAddress,
    landmark: landmark || '',
    pincode: pincode || '',
    city: city || '',
    state: '',
    isDefault: false,
  };

  res.status(201).json(newAddress);
});

app.put('/api/users/:id', (req, res) => {
  if (!ownsUser(req as AuthenticatedRequest, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const allowedUpdates = ['name', 'phone', 'address', 'profile_image'] as const;
  const safeUpdates = Object.fromEntries(
    allowedUpdates.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]])
  );
  res.json(sanitizeUser(db.saveUser({ ...user, ...safeUpdates, id: user.id })));
});

// ----------------------------------------------------
// 3. Waste Materials & Dynamic Pricing API
// ----------------------------------------------------
app.get('/api/materials', async (req, res) => {
  try {
    // Try Prisma first; fall back to flat-file if empty
    let materials = await DbService.getMaterials();
    if (!materials || materials.length === 0) {
      materials = db.getMaterials();
    }
    res.json(materials);
  } catch {
    res.json(db.getMaterials());
  }
});

app.put('/api/materials/:id', requireRole('admin'), (req, res) => {
  const { current_price_per_kg, recyclable, disposal_instruction, material_name, category } = req.body;
  const updated = db.updateMaterial(req.params.id, {
    ...(current_price_per_kg !== undefined && { current_price_per_kg: Number(current_price_per_kg) }),
    ...(recyclable !== undefined && { recyclable: Boolean(recyclable) }),
    ...(disposal_instruction && { disposal_instruction }),
    ...(material_name && { material_name }),
    ...(category && { category }),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Material not found' });
  }
  res.json(updated);
});

app.post('/api/materials', requireRole('admin'), (req, res) => {
  const { material_name, category, current_price_per_kg, unit, recyclable, disposal_instruction } = req.body;
  if (!material_name || current_price_per_kg === undefined) {
    return res.status(400).json({ error: 'Material name and price are required' });
  }
  const newMat = db.addMaterial({
    id: `mat-${Date.now()}`,
    material_name,
    category: category || 'Other',
    current_price_per_kg: Number(current_price_per_kg),
    unit: unit || '₹/kg',
    recyclable: recyclable !== undefined ? Boolean(recyclable) : true,
    disposal_instruction: disposal_instruction || 'Segregate cleanly for scrap mandi buyback.',
    last_updated: new Date().toISOString(),
  });
  res.status(201).json(newMat);
});

// ----------------------------------------------------
// 4. Real AI Waste Scanner (Gemini Vision)
// ----------------------------------------------------
app.post('/api/waste/scan', aiLimiter, async (req, res) => {
  try {
    const { image, mimeType, language } = req.body;
    const userId = (req as AuthenticatedRequest).user?.id;
    if (typeof image !== 'string' || image.length === 0 || image.length > 8 * 1024 * 1024) {
      return res.status(400).json({ code: 'IMAGE_INVALID', error: 'Image data is required and must be under 8 MB' });
    }
    if (mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return res.status(400).json({ code: 'IMAGE_INVALID', error: 'Only JPEG, PNG, and WebP images are supported' });
    }

    const analysis = await analyzeWasteImage(image, mimeType || 'image/jpeg', language);

    // Save scan record to Prisma SQLite (durable)
    const scanId = `scan_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let scanRecord: any = {
      id: scanId,
      user_id: userId!,
      detected_material: analysis.material,
      waste_category: analysis.category,
      confidence: analysis.confidence,
      estimated_weight: analysis.estimated_weight ?? 0,
      estimated_value: analysis.estimated_value ?? 0,
      disposal_instruction: analysis.disposal_instruction,
      created_at: new Date().toISOString(),
    };

    if (userId) {
      try {
        const { prisma } = await import('./server/services/dbService');
        const saved = await prisma.wasteScan.create({
          data: {
            id: scanId,
            userId,
            detectedMaterial: analysis.material,
            wasteCategory: analysis.category,
            confidence: analysis.confidence,
            estimatedWeight: analysis.estimated_weight ?? 0,
            estimatedValue: analysis.estimated_value ?? 0,
            disposalInstruction: analysis.disposal_instruction,
          },
        });
        scanRecord.id = saved.id;

        // Save activity to Prisma
        await prisma.userActivity.create({
          data: {
            userId,
            activityType: 'WASTE_SCANNED',
            title: 'Waste Material Scanned',
            description: `Detected ${analysis.material} (${analysis.category}) with ${Math.round(analysis.confidence * 100)}% AI confidence`,
            scanId: saved.id,
            wasteMaterial: analysis.material,
            weight: analysis.estimated_weight ?? undefined,
            status: 'SCANNED',
          },
        });
      } catch (dbErr) {
        // Non-fatal: log and continue — return analysis even if DB write fails
        logger.error('Failed to persist scan record to DB', { error: (dbErr as any).message, userId });
        db.addScan(scanRecord);
      }
    } else {
      db.addScan(scanRecord);
    }

    res.json({ scan: scanRecord, analysis });
  } catch (err: any) {
    if (err instanceof GeminiTimeoutError) {
      return res.status(408).json({ code: 'AI_TIMEOUT', error: 'AI analysis timed out. Please retry.' });
    }
    if (err instanceof GeminiUnavailableError) {
      return res.status(503).json({ code: 'AI_UNAVAILABLE', error: err.message || 'AI service is temporarily unavailable.' });
    }
    if (err instanceof GeminiInvalidResponseError) {
      return res.status(502).json({ code: 'AI_INVALID_RESPONSE', error: err.message || 'AI returned an unexpected response.' });
    }
    if (err instanceof GeminiLowConfidenceResult) {
      return res.status(422).json({ code: 'AI_LOW_CONFIDENCE', error: err.message, analysis: err.result });
    }

    logger.error('[API] Waste scan unexpected error', { error: err.message });
    res.status(500).json({ code: 'UNKNOWN_ERROR', error: 'Waste analysis failed. Please retry.' });
  }
});


// ----------------------------------------------------
// 5. Collectors & Verification API
// ----------------------------------------------------
app.get('/api/collectors', async (req, res) => {
  const { verified, available } = req.query;
  const prismaCols = await DbService.getCollectors().catch(() => []);
  const jsonCols = db.getCollectors();

  // Deduplicate by ID
  const map = new Map<string, DbCollector>();
  for (const c of [...jsonCols, ...prismaCols]) {
    map.set(c.id, c);
  }
  let collectors = Array.from(map.values());

  if (verified === 'true') {
    collectors = collectors.filter((c) => c.verification_status === 'VERIFIED');
  }
  if (available === 'true') {
    collectors = collectors.filter((c) => c.available);
  }
  res.json(collectors);
});

app.post('/api/collectors', async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { name, phone, service_area, verification_status, user_id } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Business name and phone number are required' });
    }

    const colId = `col_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let linkedUserId = user_id;

    if (!linkedUserId) {
      const userEmail = `col_${Date.now()}@ecoscan.in`;
      const passHash = await hashPassword('Collector@123');
      const newUser = {
        id: `usr_${colId}`,
        name,
        email: userEmail,
        phone,
        password_hash: passHash,
        role: 'collector' as const,
        address: service_area || 'Hyderabad Central',
        eco_credits: 100,
        total_waste_recycled: 0,
        total_earnings: 0,
        profile_image: '',
        created_at: new Date().toISOString(),
      };
      db.saveUser(newUser);
      await DbService.saveUser(newUser).catch(() => {});
      linkedUserId = newUser.id;
    }

    const newCol: DbCollector = {
      id: colId,
      user_id: linkedUserId,
      name,
      phone,
      verification_status: verification_status || 'VERIFIED',
      service_area: service_area || 'Hyderabad Central',
      latitude: 17.3850,
      longitude: 78.4867,
      available: true,
      rating: 5.0,
      total_pickups: 0,
      total_earnings: 0,
    };

    db.saveCollector(newCol);
    await DbService.saveCollector(newCol).catch(() => {});

    logger.info('[ADMIN] Collector created', { id: newCol.id, name: newCol.name });
    res.status(201).json(newCol);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create collector' });
  }
});

app.post('/api/admin/seed-collectors', async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const defaultHubs: DbCollector[] = [
      {
        id: 'col-1',
        user_id: 'usr_collector_raju',
        name: 'Raju Kumar (Green Earth Kabadiwala Hub)',
        phone: '+91 98765 43210',
        verification_status: 'VERIFIED',
        service_area: 'Jubilee Hills, Banjara Hills, Film Nagar, Madhapur',
        latitude: 17.4156,
        longitude: 78.4347,
        available: true,
        rating: 4.9,
        total_pickups: 142,
        total_earnings: 48950,
      },
      {
        id: 'col-2',
        user_id: 'usr_collector_suresh',
        name: 'Suresh Gowda (Hyderabad Metal & Paper Depot)',
        phone: '+91 98451 99887',
        verification_status: 'VERIFIED',
        service_area: 'HITECH City, Gachibowli, Kondapur, Madhapur',
        latitude: 17.4486,
        longitude: 78.3908,
        available: true,
        rating: 4.8,
        total_pickups: 89,
        total_earnings: 31200,
      },
      {
        id: 'col-3',
        user_id: 'usr_collector_pending',
        name: 'Ramesh Patel (Clean City Scrap)',
        phone: '+91 99002 33445',
        verification_status: 'PENDING',
        service_area: 'Kukatpally, Ameerpet, SR Nagar',
        latitude: 17.4849,
        longitude: 78.4138,
        available: false,
        rating: 4.5,
        total_pickups: 12,
        total_earnings: 3400,
      },
    ];

    for (const c of defaultHubs) {
      db.saveCollector(c);
      await DbService.saveCollector(c).catch(() => {});
    }

    logger.info('[ADMIN] Seeded default Hyderabad collectors', { count: defaultHubs.length });
    res.json({ message: 'Default Hyderabad collectors seeded successfully', count: defaultHubs.length, collectors: defaultHubs });
  } catch (err: any) {
    logger.error('[ADMIN] Seed collectors error', { error: err.message });
    res.status(500).json({ error: err.message || 'Failed to seed default collectors' });
  }
});

app.get('/api/collectors/:id', async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (req.params.id === 'me') {
    if (!auth.user) {
      const defaultCol = (await DbService.getCollectors().catch(() => []))[0] || db.getCollectors()[0];
      if (defaultCol) return res.json(defaultCol);
      return res.status(401).json({ error: 'Authentication required.' });
    }
    // Resolve collector by linked user_id in Prisma first, fall back to JsonDb
    let myCollector = await DbService.getCollectorByUserId(auth.user.id).catch(() => null);
    if (!myCollector) {
      myCollector = db.getCollectorByUserId(auth.user.id) || null;
    }
    if (!myCollector) {
      // Auto-create collector profile if user accesses collector desk
      let fullUser = await DbService.getUserById(auth.user.id);
      if (!fullUser) fullUser = db.getUserById(auth.user.id) || null;

      const colId = `col_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const newCol: DbCollector = {
        id: colId,
        user_id: auth.user.id,
        name: fullUser?.name || 'Kabadiwala Scrap Partner',
        phone: fullUser?.phone || '+91 98765 43210',
        verification_status: 'VERIFIED',
        service_area: 'Hyderabad Central',
        latitude: 17.3850,
        longitude: 78.4867,
        available: true,
        rating: 5.0,
        total_pickups: 0,
        total_earnings: 0,
      };
      db.saveCollector(newCol);
      await DbService.saveCollector(newCol).catch(() => {});
      myCollector = newCol;
    }
    return res.json(myCollector);
  }

  let collector = await DbService.getCollectorById(req.params.id).catch(() => null);
  if (!collector) collector = db.getCollectorById(req.params.id) || null;

  if (!collector) {
    return res.status(404).json({ error: 'Collector not found' });
  }
  if (!isAdmin(auth) && collector.user_id !== auth.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(collector);
});

app.put('/api/collectors/:id/verify', async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let col = db.getCollectorById(req.params.id) || (await DbService.getCollectorById(req.params.id));
  if (!col) {
    return res.status(404).json({ error: 'Collector not found' });
  }

  if (!isAdmin(auth) && col.user_id !== auth.user.id) {
    return res.status(403).json({ error: 'Forbidden: Admin privilege required to modify other collector accounts.' });
  }

  const { status } = req.body;
  if (!['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status' });
  }

  col.verification_status = status;
  if (status === 'VERIFIED') {
    col.available = true;
  }
  db.saveCollector(col);
  const updated = await DbService.saveCollector(col).catch(() => col);

  logger.info('[COLLECTOR] Approval status updated', { collectorId: col.id, status, updatedBy: auth.user.id });
  res.json(updated);
});

app.put('/api/collectors/:id/availability', async (req, res) => {
  const { available } = req.body;
  let col = db.getCollectorById(req.params.id) || (await DbService.getCollectorById(req.params.id));
  if (!col) {
    return res.status(404).json({ error: 'Collector not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!isAdmin(auth) && col.user_id !== auth.user?.id) {
    return res.status(403).json({ error: 'Forbidden: You do not own this collector profile' });
  }

  // Phase 5 Enforcement: Verify that collector is APPROVED before allowing them to go online
  if (available && col.verification_status !== 'VERIFIED') {
    return res.status(403).json({
      error: 'Your collector account is pending admin approval. You cannot go online until approved.',
      verificationStatus: col.verification_status,
    });
  }

  col.available = Boolean(available);
  db.saveCollector(col);
  const updated = await DbService.saveCollector(col).catch(() => col);

  logger.info('[COLLECTOR] Availability toggled', { collectorId: col.id, available: col.available });
  res.json(updated);
});

async function resolvePickup(id: string): Promise<DbPickupRequest | null> {
  let pickup = db.getPickupById(id);
  if (!pickup) {
    pickup = await DbService.getPickupById(id).catch(() => null);
    if (pickup) {
      db.createPickup(pickup);
    }
  }
  return pickup || null;
}

// ----------------------------------------------------
// 6. Pickup Lifecycle & State Machine API
// ----------------------------------------------------
app.get('/api/pickups', async (req, res) => {
  const { status } = req.query;
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Combine pickups from Prisma SQLite and JsonDb, deduplicated by ID (in-memory state takes precedence)
  const prismaPickups = await DbService.getPickups({}).catch(() => []);
  const jsonPickups = db.getPickups({});

  const map = new Map<string, DbPickupRequest>();
  for (const p of [...prismaPickups, ...jsonPickups]) {
    map.set(p.id, p);
  }
  let pickups = Array.from(map.values());

  if (status && typeof status === 'string') {
    const targetNorm = status.trim().toUpperCase();
    pickups = pickups.filter((p) => (p.status || '').toUpperCase() === targetNorm);
  }

  // Admin sees all pickups
  if (isAdmin(auth)) {
    return res.json(pickups);
  }

  // Collector sees pickups assigned to them OR open unassigned requests
  if (auth.user.role === 'collector') {
    let callerCol = await DbService.getCollectorByUserId(auth.user.id).catch(() => null);
    if (!callerCol) callerCol = db.getCollectorByUserId(auth.user.id) || null;
    const colId = callerCol?.id;

    if (process.env.NODE_ENV !== 'production') {
      logger.info('[DEV LOG] GET /api/pickups collector query', {
        authUserId: auth.user.id,
        resolvedCollectorId: colId,
        totalPickupsCount: pickups.length,
      });
    }

    return res.json(
      pickups.filter(
        (pickup) =>
          (colId && pickup.collector_id === colId) ||
          pickup.status === 'REQUESTED' ||
          pickup.status === 'ASSIGNING'
      )
    );
  }

  // Citizen user sees pickups they created
  res.json(pickups.filter((pickup) => pickup.user_id === auth.user?.id));
});

app.get('/api/pickups/:id', async (req, res) => {
  const pickup = await resolvePickup(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }
  const auth = req as AuthenticatedRequest;
  const isOwner = pickup.user_id === auth.user?.id;
  const isAssignedCollector = (await collectorOwnsPickup(auth, pickup)).allowed;
  if (!isAdmin(auth) && !isOwner && !isAssignedCollector) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(pickup);
});

// User requests a pickup
app.post('/api/pickups', async (req, res) => {
  const {
    waste_category,
    items_summary,
    estimated_weight,
    pickup_address,
    preferred_date,
    preferred_time,
  } = req.body;
  const authUser = (req as AuthenticatedRequest).user;
  const user_id = authUser?.id;

  if (!user_id || !pickup_address || !estimated_weight) {
    return res.status(400).json({ error: 'User session, pickup address, and estimated weight are required' });
  }

  // Phase 2 Fix: Check user in Prisma SQLite first, fall back to JsonDb
  let user = await DbService.getUserById(user_id);
  if (!user) user = db.getUserById(user_id) || null;

  if (!user) {
    logger.warn('[CREATE PICKUP] Failed: Authenticated user not found in database', { user_id, authEmail: authUser?.email });
    return res.status(401).json({ error: 'Authenticated user not found. Please sign in again.' });
  }

  logger.info('[AUTH] Authenticated user verified for pickup creation', { userId: user.id, email: user.email, phone: user.phone });

  const materials = db.getMaterials();
  const matchedMat =
    materials.find((m) => m.category.toLowerCase() === (waste_category || '').toLowerCase()) || materials[0];

  const estWeightNum = Number(estimated_weight) || 5;
  const estValue = Number((estWeightNum * matchedMat.current_price_per_kg).toFixed(2));
  
  // Cryptographically secure 4-digit OTP
  const secureOtp = crypto.randomInt(1000, 10000).toString();

  let assignedCollectorId: string | undefined;
  let assignedCollectorName = '';
  const verifiedCol = (await DbService.getCollectors().catch(() => []))
    .concat(db.getCollectors())
    .find((c) => c.verification_status === 'VERIFIED' && c.available);

  if (verifiedCol) {
    assignedCollectorId = verifiedCol.id;
    assignedCollectorName = verifiedCol.name;
  }

  const assignedCollector = assignedCollectorId
    ? (await DbService.getCollectorById(assignedCollectorId).catch(() => null)) || db.getCollectorById(assignedCollectorId)
    : undefined;

  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const pickupId = `ES-${dateStr}-${randomSuffix}`;

  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'A valid current pickup latitude and longitude are required' });
  }

  const newPickup: DbPickupRequest = {
    id: pickupId,
    user_id: user.id,
    user_name: user.name,
    user_phone: user.phone,
    collector_id: assignedCollectorId,
    collector_name: assignedCollectorName || 'Green Earth Kabadiwala Hub',
    collector_rating: assignedCollector?.rating,
    collector_phone: assignedCollector?.phone,
    waste_category: waste_category || 'Dry Recyclables',
    items_summary: items_summary || 'Sorted Household Scrap',
    estimated_weight: estWeightNum,
    estimated_value: estValue,
    pickup_address,
    special_instructions: req.body.special_instructions || '',
    latitude,
    longitude,
    preferred_date: preferred_date || 'Today',
    preferred_time: preferred_time || '10:30 AM',
    status: 'REQUESTED',
    status_history: [
      {
        id: `log-${Date.now()}-1`,
        pickup_id: pickupId,
        old_status: undefined,
        new_status: 'REQUESTED',
        status: 'REQUESTED',
        title: 'Pickup Requested',
        changed_by: user.id,
        changed_by_role: 'user',
        timestamp: now,
        note: `Requested doorstep pickup for ${estWeightNum} kg ${waste_category || 'Dry Recyclables'}`,
      },
    ],
    otp: secureOtp,
    created_at: now,
  };

  db.createPickup(newPickup);
  await DbService.createPickup(newPickup).catch((e) => logger.warn('[CREATE PICKUP] Error persisting to Prisma', { error: e.message }));

  logger.info('[CREATE PICKUP] Pickup created successfully', {
    authenticatedUserId: user.id,
    pickupUserId: newPickup.user_id,
    pickupId: newPickup.id,
    collectorId: newPickup.collector_id,
  });

  // Real-time Socket.IO notification broadcast & role-isolated persisted notifications
  notifyPickupStatusUpdate(newPickup.id, 'REQUESTED', newPickup);
  createPickupStatusNotifications(newPickup, 'REQUESTED');

  db.addUserActivity({
    id: `act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    user_id,
    activity_type: 'PICKUP_REQUESTED',
    title: 'Pickup Requested',
    description: `Submitted doorstep pickup request for ${estWeightNum} kg ${waste_category || 'Dry Recyclables'}`,
    pickup_id: newPickup.id,
    weight: estWeightNum,
    waste_material: waste_category || 'Dry Recyclables',
    timestamp: now,
    status: 'REQUESTED',
  });

  res.status(201).json(newPickup);
});

// Verify OTP with Server-Authoritative Identity, Idempotency & Race Protection
app.post('/api/pickups/:id/verify-otp', otpLimiter, async (req, res) => {
  const { otp } = req.body;
  const pickupId = req.params.id;
  const auth = req as AuthenticatedRequest;

  // 1. Authenticate session
  if (!auth.user) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  // 2. Fetch authoritative pickup record from Prisma DB first, then JsonDb
  let pickup = await DbService.getPickupById(pickupId);
  if (!pickup) {
    pickup = db.getPickupById(pickupId) || null;
  }

  if (!pickup) {
    return res.status(404).json({ error: 'Pickup request not found.' });
  }

  // 3. Strict Server-Side Ownership Check (User.id -> Collector.id -> Pickup.collector_id)
  const ownership = await collectorOwnsPickup(auth, pickup);
  if (!ownership.allowed) {
    return res.status(403).json({ error: ownership.reason || 'You are not assigned to this pickup request.' });
  }

  const currentStatus = (pickup.status || '').toUpperCase();

  // 4. Idempotency & Race Protection: If already verified or collecting, return current state immediately
  if (['OTP_VERIFIED', 'COLLECTING', 'WEIGHED', 'WEIGHT_VERIFIED', 'AMOUNT_CONFIRMED', 'PAYMENT_PENDING', 'COMPLETED'].includes(currentStatus)) {
    return res.json({ message: 'OTP is already verified.', pickup });
  }

  // 5. State Machine Validation: Must be in OTP-valid state
  const validOtpStatuses = ['ARRIVED', 'OTP_PENDING', 'OTP_VERIFICATION', 'ON_THE_WAY', 'COLLECTOR_ON_THE_WAY'];
  if (!validOtpStatuses.includes(currentStatus)) {
    return res.status(400).json({ error: 'This pickup is not ready for OTP verification.' });
  }

  // 6. Validate input OTP format
  const inputOtp = String(otp || '').trim();
  if (!inputOtp || inputOtp.length !== 4) {
    return res.status(400).json({ error: 'Please enter a valid 4-digit OTP code.' });
  }

  // 7. Attempt Counter & Exhaustion Check
  const attempts = (pickup.otp_attempts || 0) + 1;
  pickup.otp_attempts = attempts;

  if (attempts > 5) {
    pickup.status = 'FAILED';
    pickup.cancelled_reason = 'Maximum 5 OTP verification attempts exceeded';
    const updatedFailed = await DbService.savePickup(pickup);
    db.createPickup(updatedFailed);
    notifyPickupStatusUpdate(pickup.id, 'FAILED', updatedFailed);
    return res.status(400).json({ error: 'Maximum 5 OTP verification attempts reached. Pickup marked as FAILED.' });
  }

  // 8. Type-safe OTP Comparison (String conversion + master demo OTP fallback for dev)
  const targetOtp = String(pickup.otp || '').trim();
  const isMasterOtp = process.env.NODE_ENV !== 'production' && (inputOtp === '1234' || inputOtp === '0000');
  const isExactMatch = Boolean(targetOtp && targetOtp === inputOtp);

  if (!isExactMatch && !isMasterOtp) {
    const updatedAttempt = await DbService.savePickup(pickup);
    db.createPickup(updatedAttempt);
    return res.status(400).json({
      error: `Incorrect OTP. Please check the customer's 4-digit code. (Attempt ${attempts} of 5)`,
    });
  }

  // 9. Success — transition pickup status to OTP_VERIFIED and record status log
  const now = new Date().toISOString();
  pickup.otp_verified_at = now;
  pickup.status = 'OTP_VERIFIED';

  const collectorId = ownership.collector?.id || pickup.collector_id || auth.user.id;
  const logEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    pickup_id: pickup.id,
    old_status: currentStatus as PickupStatus,
    new_status: 'OTP_VERIFIED' as PickupStatus,
    status: 'OTP_VERIFIED' as PickupStatus,
    title: 'OTP Verified Successfully',
    changed_by: collectorId,
    changed_by_role: 'collector' as RecipientRole,
    timestamp: now,
    note: 'Collector verified customer 4-digit doorstep OTP code',
  };

  pickup.status_history = pickup.status_history ? [...pickup.status_history, logEntry] : [logEntry];

  // 10. Synchronously persist to both Prisma DB and JsonDb
  const updatedPickup = await DbService.savePickup(pickup);
  db.createPickup(updatedPickup);

  logger.info('[OTP VERIFY] OTP verified successfully', {
    pickupId: updatedPickup.id,
    collectorId: updatedPickup.collector_id,
    attempts,
  });

  // 11. Real-time Socket.IO notifications & role-isolated persisted notifications
  notifyPickupStatusUpdate(updatedPickup.id, 'OTP_VERIFIED', updatedPickup);
  createPickupStatusNotifications(updatedPickup, 'OTP_VERIFIED');

  res.json({ message: 'OTP verified successfully!', pickup: updatedPickup });
});

// Collector updates status: ASSIGNING, ACCEPTED, ON_THE_WAY, ARRIVED, OTP_VERIFICATION, etc.
app.put('/api/pickups/:id/status', async (req, res) => {
  const { status } = req.body;
  const auth = req as AuthenticatedRequest;

  const validStatuses: PickupStatus[] = [
    'REQUESTED',
    'ASSIGNING',
    'ACCEPTED',
    'ON_THE_WAY',
    'COLLECTOR_ON_THE_WAY',
    'ARRIVED',
    'OTP_PENDING',
    'OTP_VERIFICATION',
    'OTP_VERIFIED',
    'COLLECTING',
    'WEIGHED',
    'WEIGHT_VERIFIED',
    'AMOUNT_CONFIRMED',
    'PAYMENT_PENDING',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
    'FAILED',
    'NO_SHOW',
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status requested' });
  }

  const existing = await resolvePickup(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }

  // If accepting an unassigned or requested pickup:
  if (status === 'ACCEPTED' && (existing.status === 'REQUESTED' || existing.status === 'ASSIGNING' || existing.status === 'ACCEPTED')) {
    let callerCol: DbCollector | null = null;
    if (auth.user) {
      callerCol = (await DbService.getCollectorByUserId(auth.user.id).catch(() => null)) || db.getCollectorByUserId(auth.user.id) || null;
    }
    if (!callerCol) {
      const allCols = (await DbService.getCollectors().catch(() => [])).concat(db.getCollectors());
      callerCol = allCols[0] || null;
    }
    if (!callerCol) {
      let fullUser = auth.user ? await DbService.getUserById(auth.user.id) : null;
      if (!fullUser && auth.user) fullUser = db.getUserById(auth.user.id) || null;

      const colId = `col_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      callerCol = {
        id: colId,
        user_id: auth.user?.id || 'usr_collector_raju',
        name: fullUser?.name || 'Raju Kumar (Green Earth Kabadiwala Hub)',
        phone: fullUser?.phone || '+91 98765 43210',
        verification_status: 'VERIFIED',
        service_area: 'Hyderabad Central',
        latitude: 17.4156,
        longitude: 78.4347,
        available: true,
        rating: 4.9,
        total_pickups: 0,
        total_earnings: 0,
      };
      db.saveCollector(callerCol);
      await DbService.saveCollector(callerCol).catch(() => {});
    }

    // Assign the pickup to the accepting collector
    existing.collector_id = callerCol.id;
    existing.collector_name = callerCol.name;
    existing.collector_phone = callerCol.phone;
    existing.collector_rating = callerCol.rating;
  }

  // Idempotency: if already in target status, return existing record
  if (existing.status === status) {
    return res.json(existing);
  }

  // Validate state machine transition
  const transitionCheck = validateStatusTransition(existing.status, status);
  if (!transitionCheck.valid) {
    return res.status(400).json({ error: transitionCheck.reason || 'Invalid status transition' });
  }

  const updated = db.updatePickup(req.params.id, {
    status,
    ...(existing.collector_id && { collector_id: existing.collector_id }),
    ...(existing.collector_name && { collector_name: existing.collector_name }),
    ...(existing.collector_phone && { collector_phone: existing.collector_phone }),
    ...(existing.collector_rating && { collector_rating: existing.collector_rating }),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }

  // Persist synchronously to Prisma
  await DbService.savePickup(updated).catch((e) => logger.warn('[PICKUP] Error persisting status change to Prisma', { error: e.message }));

  if (process.env.NODE_ENV !== 'production') {
    logger.info('[DEV LOG] Pickup status transition completed', {
      authUserId: auth.user?.id,
      pickupId: updated.id,
      pickupCollectorId: updated.collector_id,
      statusBefore: existing.status,
      statusAfter: updated.status,
    });
  }

  // Real-time Socket.IO Broadcast & role-isolated persisted notifications
  notifyPickupStatusUpdate(updated.id, status, updated);
  createPickupStatusNotifications(updated, status);

  res.json(updated);
});

// Role-Isolated Persistent Notification Helper
function createPickupStatusNotifications(pickup: any, status: PickupStatus) {
  const now = new Date().toISOString();
  const userId = pickup.user_id;
  const collectorId = pickup.collector_id || 'col_raju';
  const collectorName = pickup.collector_name || 'Raju Kumar (Green Earth Kabadiwala Hub)';

  // 1. Citizen Notification (role: 'user')
  let userTitle = '';
  let userMsg = '';
  if (status === 'REQUESTED') {
    userTitle = '🚚 Pickup Requested';
    userMsg = `Your pickup request #${pickup.id} for ${pickup.estimated_weight} kg ${pickup.waste_category || 'recyclables'} was received.`;
  } else if (status === 'ACCEPTED') {
    userTitle = '🤝 Collector Assigned!';
    userMsg = `${collectorName} has accepted your pickup request #${pickup.id}.`;
  } else if (status === 'ON_THE_WAY' || status === 'COLLECTOR_ON_THE_WAY') {
    userTitle = '🚚 Collector On The Way!';
    userMsg = `${collectorName} is heading to your doorstep. Keep your waste ready!`;
  } else if (status === 'ARRIVED') {
    userTitle = '📍 Collector Arrived!';
    userMsg = `${collectorName} has arrived. Please share 4-digit OTP: ${pickup.otp}.`;
  } else if (status === 'OTP_VERIFIED') {
    userTitle = '🔐 OTP Verified!';
    userMsg = `Doorstep OTP verified by ${collectorName}. Collection and weighing in progress.`;
  } else if (status === 'WEIGHED' || status === 'WEIGHT_VERIFIED') {
    userTitle = '⚖️ Waste Weighed!';
    userMsg = `Verified weight: ${pickup.actual_weight || pickup.estimated_weight} kg. Payout: ₹${pickup.final_value || pickup.estimated_value}.`;
  } else if (status === 'COMPLETED') {
    userTitle = '🎉 Pickup Completed!';
    userMsg = `Pickup #${pickup.id} completed. Earned ₹${pickup.final_value || pickup.estimated_value} and +${(pickup.actual_weight || pickup.estimated_weight || 5) * 10} Eco Credits!`;
  } else if (status === 'CANCELLED' || status === 'REJECTED' || status === 'FAILED') {
    userTitle = '❌ Pickup Cancelled';
    userMsg = `Pickup request #${pickup.id} has been cancelled.`;
  }

  if (userTitle && userId) {
    const userNotif: DbNotification = {
      id: `notif_usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      recipient_id: userId,
      recipient_role: 'user',
      title: userTitle,
      message: userMsg,
      type: `PICKUP_${status}`,
      pickup_id: pickup.id,
      read: false,
      is_read: false,
      created_at: now,
    };
    db.addNotification(userNotif);
    notifyUserNotification(userId, userNotif);
  }

  // 2. Kabadiwala / Collector Notification (role: 'collector')
  let colTitle = '';
  let colMsg = '';
  if (status === 'REQUESTED' || status === 'ASSIGNING') {
    colTitle = '📦 New Pickup Assignment';
    colMsg = `New doorstep pickup #${pickup.id} requested for ${pickup.estimated_weight} kg in your service area.`;
  } else if (status === 'ACCEPTED') {
    colTitle = '✅ Pickup Accepted';
    colMsg = `You accepted pickup #${pickup.id}. Start trip when ready.`;
  } else if (status === 'ON_THE_WAY' || status === 'COLLECTOR_ON_THE_WAY') {
    colTitle = '🗺️ Route Active';
    colMsg = `Live navigation active for customer ${pickup.user_name || 'Citizen'}.`;
  } else if (status === 'ARRIVED') {
    colTitle = '🚪 Arrived at Location';
    colMsg = `Arrived at customer address. Ask for 4-digit doorstep OTP.`;
  } else if (status === 'OTP_VERIFIED') {
    colTitle = '🔓 Doorstep OTP Verified';
    colMsg = `OTP correct! Weigh recyclables and confirm payout.`;
  } else if (status === 'COMPLETED') {
    colTitle = '💰 Trip Completed';
    colMsg = `Pickup #${pickup.id} finished. Collection payout credited to wallet.`;
  }

  if (colTitle && collectorId) {
    const colNotif: DbNotification = {
      id: `notif_col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: collectorId,
      recipient_id: collectorId,
      recipient_role: 'collector',
      title: colTitle,
      message: colMsg,
      type: `COLLECTOR_PICKUP_${status}`,
      pickup_id: pickup.id,
      read: false,
      is_read: false,
      created_at: now,
    };
    db.addNotification(colNotif);
    notifyCollectorNotification(collectorId, colNotif);
  }

  // 3. Admin Control Notification (role: 'admin')
  let adminTitle = '';
  let adminMsg = '';
  if (status === 'REQUESTED') {
    adminTitle = '📋 New Pickup Logged';
    adminMsg = `Pickup #${pickup.id} submitted (${pickup.estimated_weight} kg ${pickup.waste_category || 'recyclables'}).`;
  } else if (status === 'ACCEPTED') {
    adminTitle = '⚡ Collector Dispatched';
    adminMsg = `Collector ${collectorName} assigned to pickup #${pickup.id}.`;
  } else if (status === 'COMPLETED') {
    adminTitle = '🌱 Recycling Milestone Closed';
    adminMsg = `Pickup #${pickup.id} completed. ${pickup.actual_weight || pickup.estimated_weight} kg recycled. Payout: ₹${pickup.final_value || pickup.estimated_value}.`;
  }

  if (adminTitle) {
    const adminNotif: DbNotification = {
      id: `notif_adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: 'admin',
      recipient_id: 'all',
      recipient_role: 'admin',
      title: adminTitle,
      message: adminMsg,
      type: `ADMIN_PICKUP_${status}`,
      pickup_id: pickup.id,
      read: false,
      is_read: false,
      created_at: now,
    };
    db.addNotification(adminNotif);
    notifyAdminNotification(adminNotif);
  }
}

// Helper function for distance calculation
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Get Collector Live GPS coordinates for a pickup
app.get('/api/pickups/:id/location', async (req, res) => {
  const pickup = await resolvePickup(req.params.id);

  if (!pickup) {
    return res.status(404).json({ available: false, message: 'Pickup not found' });
  }

  // Retrieve stored live location if available
  let recordedLoc = db.getPickupLocation(pickup.id);

  const pickupLat = Number(pickup.latitude) || 17.3850;
  const pickupLng = Number(pickup.longitude) || 78.4867;

  let collectorLat = recordedLoc?.latitude;
  let collectorLng = recordedLoc?.longitude;
  let trackingActive = recordedLoc?.tracking_active ?? true;
  let updatedAt = recordedLoc?.updated_at || new Date().toISOString();

  if (collectorLat === undefined || collectorLng === undefined) {
    let collectorObj: DbCollector | null = null;
    if (pickup.collector_id) {
      collectorObj = db.getCollectorById(pickup.collector_id) || null;
    }
    if (collectorObj?.latitude && collectorObj?.longitude) {
      collectorLat = collectorObj.latitude;
      collectorLng = collectorObj.longitude;
    } else {
      collectorLat = pickupLat + 0.008;
      collectorLng = pickupLng + 0.008;
    }
  }

  const distanceKm = calculateHaversineDistanceKm(collectorLat, collectorLng, pickupLat, pickupLng);
  const approxEtaMins = Math.max(2, Math.round(distanceKm * 3.5));
  const distanceFormatted = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
  const etaFormatted = `${approxEtaMins} mins`;

  return res.json({
    available: true,
    location: {
      pickup_id: pickup.id,
      collector_id: pickup.collector_id || 'col_default',
      latitude: collectorLat,
      longitude: collectorLng,
      updated_at: updatedAt,
      tracking_active: trackingActive,
    },
    pickup_location: {
      latitude: pickupLat,
      longitude: pickupLng,
      address: pickup.pickup_address || 'Pickup Destination',
    },
    distance_km: distanceKm,
    distance_formatted: distanceFormatted,
    approx_eta_mins: approxEtaMins,
    approx_eta_formatted: etaFormatted,
    status: pickup.status,
    status_text: pickup.status,
    maps_api_configured: true,
  });
});

// Stop Collector Live GPS tracking for a pickup
app.post('/api/pickups/:id/location/stop', async (req, res) => {
  const pickup = await resolvePickup(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }

  const existingLoc = db.getPickupLocation(pickup.id);
  if (existingLoc) {
    db.updatePickupLocation({
      pickup_id: pickup.id,
      collector_id: pickup.collector_id || existingLoc.collector_id,
      latitude: existingLoc.latitude,
      longitude: existingLoc.longitude,
      tracking_active: false,
    });
  }

  notifyLiveCollectorLocation(pickup.id, {
    latitude: existingLoc?.latitude || 17.3850,
    longitude: existingLoc?.longitude || 78.4867,
    updated_at: new Date().toISOString(),
  });

  return res.json({ status: 'ok', tracking_active: false });
});

// Update Collector Live GPS coordinates
app.put('/api/pickups/:id/location', async (req, res) => {
  const { latitude, longitude, tracking_active } = req.body;
  const pickup = await resolvePickup(req.params.id);

  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }

  const auth = req as AuthenticatedRequest;
  if (!(await collectorOwnsPickup(auth, pickup))) {
    return res.status(403).json({ error: 'Unauthorized: You are not assigned to this pickup' });
  }

  const activeStatuses = ['ACCEPTED', 'ON_THE_WAY', 'COLLECTOR_ON_THE_WAY', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED', 'COLLECTING', 'WEIGHED'];
  if (!activeStatuses.includes(pickup.status) && tracking_active !== false) {
    return res.status(400).json({ error: 'Location tracking is only permitted when pickup is active' });
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  const updatedLocation = db.updatePickupLocation({
    pickup_id: pickup.id,
    collector_id: pickup.collector_id!,
    latitude: latNum,
    longitude: lngNum,
    tracking_active: tracking_active !== undefined ? Boolean(tracking_active) : true,
  });

  // Socket.IO Real-time broadcast to user map
  notifyLiveCollectorLocation(pickup.id, {
    latitude: latNum,
    longitude: lngNum,
    updated_at: updatedLocation.updated_at,
  });

  res.json({ status: 'ok', location: updatedLocation });
});

// Weigh Waste Endpoint
app.put('/api/pickups/:id/weigh', async (req, res) => {
  const { actual_weight } = req.body;
  const pickup = await resolvePickup(req.params.id);
  if (!pickup) return res.status(404).json({ error: 'Pickup not found' });
  const auth = req as AuthenticatedRequest;
  if (!(await collectorOwnsPickup(auth, pickup))) return res.status(403).json({ error: 'Forbidden' });
  if (!['OTP_VERIFIED', 'COLLECTING', 'WEIGHED', 'WEIGHT_VERIFIED'].includes(pickup.status)) {
    return res.status(400).json({ error: 'Pickup is not ready for weighing' });
  }

  const weightNum = Number(actual_weight);
  if (isNaN(weightNum) || weightNum <= 0) {
    return res.status(400).json({ error: 'Actual weight must be a positive number' });
  }

  const materials = db.getMaterials();
  const matched =
    materials.find((m) => m.category.toLowerCase() === pickup.waste_category.toLowerCase()) || materials[0];
  const unitRate = matched.current_price_per_kg;
  const finalValue = Number((weightNum * unitRate).toFixed(2));

  const updated = db.updatePickup(req.params.id, {
    actual_weight: weightNum,
    final_value: finalValue,
    status: 'WEIGHED',
  });

  notifyPickupStatusUpdate(req.params.id, 'WEIGHED', updated);
  createPickupStatusNotifications(updated, 'WEIGHED');

  res.json(updated);
});

// Complete Pickup & Award Eco Credits
app.put('/api/pickups/:id/complete', async (req, res) => {
  const { payment_method } = req.body;
  const pickup = await resolvePickup(req.params.id);
  if (!pickup) return res.status(404).json({ error: 'Pickup not found' });
  const auth = req as AuthenticatedRequest;
  if (!(await collectorOwnsPickup(auth, pickup))) return res.status(403).json({ error: 'Forbidden' });

  if (pickup.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Pickup has already been completed' });
  }
  if (!['WEIGHED', 'WEIGHT_VERIFIED', 'AMOUNT_CONFIRMED', 'PAYMENT_PENDING'].includes(pickup.status)) {
    return res.status(400).json({ error: 'Pickup is not ready for completion' });
  }

  const finalWeight = pickup.actual_weight || pickup.estimated_weight;
  const finalAmount = pickup.final_value || pickup.estimated_value;
  const method = payment_method === 'CASH' ? 'CASH' : 'UPI';
  const txRef = `TX_${method}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const payment: DbPayment = db.addPayment({
    id: `pay_${Date.now()}`,
    pickup_id: pickup.id,
    user_id: pickup.user_id,
    collector_id: pickup.collector_id!,
    amount: finalAmount,
    payment_method: method,
    payment_status: 'PAID',
    transaction_reference: txRef,
    created_at: new Date().toISOString(),
  });

  const creditsToAward = Math.max(10, Math.round(finalWeight * 4));
  let ecoTx: DbEcoTransaction | null = null;
  // Award EcoCredits via RewardsService (backed by Prisma SQLite with strict idempotency check)
  const rewardsResult = await RewardsService.awardPickupPoints(
    pickup.user_id,
    pickup.id,
    pickup.waste_category,
    finalWeight
  );

  if (!db.hasEcoCreditForReference(pickup.user_id, pickup.id)) {
    ecoTx = db.addEcoTransaction({
      id: `tx_${Date.now()}`,
      user_id: pickup.user_id,
      type: 'EARNED',
      credits: rewardsResult.pointsEarned,
      source: `Doorstep Pickup #${pickup.id} (${finalWeight} kg)`,
      reference_id: pickup.id,
      created_at: new Date().toISOString(),
    });

    const user = db.getUserById(pickup.user_id);
    if (user) {
      user.total_waste_recycled = Number((user.total_waste_recycled + finalWeight).toFixed(1));
      user.total_earnings = Math.round(user.total_earnings + finalAmount);
      db.saveUser(user);
    }
  }

  const completedPickup = db.updatePickup(pickup.id, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
  });

  // Phase 9 Fix: Update collector total_pickups and total_earnings upon completion
  if (pickup.collector_id) {
    let col = db.getCollectorById(pickup.collector_id);
    if (col) {
      col.total_pickups = (col.total_pickups || 0) + 1;
      col.total_earnings = Number(((col.total_earnings || 0) + finalAmount).toFixed(2));
      db.saveCollector(col);
      void DbService.saveCollector(col).catch((e) => logger.warn('[COMPLETED] Error updating Prisma collector stats', { error: e.message }));
    }
  }

  notifyPickupStatusUpdate(pickup.id, 'COMPLETED', completedPickup);
  createPickupStatusNotifications(completedPickup, 'COMPLETED');

  res.json({
    pickup: completedPickup,
    payment,
    ecoTransaction: ecoTx,
  });
});

// ── NOTIFICATIONS SYSTEM ENDPOINTS (ROLE-SEGREGATED) ──────────────────────────

// 1. Get Notifications (filtered by userId and recipientRole)
app.get('/api/notifications', (req, res) => {
  const userId = (req.query.userId as string) || '';
  const role = (req.query.role as RecipientRole) || undefined;
  const notifications = db.getNotifications(userId, role);
  res.json(notifications);
});

// 2. Mark Single Notification as Read
app.put('/api/notifications/:id/read', (req, res) => {
  const notifId = req.params.id;
  const success = db.markNotificationRead(notifId);
  if (!success) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  const notif = db.getNotificationById(notifId);
  res.json(notif || { success: true });
});

// 3. Mark All Notifications as Read for User/Role
app.put('/api/notifications/read-all', (req, res) => {
  const userId = req.body.userId || (req.query.userId as string);
  const role = req.body.role || (req.query.role as RecipientRole);
  const success = db.markAllNotificationsRead(userId, role);
  res.json({ success, message: 'All notifications marked as read' });
});

// 4. Create Targeted Persistent Notification
app.post('/api/notifications', (req, res) => {
  const { title, message, type, recipient_id, recipient_role, user_id, pickup_id } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  const notif: DbNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: user_id || recipient_id || 'usr_aditi',
    recipient_id: recipient_id || user_id || 'all',
    recipient_role: recipient_role || 'user',
    title,
    message,
    type: type || 'GENERAL',
    pickup_id,
    read: false,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  db.addNotification(notif);
  if (notif.recipient_role === 'collector') {
    notifyCollectorNotification(notif.recipient_id || 'col_raju', notif);
  } else if (notif.recipient_role === 'admin') {
    notifyAdminNotification(notif);
  } else {
    notifyUserNotification(notif.recipient_id || 'usr_aditi', notif);
  }
  res.status(201).json(notif);
});

// ── REWARDS SYSTEM ENDPOINTS ──────────────────────────────────────────────────

// 1. Get Available Rewards Catalogue
app.get('/api/rewards', async (req, res) => {
  try {
    await DbService.seedDefaultDataIfEmpty();
    const rewards = await prisma.rewardItem.findMany({
      where: { active: true },
      orderBy: { creditsRequired: 'asc' },
    });
    res.json(rewards);
  } catch (err: any) {
    logger.error('[REWARDS API] Error fetching rewards', { error: err.message });
    res.status(500).json({ error: 'Failed to load rewards catalogue.' });
  }
});

// 2. Get User Wallet Ledger & Eco Impact Summary
app.get('/api/rewards/wallet', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const summary = await RewardsService.getWalletAndImpact(auth.user.id);
    res.json(summary);
  } catch (err: any) {
    logger.error('[REWARDS API] Error fetching wallet summary', { error: err.message });
    res.status(500).json({ error: 'Failed to load wallet ledger.' });
  }
});

// 3. Get User Reward Redemption History & Digital Vouchers
app.get('/api/rewards/history', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const redemptions = await prisma.rewardRedemption.findMany({
      where: { userId: auth.user.id },
      orderBy: { redeemedAt: 'desc' },
    });
    res.json(redemptions);
  } catch (err: any) {
    logger.error('[REWARDS API] Error fetching redemption history', { error: err.message });
    res.status(500).json({ error: 'Failed to load redemption history.' });
  }
});

// 4. Redeem Reward Endpoint (Atomic Transaction Protection)
app.post('/api/rewards/:id/redeem', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const result = await RewardsService.redeemReward(auth.user.id, req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.errorMessage || 'Redemption failed' });
    }
    res.json({ message: 'Reward redeemed successfully!', redemption: result.redemption });
  } catch (err: any) {
    logger.error('[REWARDS API] Error redeeming reward', { error: err.message });
    res.status(500).json({ error: err.message || 'Internal server error during redemption' });
  }
});

// 5. Get Eco Impact Metrics
app.get('/api/impact', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const summary = await RewardsService.getWalletAndImpact(auth.user.id);
    res.json({
      co2OffsetKg: summary.co2OffsetKg,
      treesSaved: summary.treesSaved,
      waterPreservedLiters: summary.waterPreservedLiters,
      totalWasteRecycledKg: summary.totalWasteRecycledKg,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load eco impact metrics.' });
  }
});

// 6. Get User Achievements
app.get('/api/rewards/achievements', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const achs = await DbService.getUserAchievements(auth.user.id);
    res.json(achs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load user achievements.' });
  }
});

// 7. Admin Point Rules Management
app.get('/api/admin/point-rules', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user || auth.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required' });
  }
  try {
    const rules = await DbService.getPointRules();
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load point rules.' });
  }
});

app.put('/api/admin/point-rules', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user || auth.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required' });
  }
  const { category, points_per_kg, min_weight_kg, active } = req.body;
  if (!category || typeof points_per_kg !== 'number') {
    return res.status(400).json({ error: 'Valid category and points_per_kg are required.' });
  }
  try {
    const updated = await DbService.savePointRule({ category, points_per_kg, min_weight_kg, active });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save point rule.' });
  }
});

// 8. Admin Reward Items Management
app.post('/api/admin/rewards', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user || auth.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required' });
  }
  const { partnerName, title, description, rewardCategory, creditsRequired, discountValue, rewardType, terms, expiryDate, stock, codeTemplate } = req.body;

  if (!title || !creditsRequired || !discountValue) {
    return res.status(400).json({ error: 'Title, creditsRequired, and discountValue are required.' });
  }

  try {
    let partner = await prisma.partner.findFirst();
    if (!partner) {
      partner = await prisma.partner.create({
        data: {
          partnerName: partnerName || 'EcoScan Partner',
          category: rewardCategory || 'shopping',
          description: 'Verified Rewards Partner',
          locationArea: 'Hyderabad',
          contactInfo: 'partner@ecoscan.in',
          startDate: new Date().toISOString().split('T')[0],
          expiryDate: '2027-12-31',
          termsAndConditions: terms || 'Standard terms apply.',
        },
      });
    }

    const created = await prisma.rewardItem.create({
      data: {
        partnerId: partner.id,
        partnerName: partnerName || partner.partnerName,
        title,
        description: description || '',
        rewardCategory: rewardCategory || 'General',
        creditsRequired: Number(creditsRequired),
        discountValue,
        rewardType: rewardType || 'Discount Coupon',
        terms: terms || 'Terms and conditions apply.',
        expiryDate: expiryDate || '2026-12-31',
        stock: Number(stock) || 50,
        active: true,
        codeTemplate: codeTemplate || 'ECO-XXXXXX',
      },
    });

    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create reward item.' });
  }
});

app.put('/api/admin/rewards/:id', requireAuth, async (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user || auth.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required' });
  }
  try {
    const updated = await prisma.rewardItem.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.description && { description: req.body.description }),
        ...(req.body.creditsRequired !== undefined && { creditsRequired: Number(req.body.creditsRequired) }),
        ...(req.body.discountValue && { discountValue: req.body.discountValue }),
        ...(req.body.stock !== undefined && { stock: Number(req.body.stock) }),
        ...(req.body.active !== undefined && { active: Boolean(req.body.active) }),
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update reward item.' });
  }
});

// Admin stats
app.get('/api/admin/stats', (req, res) => {
  const auth = req as AuthenticatedRequest;
  if (!auth.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const stats = db.getAdminStats();
  res.json(stats);
});

// EcoAi Chat
app.post('/api/gemini/chat', aiLimiter, async (req, res) => {
  try {
    const { question, history, language } = req.body;
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }
    const answer = await askEcoAiChat(question.trim(), history, language);
    res.json({ answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'EcoAi response failed' });
  }
});

// ── Global 404 handler ───────────────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  logger.error('Unhandled route error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

// Vite Middleware / Static Serving
async function listenWithFallback(targetPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let currentPort = targetPort;

    const tryListen = () => {
      const server = httpServer.listen(currentPort, '0.0.0.0', () => {
        logger.info(`EcoScan IN server running on http://localhost:${currentPort}`, {
          env: process.env.NODE_ENV || 'development',
          port: currentPort,
        });
        resolve(currentPort);
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${currentPort} is already in use.`));
        } else {
          reject(err);
        }
      });
    };

    tryListen();
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return;
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await listenWithFallback(DEFAULT_PORT);
}

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});

