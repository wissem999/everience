import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as model from '../models/userModel';
import { emailExists, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { sanitizeString } from '../utils/sanitize';

const validateUser = (data: any) => {
  const nom = sanitizeString(data.nom);
  const email = sanitizeString(data.email).toLowerCase();

  if (!nom) throw new ApiError(400, 'Le nom est requis');
  if (nom.length > 100) throw new ApiError(400, 'Le nom est trop long');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Email invalide');
  if (email.length > 255) throw new ApiError(400, 'Email trop long');

  return { nom, email };
};

export async function list(req: Request, res: Response) {
  res.json(await model.findAll());
}

export async function getOne(req: Request, res: Response) {
  const user = await model.findById(Number(req.params.id));
  if (!user) throw new ApiError(404, 'Utilisateur introuvable');
  res.json(user);
}

export async function create(req: Request, res: Response) {
  const { nom, email } = validateUser(req.body);
  const password = String(req.body.password ?? '');

  if (password.length < 6) throw new ApiError(400, 'Le mot de passe doit contenir au moins 6 caracteres');
  if (password.length > 128) throw new ApiError(400, 'Le mot de passe est trop long');
  if (await emailExists(email)) throw new ApiError(409, 'Cet email est deja utilise');

  const password_hash = await bcrypt.hash(password, 10);
  const user = await model.create({ nom, email, password_hash, role: 'user' });
  res.status(201).json(user);
}

export async function update(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const existing = await model.findById(id);
  if (!existing) throw new ApiError(404, 'Utilisateur introuvable');

  const { nom, email } = validateUser(req.body);

  const other = await model.findByEmail(email);
  if (other && other.id !== id) throw new ApiError(409, 'Cet email est deja utilise');

  const user = await model.update(id, { nom, email, role: existing.role });

  if (req.body.password) {
    const pwd = String(req.body.password);
    if (pwd.length < 6) throw new ApiError(400, 'Le mot de passe doit contenir au moins 6 caracteres');
    if (pwd.length > 128) throw new ApiError(400, 'Le mot de passe est trop long');
    const password_hash = await bcrypt.hash(pwd, 10);
    await model.updatePassword(id, password_hash);
  }

  res.json(user);
}

export async function remove(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);

  if (req.user?.id === id) {
    throw new ApiError(400, 'Vous ne pouvez pas supprimer votre propre compte');
  }

  const deleted = await model.remove(id);
  if (!deleted) throw new ApiError(404, 'Utilisateur introuvable');
  res.json({ message: 'Utilisateur supprime' });
}
