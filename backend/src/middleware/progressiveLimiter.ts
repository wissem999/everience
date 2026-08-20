import type { Request, Response, NextFunction } from 'express';

interface Attempt {
  count: number;
  blockedUntil: number;
}

const attempts = new Map<string, Attempt>();
const BASE_DELAY = 10;
const MAX_DELAY = 1800;

function getDelay(count: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, count - 1), MAX_DELAY);
}

export function progressiveLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('RateLimit-Reset', String(Math.floor(entry.blockedUntil / 1000)));
    return res.status(429).json({ message: `Trop de tentatives. Reessayez dans ${retryAfter} secondes.` });
  }

  if (entry && entry.blockedUntil <= now) {
    attempts.delete(ip);
  }

  next();
}

export function recordFailedLogin(req: Request) {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);
  const count = (entry?.count ?? 0) + 1;
  const delay = getDelay(count);
  attempts.set(ip, { count, blockedUntil: now + delay * 1000 });
}

export function recordSuccessfulLogin(req: Request) {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  attempts.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (entry.blockedUntil <= now) attempts.delete(ip);
  }
}, 60_000);
