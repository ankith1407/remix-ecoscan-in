import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

const JWT_SECRET = process.env.JWT_SECRET || 'ecoscan-super-secret-jwt-key-2026-production-ready';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ecoscan-super-secret-refresh-key-2026-production-ready';

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
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // Fallback to query param or cookie if header absent
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
