import { Request, Response, NextFunction } from 'express';

/** Minimal dependency-free fixed-window rate limiter keyed by client IP. */
export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    hits.forEach((v, k) => { if (v.resetAt <= now) hits.delete(k); });
  }, opts.windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: opts.message || 'Too many requests, please try again later' });
    }
    next();
  };
}
