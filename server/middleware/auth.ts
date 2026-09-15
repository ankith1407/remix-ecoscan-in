import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

const DEFAULT_JWT_SECRET = 'ecoscan-jwt-secret-key-default-2026-production-ready';
const DEFAULT_JWT_REFRESH_SECRET = 'ecoscan-jwt-refresh-secret-key-default-2026-production-ready';

function getJwtSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name]?.trim();
  if (value && value.length > 0) return value;
  return name === 'JWT_SECRET' ? DEFAULT_JWT_SECRET : DEFAULT_JWT_REFRESH_SECRET;
}

export interface AuthPayload {
  id: string;
  email: string;
  role: 'user' | 'collector' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateTokens(payload: AuthPayload) {
  const accessSecret = getJwtSecret('JWT_SECRET');
  const refreshSecret = getJwtSecret('JWT_REFRESH_SECRET');
  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '7d', algorithm: 'HS256' });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: '7d', algorithm: 'HS256' });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AuthPayload | null {
  const secret = getJwtSecret('JWT_SECRET');
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (!payload || typeof payload === 'string') return null;
    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') return null;
    if (!['user', 'collector', 'admin'].includes(payload.role as string)) return null;
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthPayload | null {
  const secret = getJwtSecret('JWT_REFRESH_SECRET');
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (!payload || typeof payload === 'string') return null;
    if (typeof payload.id !== 'string' || typeof payload.email !== 'string') return null;
    if (!['user', 'collector', 'admin'].includes(payload.role as string)) return null;
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && (req as any).cookies?.accessToken) {
    token = (req as any).cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles: Array<'user' | 'collector' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to ${allowedRoles.join(', ')} roles.` });
    }
    next();
  };
}
