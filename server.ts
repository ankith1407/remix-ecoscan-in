import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db, DbUser, DbPickupRequest, DbPayment, DbEcoTransaction, PickupStatus, RecipientRole } from './server/db';
import { analyzeWasteImage, askEcoAiChat } from './server/gemini';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from './server/middleware/auth';

dotenv.config();

const app = express();
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

function collectorOwnsPickup(req: AuthenticatedRequest, pickup: DbPickupRequest): boolean {
  if (isAdmin(req)) return true;
  if (req.user?.role !== 'collector' || !pickup.collector_id) return false;
  const collector = db.getCollectorById(pickup.collector_id);
  return collector?.user_id === req.user.id;
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
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

// Keep JSON/image payloads bounded; the scanner should send a compressed image.
app.use(express.json({ limit: '10mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });

// ----------------------------------------------------
// 1. Health check
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'EcoScan IN Backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    authConfigured: Boolean(process.env.JWT_SECRET),
  });
});

// Every API route is authenticated by default. Only account bootstrap and
// read-only public catalogs remain public; resource ownership is checked below.
app.use('/api', (req, res, next) => {
  const publicRoute =
    (req.path === '/auth/login' && req.method === 'POST') ||
    (req.path === '/auth/register' && req.method === 'POST') ||
    (req.path === '/auth/logout' && req.method === 'POST') ||
    (req.path === '/materials' && req.method === 'GET') ||
    (req.path === '/rewards' && req.method === 'GET');
  if (publicRoute) return next();
  return requireAuth(req as AuthenticatedRequest, res, next);
});

// ----------------------------------------------------
// 2. JWT Production Authentication API
// ----------------------------------------------------

// Register Endpoint
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, role, address } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'A password of at least 12 characters is required' });
    }
    const passwordHash = await hashPassword(password);
    // Public registration can only create a normal user. Privileged roles require admin assignment.
    const userRole = 'user' as const;

    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      phone: phone || '+91 98000 00000',
      profile_image: '',
      password_hash: passwordHash,
      role: userRole,
      address: address || '',
      eco_credits: 50,
      total_waste_recycled: 0,
      total_earnings: 0,
      created_at: new Date().toISOString(),
    };

    db.saveUser(newUser);

    const tokens = generateTokens({ id: newUser.id, email: newUser.email, role: newUser.role });
    setAuthCookies(res, tokens);
    res.status(201).json({
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login Endpoint
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const users = db.getUsers();
    let user = null;

    if (email) {
      user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    } else if (phone) {
      user = users.find((u) => u.phone === phone);
    }

    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    setAuthCookies(res, tokens);
    res.json({
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ status: 'ok' });
});

// Current User Profile Endpoint
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

// Multi-Address Management API
app.get('/api/users/:id/addresses', (req, res) => {
  if (!ownsUser(req as AuthenticatedRequest, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Default address list derived from user profile & seed addresses
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
    id: `addr_${Date.now()}`,
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

app.post('/api/users/register', (req, res) => {
  res.status(410).json({ error: 'Use the authenticated registration endpoint.' });
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
app.get('/api/materials', (req, res) => {
  const materials = db.getMaterials();
  res.json(materials);
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
      return res.status(400).json({ error: 'Image data is required' });
    }
    if (mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are supported' });
    }

    const analysis = await analyzeWasteImage(image, mimeType || 'image/jpeg', language);

    // Save record to waste_scans
    const scanRecord = db.addScan({
      id: `scan_${Date.now()}`,
      user_id: userId!,
      detected_material: analysis.material,
      waste_category: analysis.category,
      confidence: analysis.confidence,
      estimated_weight: analysis.estimated_weight ?? 0,
      estimated_value: analysis.estimated_value ?? 0,
      disposal_instruction: analysis.disposal_instruction,
      created_at: new Date().toISOString(),
    });

    const activeUserId = userId || 'usr_aditi';
    db.addUserActivity({
      id: `act_scan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      user_id: activeUserId,
      activity_type: 'WASTE_SCANNED',
      title: 'Waste Material Scanned',
      description: `Detected ${analysis.material} (${analysis.category}) with ${Math.round(analysis.confidence * 100)}% AI confidence`,
      scan_id: scanRecord.id,
      waste_material: analysis.material,
      weight: analysis.estimated_weight ?? undefined,
      timestamp: new Date().toISOString(),
      status: 'SCANNED',
    });

    res.json({
      scan: scanRecord,
      analysis,
    });
  } catch (err: any) {
    console.error('[API] Waste scan error:', err);
    res.status(500).json({ error: err.message || 'Waste analysis failed' });
  }
});

// ----------------------------------------------------
// 5. Collectors & Verification API
// ----------------------------------------------------
app.get('/api/collectors', (req, res) => {
  const { verified, available } = req.query;
  let collectors = db.getCollectors();

  if (verified === 'true') {
    collectors = collectors.filter((c) => c.verification_status === 'VERIFIED');
  }
  if (available === 'true') {
    collectors = collectors.filter((c) => c.available);
  }
  res.json(collectors);
});

app.get('/api/collectors/:id', (req, res) => {
  const collector = db.getCollectorById(req.params.id);
  if (!collector) {
    return res.status(404).json({ error: 'Collector not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!isAdmin(auth) && collector.user_id !== auth.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(collector);
});

app.put('/api/collectors/:id/verify', requireRole('admin'), (req, res) => {
  const { status } = req.body;
  if (!['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status' });
  }
  const updated = db.updateCollectorStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Collector not found' });
  }
  res.json(updated);
});

app.put('/api/collectors/:id/availability', (req, res) => {
  const { available } = req.body;
  const col = db.getCollectorById(req.params.id);
  if (!col) {
    return res.status(404).json({ error: 'Collector not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!isAdmin(auth) && col.user_id !== auth.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  col.available = Boolean(available);
  db.saveCollector(col);
  res.json(col);
});

// ----------------------------------------------------
// 6. Pickup Lifecycle API
// ----------------------------------------------------
app.get('/api/pickups', (req, res) => {
  const { status } = req.query;
  const auth = req as AuthenticatedRequest;
  const userId = auth.user?.role === 'user' ? auth.user.id : undefined;
  const collector = auth.user?.role === 'collector'
    ? db.getCollectors().find((item) => item.user_id === auth.user?.id)
    : undefined;
  const collectorId = auth.user?.role === 'collector' ? collector?.id : undefined;
  const pickups = db.getPickups({
    userId,
    collectorId,
    status: status as PickupStatus | undefined,
  });
  res.json(auth.user?.role === 'admin' ? pickups : pickups.filter((pickup) =>
    pickup.user_id === auth.user?.id || pickup.collector_id === collectorId
  ));
});

app.get('/api/pickups/:id', (req, res) => {
  const pickup = db.getPickupById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!isAdmin(auth) && pickup.user_id !== auth.user?.id && !collectorOwnsPickup(auth, pickup)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(pickup);
});

// User requests a pickup
app.post('/api/pickups', (req, res) => {
  const {
    waste_category,
    items_summary,
    estimated_weight,
    pickup_address,
    preferred_date,
    preferred_time,
  } = req.body;
  const user_id = (req as AuthenticatedRequest).user!.id;

  if (!user_id || !pickup_address || !estimated_weight) {
    return res.status(400).json({ error: 'User, address, and estimated weight are required' });
  }

  const user = db.getUserById(user_id);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });
  const materials = db.getMaterials();
  const matchedMat =
    materials.find((m) => m.category.toLowerCase() === (waste_category || '').toLowerCase()) || materials[0];

  const estWeightNum = Number(estimated_weight) || 5;
  const estValue = Number((estWeightNum * matchedMat.current_price_per_kg).toFixed(2));
  const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // If no collector selected, auto-match first available verified collector
  let assignedCollectorId: string | undefined;
  let assignedCollectorName = '';
  if (!assignedCollectorId) {
    const verifiedCol = db.getCollectors().find((c) => c.verification_status === 'VERIFIED' && c.available);
    if (verifiedCol) {
      assignedCollectorId = verifiedCol.id;
      assignedCollectorName = verifiedCol.name;
    }
  }
  const assignedCollector = assignedCollectorId ? db.getCollectorById(assignedCollectorId) : undefined;

  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const pickupId = `ES-${dateStr}-${randomSuffix}`;

  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'A valid current pickup latitude and longitude are required' });
  }

  const newPickup: DbPickupRequest = {
    id: pickupId,
    user_id,
    user_name: user.name,
    user_phone: user.phone,
    collector_id: assignedCollectorId,
    collector_name: assignedCollectorName || 'Green Earth Kabadiwala Hub',
    collector_rating: assignedCollector?.rating,
    collector_phone: assignedCollector?.phone,
    collector_vehicle: undefined,
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
        changed_by: user_id,
        changed_by_role: 'user',
        timestamp: now,
        note: `Requested doorstep pickup for ${estWeightNum} kg ${waste_category || 'Dry Recyclables'}`,
      },
    ],
    otp: randomOtp,
    created_at: now,
  };

  db.createPickup(newPickup);

  // Log user activity
  db.addUserActivity({
    id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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

  // 1. Citizen Notification
  db.addNotification({
    id: `notif_usr_${Date.now()}`,
    user_id,
    recipient_id: user_id,
    recipient_role: 'user',
    type: 'PICKUP_REQUESTED',
    title: '🚚 Pickup Requested',
    message: `Your EcoScan pickup request #${newPickup.id} has been submitted. Finding a nearby collector...`,
    pickup_id: newPickup.id,
    read: false,
    is_read: false,
    created_at: now,
  });

  // 2. Collector Notification
  if (assignedCollectorId) {
    db.addNotification({
      id: `notif_col_${Date.now()}`,
      user_id: assignedCollectorId,
      recipient_id: assignedCollectorId,
      recipient_role: 'collector',
      type: 'NEW_PICKUP_ASSIGNED',
      title: '📦 New Pickup Request Available',
      message: `New scrap pickup request #${newPickup.id} (${estWeightNum} kg) in your area.`,
      pickup_id: newPickup.id,
      read: false,
      is_read: false,
      created_at: now,
    });
  }

  // 3. Admin Notification
  db.addNotification({
    id: `notif_adm_${Date.now()}`,
    user_id: 'admin',
    recipient_id: 'admin',
    recipient_role: 'admin',
    type: 'SYSTEM_PICKUP_CREATED',
    title: '⚙️ New Pickup Created',
    message: `Pickup #${newPickup.id} created by ${newPickup.user_name} (${estWeightNum} kg).`,
    pickup_id: newPickup.id,
    read: false,
    is_read: false,
    created_at: now,
  });

  res.status(201).json(newPickup);
});

// Backend OTP verification endpoint
app.post('/api/pickups/:id/verify-otp', otpLimiter, (req, res) => {
  const { otp } = req.body;
  const pickupRecord = db.getPickupById(req.params.id);
  if (!pickupRecord) return res.status(404).json({ error: 'Pickup request not found' });
  const auth = req as AuthenticatedRequest;
  if (!collectorOwnsPickup(auth, pickupRecord)) return res.status(403).json({ error: 'Forbidden' });
  if (!['ARRIVED', 'OTP_PENDING', 'OTP_VERIFICATION'].includes(pickupRecord.status)) {
    return res.status(400).json({ error: 'OTP cannot be verified for this pickup state' });
  }
  const collector_id = pickupRecord.collector_id;
  if (!otp) {
    return res.status(400).json({ error: 'OTP code is required' });
  }

  const result = db.verifyPickupOtp(req.params.id, otp, collector_id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  const pickup = result.pickup!;
  const now = new Date().toISOString();

  // Create notifications for user and collector
  db.addNotification({
    id: `notif_${Date.now()}`,
    user_id: pickup.user_id,
    recipient_id: pickup.user_id,
    recipient_role: 'user',
    type: 'OTP_VERIFIED',
    title: '🔑 Pickup OTP Verified',
    message: `Your collector has verified OTP (${pickup.otp}). Collection and weighing are in progress.`,
    pickup_id: pickup.id,
    read: false,
    is_read: false,
    created_at: now,
  });

  if (pickup.collector_id) {
    db.addNotification({
      id: `notif_col_${Date.now()}`,
      user_id: pickup.collector_id,
      recipient_id: pickup.collector_id,
      recipient_role: 'collector',
      type: 'OTP_VERIFIED',
      title: '✅ Customer OTP Verified',
      message: `OTP verified successfully for pickup #${pickup.id.substring(0, 8)}. Please weigh items.`,
      pickup_id: pickup.id,
      read: false,
      is_read: false,
      created_at: now,
    });
  }

  res.json({ message: result.message, pickup });
});

// Regenerate OTP Endpoint
app.post('/api/pickups/:id/regenerate-otp', otpLimiter, (req, res) => {
  const user_id = (req as AuthenticatedRequest).user!.id;

  const result = db.regeneratePickupOtp(req.params.id, user_id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json(result);
});

// Cancel Pickup Endpoint
app.post('/api/pickups/:id/cancel', (req, res) => {
  const { reason } = req.body;
  const auth = req as AuthenticatedRequest;
  const pickup = db.getPickupById(req.params.id);
  if (!pickup) return res.status(404).json({ error: 'Pickup request not found' });
  const canCancel = pickup.user_id === auth.user?.id || collectorOwnsPickup(auth, pickup) || isAdmin(auth);
  if (!canCancel) return res.status(403).json({ error: 'Forbidden' });
  if (['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(pickup.status)) {
    return res.status(400).json({ error: 'This pickup cannot be cancelled in its current state' });
  }
  const cancelledBy = auth.user!.id;
  const role = auth.user!.role;

  const updated = db.cancelPickup(req.params.id, cancelledBy, role, reason);
  if (!updated) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }

  db.stopPickupLocationTracking(updated.id);

  const now = new Date().toISOString();
  db.addNotification({
    id: `notif_${Date.now()}`,
    user_id: updated.user_id,
    recipient_id: updated.user_id,
    recipient_role: 'user',
    type: 'PICKUP_CANCELLED',
    title: '✕ Pickup Cancelled',
    message: `Pickup #${updated.id} has been cancelled. Reason: ${reason || 'User cancelled'}.`,
    pickup_id: updated.id,
    read: false,
    is_read: false,
    created_at: now,
  });

  res.json(updated);
});

// Rate Collector Endpoint
app.post('/api/pickups/:id/rate', (req, res) => {
  const { rating, review } = req.body;
  const user_id = (req as AuthenticatedRequest).user!.id;
  const pickup = db.getPickupById(req.params.id);

  if (!pickup) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }
  if (pickup.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Can only rate completed pickups' });
  }
  if (pickup.user_id !== user_id) {
    return res.status(403).json({ error: 'Unauthorized user for this pickup' });
  }

  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5 stars' });
  }

  const newRating = db.addPickupRating({
    id: `rat_${Date.now()}`,
    pickup_id: pickup.id,
    user_id,
    collector_id: pickup.collector_id!,
    rating: ratingNum,
    review: review || '',
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, rating: newRating });
});

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

  return { valid: false, reason: `This pickup cannot start a trip or transition from status '${current}'.` };
}

// Collector updates status: ASSIGNING, ACCEPTED, ON_THE_WAY, ARRIVED, OTP_VERIFICATION, etc.
app.put('/api/pickups/:id/status', (req, res) => {
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

  const existing = db.getPickupById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }

  const actorCollector = auth.user?.role === 'collector'
    ? db.getCollectors().find((item) => item.user_id === auth.user?.id)
    : undefined;
  if (!isAdmin(auth) && (!actorCollector || existing.collector_id !== actorCollector.id)) {
    return res.status(403).json({ error: 'Only the assigned collector can update this pickup' });
  }
  const collector_id = actorCollector?.id || existing.collector_id;

  // Authorization check: if pickup already assigned to another collector, forbid change
  if (collector_id && existing.collector_id && existing.collector_id !== collector_id) {
    return res.status(403).json({ error: 'You are not assigned to this pickup request' });
  }

  // Idempotency: if already in requested status (or equivalent), return existing record
  if (existing.status === status) {
    return res.json(existing);
  }

  // Validate status transition
  const transitionCheck = validateStatusTransition(existing.status, status);
  if (!transitionCheck.valid) {
    return res.status(400).json({ error: transitionCheck.reason || 'Invalid status transition' });
  }

  // When pickup reaches arrived, completed or cancelled, automatically stop location tracking
  if (['ARRIVED', 'OTP_PENDING', 'WEIGHED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(status)) {
    db.stopPickupLocationTracking(req.params.id);
  }

  const now = new Date().toISOString();
  const updates: Partial<DbPickupRequest> = { status };
  if (collector_id) {
    updates.collector_id = collector_id;
    const col = db.getCollectorById(collector_id);
    if (col) updates.collector_name = col.name;
  }
  if (status === 'ACCEPTED') {
    updates.accepted_at = now;
    updates.assigned_at = updates.assigned_at || now;
  }

  const updated = db.updatePickup(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Pickup request not found' });
  }

  // Update status timeline history & trigger notifications
  const statusTitles: Record<string, string> = {
    ACCEPTED: 'Collector Accepted',
    ON_THE_WAY: 'Collector On The Way',
    COLLECTOR_ON_THE_WAY: 'Collector On The Way',
    ARRIVED: 'Collector Arrived',
    OTP_PENDING: 'Awaiting Customer OTP',
    OTP_VERIFIED: 'OTP Verified',
    COLLECTING: 'Waste Collection In Progress',
    WEIGHT_VERIFIED: 'Weight Verified',
    CANCELLED: 'Pickup Cancelled',
    REJECTED: 'Pickup Declined',
  };
  const title = statusTitles[status] || `Status: ${status}`;
  const note = (status === 'ON_THE_WAY' || status === 'COLLECTOR_ON_THE_WAY') ? 'Collector started trip' : undefined;
  db.addPickupStatusLog(req.params.id, status, title, note, collector_id, 'collector');

  if (status === 'ACCEPTED') {
    db.addUserActivity({
      id: `act_${Date.now()}`,
      user_id: updated.user_id,
      activity_type: 'PICKUP_ACCEPTED',
      title: 'Pickup Accepted',
      description: `Collector ${updated.collector_name || 'Kabadiwala'} accepted your pickup request`,
      pickup_id: updated.id,
      timestamp: now,
      status: 'ACCEPTED',
    });
    db.addNotification({
      id: `notif_${Date.now()}`,
      user_id: updated.user_id,
      recipient_id: updated.user_id,
      recipient_role: 'user',
      type: 'PICKUP_ACCEPTED',
      title: '✅ Pickup Accepted',
      message: `Your pickup has been accepted by ${updated.collector_name || 'your EcoScan collector'}.`,
      pickup_id: updated.id,
      read: false,
      is_read: false,
      created_at: now,
    });
  } else if (status === 'COLLECTOR_ON_THE_WAY' || status === 'ON_THE_WAY') {
    db.addUserActivity({
      id: `act_${Date.now()}`,
      user_id: updated.user_id,
      activity_type: 'COLLECTOR_ON_THE_WAY',
      title: 'Collector On The Way',
      description: `Collector ${updated.collector_name || 'Kabadiwala'} has started their journey`,
      pickup_id: updated.id,
      timestamp: now,
      status: 'COLLECTOR_ON_THE_WAY',
    });
    db.addNotification({
      id: `notif_${Date.now()}`,
      user_id: updated.user_id,
      recipient_id: updated.user_id,
      recipient_role: 'user',
      type: 'COLLECTOR_ON_THE_WAY',
      title: '📍 Collector On The Way',
      message: `Your collector is on the way to your pickup location.`,
      pickup_id: updated.id,
      read: false,
      is_read: false,
      created_at: now,
    });
  } else if (status === 'ARRIVED') {
    db.addUserActivity({
      id: `act_${Date.now()}`,
      user_id: updated.user_id,
      activity_type: 'WASTE_COLLECTED',
      title: 'Collector Arrived',
      description: `Collector ${updated.collector_name || 'Kabadiwala'} arrived at your doorstep`,
      pickup_id: updated.id,
      timestamp: now,
      status: 'ARRIVED',
    });
    db.addNotification({
      id: `notif_${Date.now()}`,
      user_id: updated.user_id,
      recipient_id: updated.user_id,
      recipient_role: 'user',
      type: 'COLLECTOR_ARRIVED',
      title: '📦 Collector Arrived',
      message: `Your collector has arrived! Please share your 4-digit OTP (${updated.otp}) to begin weighing.`,
      pickup_id: updated.id,
      read: false,
      is_read: false,
      created_at: now,
    });
  }

  res.json(updated);
});

// Haversine distance calculator in kilometers
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ----------------------------------------------------
// 7. Live Collector Location & Tracking API
// ----------------------------------------------------

// Collector updates live GPS coordinates while on the way
app.put('/api/pickups/:id/location', (req, res) => {
  const { latitude, longitude, tracking_active } = req.body;
  const pickup = db.getPickupById(req.params.id);

  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }

  const auth = req as AuthenticatedRequest;
  if (!collectorOwnsPickup(auth, pickup)) {
    return res.status(403).json({ error: 'Unauthorized: You are not assigned to this pickup' });
  }
  const collector_id = pickup.collector_id!;

  // Tracking only active during COLLECTOR_ON_THE_WAY / ON_THE_WAY
  if (pickup.status !== 'COLLECTOR_ON_THE_WAY' && pickup.status !== 'ON_THE_WAY' && tracking_active !== false) {
    return res.status(400).json({
      error: 'Location tracking is only permitted when status is ON_THE_WAY',
    });
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  if (
    isNaN(latNum) ||
    isNaN(lngNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lngNum < -180 ||
    lngNum > 180
  ) {
    return res.status(400).json({ error: 'Invalid latitude or longitude coordinates' });
  }

  const updatedLocation = db.updatePickupLocation({
    pickup_id: pickup.id,
    collector_id,
    latitude: latNum,
    longitude: lngNum,
    tracking_active: tracking_active !== undefined ? Boolean(tracking_active) : true,
  });

  res.json({ status: 'ok', location: updatedLocation });
});

// Customer or assigned collector reads live tracking info
app.get('/api/pickups/:id/location', (req, res) => {
  const pickup = db.getPickupById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }

  const { userId } = req.query;
  const auth = req as AuthenticatedRequest;
  if (!isAdmin(auth) && pickup.user_id !== auth.user?.id && !collectorOwnsPickup(auth, pickup)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Security check: Only allow customer for this pickup, assigned collector, or admin
  if (userId) {
    const isOwner = pickup.user_id === userId;
    const isCollector = pickup.collector_id === userId;
    const user = db.getUserById(userId as string);
    const isAdmin = user?.role === 'admin';
    if (!isOwner && !isCollector && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view this pickup tracking' });
    }
  }

  // Check if pickup is in ON_THE_WAY or COLLECTOR_ON_THE_WAY status
  if (pickup.status !== 'COLLECTOR_ON_THE_WAY' && pickup.status !== 'ON_THE_WAY') {
    return res.json({
      available: false,
      message: 'Collector location is currently unavailable.',
      status: pickup.status,
      tracking_active: false,
    });
  }

  const location = db.getPickupLocation(pickup.id);
  if (!location || !location.tracking_active) {
    return res.json({
      available: false,
      message: 'Collector location is currently unavailable.',
      status: pickup.status,
      tracking_active: false,
    });
  }

  // Calculate approximate distance
  const distanceKm = calculateHaversineDistance(
    location.latitude,
    location.longitude,
    pickup.latitude,
    pickup.longitude
  );

  // Approximate ETA: Average city collection vehicle speed ~22 km/h (~2.7 min/km)
  const approxEtaMins = Math.max(1, Math.round(distanceKm * 2.7));
  const etaRange = `${approxEtaMins}–${approxEtaMins + 3} mins`;

  res.json({
    available: true,
    location: {
      pickup_id: location.pickup_id,
      collector_id: location.collector_id,
      latitude: location.latitude,
      longitude: location.longitude,
      updated_at: location.updated_at,
      tracking_active: location.tracking_active,
    },
    pickup_location: {
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      address: pickup.pickup_address,
    },
    distance_km: Number(distanceKm.toFixed(2)),
    distance_formatted:
      distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1)} km`,
    approx_eta_mins: approxEtaMins,
    approx_eta_formatted: `~${etaRange}`,
    status: pickup.status,
    status_text: 'Collector is on the way to your doorstep',
    maps_api_configured: Boolean(
      process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
    ),
  });
});

// Stop location tracking
app.post('/api/pickups/:id/location/stop', (req, res) => {
  const pickup = db.getPickupById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!isAdmin(auth) && !collectorOwnsPickup(auth, pickup)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.stopPickupLocationTracking(pickup.id);
  res.json({ status: 'ok', tracking_active: false });
});

// Collector weighs waste: enters actual_weight, calculates final_value
app.put('/api/pickups/:id/weigh', (req, res) => {
  const { actual_weight } = req.body;
  const pickup = db.getPickupById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!collectorOwnsPickup(auth, pickup)) return res.status(403).json({ error: 'Forbidden' });
  if (!['OTP_VERIFIED', 'COLLECTING', 'WEIGHED', 'WEIGHT_VERIFIED'].includes(pickup.status)) {
    return res.status(400).json({ error: 'Pickup is not ready for weighing' });
  }

  const weightNum = Number(actual_weight);
  if (isNaN(weightNum) || weightNum <= 0) {
    return res.status(400).json({ error: 'Actual weight must be a positive number' });
  }

  // Calculate rate based on material
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

  const now = new Date().toISOString();
  db.addPickupStatusLog(req.params.id, 'WEIGHED', 'Weight Verified', `${weightNum} kg verified at ₹${unitRate}/kg`);
  db.addUserActivity({
    id: `act_${Date.now()}`,
    user_id: pickup.user_id,
    activity_type: 'WEIGHT_VERIFIED',
    title: 'Actual Weight Verified',
    description: `Verified ${weightNum} kg ${pickup.waste_category} at ₹${unitRate}/kg (Total: ₹${finalValue})`,
    pickup_id: pickup.id,
    weight: weightNum,
    amount: finalValue,
    waste_material: pickup.waste_category,
    timestamp: now,
    status: 'WEIGHED',
  });
  db.addNotification({
    id: `notif_${Date.now()}`,
    user_id: pickup.user_id,
    type: 'WEIGHT_VERIFIED',
    title: '⚖️ Weight Verified',
    message: `${weightNum} kg of ${pickup.waste_category} was verified for ₹${finalValue}.`,
    pickup_id: pickup.id,
    read: false,
    is_read: false,
    created_at: now,
  });

  res.json(updated);
});

// Complete pickup + record payment + award Eco Credits exactly once
app.put('/api/pickups/:id/complete', (req, res) => {
  const { payment_method } = req.body;
  const pickup = db.getPickupById(req.params.id);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }
  const auth = req as AuthenticatedRequest;
  if (!collectorOwnsPickup(auth, pickup)) return res.status(403).json({ error: 'Forbidden' });
  if (!['WEIGHED', 'WEIGHT_VERIFIED', 'AMOUNT_CONFIRMED', 'PAYMENT_PENDING'].includes(pickup.status)) {
    return res.status(400).json({ error: 'Pickup is not ready for completion' });
  }

  if (pickup.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Pickup has already been completed' });
  }

  const finalWeight = pickup.actual_weight || pickup.estimated_weight;
  const finalAmount = pickup.final_value || pickup.estimated_value;
  const method = payment_method === 'CASH' ? 'CASH' : 'UPI';
  const txRef = `DEMO_${method}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // 1. Record payment
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

  // 2. Award Eco Credits to user exactly once (prevent double crediting)
  const creditsToAward = Math.max(10, Math.round(finalWeight * 4));
  let ecoTx: DbEcoTransaction | null = null;

  if (!db.hasEcoCreditForReference(pickup.user_id, pickup.id)) {
    ecoTx = db.addEcoTransaction({
      id: `tx_${Date.now()}`,
      user_id: pickup.user_id,
      type: 'EARNED',
      credits: creditsToAward,
      source: `Doorstep Pickup #${pickup.id} (${finalWeight} kg)`,
      reference_id: pickup.id,
      created_at: new Date().toISOString(),
    });

    // Update user stats
    const user = db.getUserById(pickup.user_id);
    if (user) {
      user.total_waste_recycled = Number((user.total_waste_recycled + finalWeight).toFixed(1));
      user.total_earnings = Math.round(user.total_earnings + finalAmount);
      db.saveUser(user);
    }
  }

  // 3. Update collector total pickups & earnings
  if (pickup.collector_id) {
    const col = db.getCollectorById(pickup.collector_id);
    if (col) {
      col.total_pickups += 1;
      col.total_earnings += finalAmount;
      db.saveCollector(col);
    }
  }

  // 4. Mark pickup completed
  const completedPickup = db.updatePickup(pickup.id, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
  });

  const compNow = new Date().toISOString();
  db.addPickupStatusLog(pickup.id, 'COMPLETED', 'Pickup Completed', `₹${finalAmount} settled via ${method}`);

  db.addUserActivity({
    id: `act_pay_${Date.now()}`,
    user_id: pickup.user_id,
    activity_type: 'FINAL_AMOUNT_RECEIVED',
    title: 'Payment Received',
    description: `₹${finalAmount} recorded via ${method} for ${finalWeight} kg ${pickup.waste_category}`,
    pickup_id: pickup.id,
    amount: finalAmount,
    weight: finalWeight,
    waste_material: pickup.waste_category,
    timestamp: compNow,
    status: 'COMPLETED',
  });

  db.addUserActivity({
    id: `act_cred_${Date.now()}`,
    user_id: pickup.user_id,
    activity_type: 'ECO_CREDITS_EARNED',
    title: 'Eco Credits Awarded',
    description: `+${creditsToAward} Eco Credits awarded for doorstep recycling`,
    pickup_id: pickup.id,
    eco_credits: creditsToAward,
    timestamp: compNow,
    status: 'COMPLETED',
  });

  db.addNotification({
    id: `notif_comp_${Date.now()}`,
    user_id: pickup.user_id,
    type: 'PAYMENT_COMPLETED',
    title: '💰 Payment Completed',
    message: `₹${finalAmount} has been recorded for your ${pickup.waste_category} pickup.`,
    pickup_id: pickup.id,
    read: false,
    is_read: false,
    created_at: compNow,
  });

  db.addNotification({
    id: `notif_cred_${Date.now()}`,
    user_id: pickup.user_id,
    type: 'CREDIT_EARNED',
    title: '🪙 Eco Credits Earned',
    message: `You earned +${creditsToAward} Eco Credits from your completed pickup!`,
    pickup_id: pickup.id,
    read: false,
    is_read: false,
    created_at: compNow,
  });

  // Stop location tracking immediately when completed
  db.stopPickupLocationTracking(pickup.id);

  res.json({
    pickup: completedPickup,
    payment,
    ecoTransaction: ecoTx,
  });
});

// ----------------------------------------------------
// 7. Payments & Eco Credits Transactions API
// ----------------------------------------------------
app.get('/api/payments', (req, res) => {
  const auth = req as AuthenticatedRequest;
  const userId = isAdmin(auth) ? req.query.userId as string | undefined : auth.user!.id;
  const payments = db.getPayments(userId);
  res.json(payments);
});

app.get('/api/eco/transactions', (req, res) => {
  const auth = req as AuthenticatedRequest;
  const userId = isAdmin(auth) ? req.query.userId as string | undefined : auth.user!.id;
  const txs = db.getEcoTransactions(userId);
  res.json(txs);
});

// ----------------------------------------------------
// 8. Rewards & Redemptions API
// ----------------------------------------------------
// ----------------------------------------------------
// 8. Partner Ecosystem & Reward Infrastructure API
// ----------------------------------------------------
app.get('/api/partners', (req, res) => {
  const { status, verifiedOnly } = req.query;
  const list = db.getPartners(
    status as any,
    verifiedOnly === 'true'
  );
  res.json(list);
});

app.get('/api/partners/:id', (req, res) => {
  const partner = db.getPartnerById(req.params.id);
  if (!partner) {
    return res.status(404).json({ error: 'Partner not found' });
  }
  res.json(partner);
});

app.post('/api/partners', requireRole('admin'), (req, res) => {
  const {
    partner_name,
    category,
    description,
    location_area,
    contact_info,
    city_availability,
    website_url,
    reward_types,
    partnership_status,
  } = req.body;

  if (!partner_name || !category) {
    return res.status(400).json({ error: 'Partner name and category are required' });
  }

  const newPartner = db.savePartner({
    id: `part-${Date.now()}`,
    partner_name,
    category: category || 'local_partners',
    description: description || 'EcoScan sustainability partner',
    location_area: location_area || 'Hyderabad',
    contact_info: contact_info || 'partner@ecoscan.in',
    partnership_status: partnership_status || 'Prospect',
    verified_status: false,
    reward_types: reward_types || ['Discount Coupon'],
    start_date: new Date().toLocaleDateString('en-IN'),
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Standard EcoScan Partner Terms',
    active: false,
    city_availability: city_availability || 'Hyderabad',
    created_at: new Date().toISOString(),
  });

  res.status(201).json(newPartner);
});

app.put('/api/partners/:id/status', requireRole('admin'), (req, res) => {
  const { status, verified } = req.body;
  const updated = db.updatePartnerStatus(req.params.id, status, verified);
  if (!updated) {
    return res.status(404).json({ error: 'Partner not found' });
  }
  res.json(updated);
});

app.get('/api/rewards', (req, res) => {
  const { category, partnerId, activeOnly } = req.query;
  const rewards = db.getRewards(
    category as string | undefined,
    partnerId as string | undefined,
    activeOnly !== 'false'
  );
  res.json(rewards);
});

app.post('/api/rewards', requireRole('admin'), (req, res) => {
  const {
    partner_id,
    partner_name,
    title,
    description,
    reward_category,
    credits_required,
    discount_value,
    voucher_type,
    terms,
    expiry_date,
    stock,
    sponsored_type,
    city_scope,
  } = req.body;

  if (!title || !credits_required) {
    return res.status(400).json({ error: 'Title and credits required are mandatory' });
  }

  let finalPartnerName = partner_name || 'EcoScan Partner';
  if (partner_id) {
    const p = db.getPartnerById(partner_id);
    if (p) finalPartnerName = p.partner_name;
  }

  const newReward = db.addReward({
    id: `rew-${Date.now()}`,
    partner_id: partner_id || 'part-1',
    partner_name: finalPartnerName,
    title,
    description: description || '',
    reward_category: reward_category || 'eco',
    credits_required: Number(credits_required),
    discount_value: discount_value || 'Voucher',
    voucher_type: voucher_type || 'discount',
    terms: terms || 'Standard EcoScan terms apply',
    expiry_date: expiry_date || '31/12/2026',
    redemption_limit: 5,
    stock: stock !== undefined ? Number(stock) : 50,
    active: true,
    sponsored_type: sponsored_type || 'partner',
    city_scope: city_scope || 'Hyderabad',
    created_at: new Date().toISOString(),
  });

  res.status(201).json(newReward);
});

app.put('/api/rewards/:id', requireRole('admin'), (req, res) => {
  const updated = db.updateReward(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Reward not found' });
  }
  res.json(updated);
});

// In-flight redemption locks to prevent double clicks / fraud
const inFlightRedemptions = new Set<string>();

// Server-side Atomic Redemption with Provider Fulfillment & Credit Reversal
app.post('/api/rewards/redeem', async (req, res) => {
  try {
    const { reward_id } = req.body;
    const user_id = (req as AuthenticatedRequest).user!.id;
    if (!user_id || !reward_id) {
      return res.status(400).json({ error: 'User ID and Reward ID are required' });
    }

    const lockKey = `${user_id}_${reward_id}`;
    if (inFlightRedemptions.has(lockKey)) {
      return res.status(429).json({ error: 'A redemption request is already processing for your account. Please wait.' });
    }

    try {
      inFlightRedemptions.add(lockKey);
      const result = await db.redeemRewardAtomicAsync(user_id, reward_id);
      res.json(result);
    } finally {
      inFlightRedemptions.delete(lockKey);
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Redemption failed' });
  }
});

// Authenticated User Credit Ledger API
app.get('/api/user/credits/ledger', (req, res) => {
  const auth = req as AuthenticatedRequest;
  const userId = isAdmin(auth) ? req.query.userId as string | undefined : auth.user!.id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  const txs = db.getEcoTransactions(userId as string);
  const ledgerBalance = db.getUserLedgerBalance(userId as string);
  res.json({
    user_id: userId,
    ledger_balance: ledgerBalance,
    transactions: txs,
  });
});

// Partner On-Spot Redemption Code Verification
app.post('/api/rewards/verify-code', (req, res) => {
  try {
    const { code, partner_id } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Redemption code is required' });
    }

    const result = db.verifyRedemptionCode(code, partner_id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Code verification failed' });
  }
});

app.get('/api/rewards/redemptions', (req, res) => {
  const auth = req as AuthenticatedRequest;
  const userId = isAdmin(auth) ? req.query.userId as string | undefined : auth.user!.id;
  const redemptions = db.getRedemptions(userId);
  res.json(redemptions);
});

app.get('/api/partner/dashboard/:partnerId', (req, res) => {
  const data = db.getPartnerDashboardData(req.params.partnerId);
  if (!data) {
    return res.status(404).json({ error: 'Partner not found' });
  }
  res.json(data);
});

app.get('/api/user/activities', (req, res) => {
  const auth = req as AuthenticatedRequest;
  const userId = isAdmin(auth) ? req.query.userId as string | undefined : auth.user!.id;
  const { category } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  const activities = db.getUserActivities(userId, category as string);
  res.json(activities);
});

app.get('/api/notifications', (req, res) => {
  const auth = req as AuthenticatedRequest;
  const userId = isAdmin(auth) ? req.query.userId as string | undefined : auth.user!.id;
  const role = isAdmin(auth) ? req.query.role as RecipientRole | undefined : auth.user!.role;
  const notifs = db.getNotifications(userId || 'all', role);
  res.json(notifs);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const notification = db.getNotificationById?.(req.params.id);
  if (notification && !isAdmin(req as AuthenticatedRequest) && notification.user_id !== (req as AuthenticatedRequest).user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const updated = db.markNotificationRead(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json(updated);
});

app.put('/api/notifications/read-all', (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  db.markAllNotificationsRead(userId);
  res.json({ status: 'ok' });
});

// ----------------------------------------------------
// 9. Admin Stats & Analytics API
// ----------------------------------------------------
app.get('/api/admin/stats', requireRole('admin'), (req, res) => {
  const stats = db.getAdminStats();
  res.json(stats);
});

// ----------------------------------------------------
// 10. Real EcoAi Chatbot API
// ----------------------------------------------------
app.post('/api/gemini/chat', aiLimiter, async (req, res) => {
  try {
    const { question, history, language } = req.body;
    if (typeof question !== 'string' || !question.trim() || question.length > 4000) {
      return res.status(400).json({ error: 'Question is required' });
    }
    const safeHistory = Array.isArray(history)
      ? history.slice(-10).filter((item) =>
          item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string' && item.text.length <= 4000
        )
      : [];
    const answer = await askEcoAiChat(question.trim(), safeHistory, language);
    res.json({ answer });
  } catch (err: any) {
    console.error('[API] EcoAi chat error:', err);
    res.status(500).json({ error: err.message || 'EcoAi response failed' });
  }
});

// ----------------------------------------------------
// Vite Middleware / Static Serving
async function listenWithFallback(serverApp: typeof app, targetPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let currentPort = targetPort;

    const tryListen = () => {
      const server = serverApp.listen(currentPort, '0.0.0.0', () => {
        console.log(`[EcoScan IN] Server running on http://localhost:${currentPort}`);
        resolve(currentPort);
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${currentPort} is already in use. Stop the existing EcoScan server or set PORT to a free port.`));
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await listenWithFallback(app, DEFAULT_PORT);
}

startServer();

