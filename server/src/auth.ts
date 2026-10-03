import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Resolve the JWT signing secret. Prefers the JWT_SECRET env var; otherwise a random
 * secret is generated once and persisted to disk so tokens survive restarts without
 * ever relying on a secret that is published in the source code.
 */
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = path.resolve(process.env.JWT_SECRET_FILE || path.join(__dirname, '..', '.jwt_secret'));
  try {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch { /* not created yet */ }
  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    console.warn(`[Auth] JWT_SECRET not set - generated a random secret at ${secretPath}`);
  } catch (err) {
    console.warn('[Auth] JWT_SECRET not set and secret file is not writable - using an ephemeral secret (tokens reset on restart)');
  }
  return generated;
}

const JWT_SECRET = resolveJwtSecret();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: { id: string; username: string }): string {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

export function verifyToken(token: string): { id: string; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string };
  } catch (err) {
    return null;
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
}
