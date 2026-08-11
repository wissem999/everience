import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as model from '../models/userModel';
import { ApiError } from '../middleware/error';

export async function login(req: Request, res: Response) {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

  if (!email || !password) throw new ApiError(400, 'Email et mot de passe requis');

  const user = await model.findByEmail(email);
  if (!user) throw new ApiError(401, 'Email ou mot de passe incorrect');

  const valid = await bcrypt.compare(password, user.password_hash || '');
  if (!valid) throw new ApiError(401, 'Email ou mot de passe incorrect');

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
