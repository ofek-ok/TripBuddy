import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'tripbuddy-dev-secret-change-in-prod';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function signToken(payload: Record<string, unknown>, expiresInSeconds = 60 * 60 * 24 * 30): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verifyToken<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
    );
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(body)) as T & { exp?: number };
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;

  if (!rawToken) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const decoded = verifyToken<{ userId: string }>(rawToken);
  if (!decoded?.userId) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }

  req.userId = decoded.userId;
  next();
}
