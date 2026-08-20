import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as model from '../models/userModel';
import { ApiError } from '../middleware/error';
import { recordFailedLogin, recordSuccessfulLogin } from '../middleware/progressiveLimiter';

export async function login(req: Request, res: Response) {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

  if (!email && !password) throw new ApiError(400, 'Email et mot de passe requis');
  if (!email) throw new ApiError(400, 'Adresse email requise');
  if (!password) throw new ApiError(400, 'Mot de passe requis');

  if (email.length > 255) throw new ApiError(400, 'Adresse email trop longue');
  if (password.length > 128) throw new ApiError(400, 'Mot de passe trop long');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Adresse email invalide');
  }

  const user = await model.findByEmail(email);
  if (!user) { recordFailedLogin(req); throw new ApiError(401, 'Email ou mot de passe incorrect'); }

  const valid = await bcrypt.compare(password, user.password_hash || '');
  if (!valid) { recordFailedLogin(req); throw new ApiError(401, 'Email ou mot de passe incorrect'); }

  recordSuccessfulLogin(req);

  const token = jwt.sign(
    { id: user.id, nom: user.nom, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] }
  );

  res.json({
    token,
    user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
  });
}
