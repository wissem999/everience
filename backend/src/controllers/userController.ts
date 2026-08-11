import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as model from '../models/userModel';
import { emailExists, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';

const validateUser = (data: any) => {
  const nom = String(data.nom ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const role = data.role === 'admin' ? 'admin' : 'user';

  if (!nom) throw new ApiError(400, 'Le nom est requis');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Email invalide');

  return { nom, email, role };
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
  const { nom, email, role } = validateUser(req.body);
  const password = String(req.body.password ?? '');

  if (password.length < 6) throw new ApiError(400, 'Le mot de passe doit contenir au moins 6 caractères');
  if (await emailExists(email)) throw new ApiError(409, 'Cet email est déjà utilisé');

  const password_hash = await bcrypt.hash(password, 10);
  const user = await model.create({ nom, email, password_hash, role });
  res.status(201).json(user);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await model.findById(id);
  if (!existing) throw new ApiError(404, 'Utilisateur introuvable');

  const { nom, email, role } = validateUser(req.body);

  const other = await model.findByEmail(email);
  if (other && other.id !== id) throw new ApiError(409, 'Cet email est déjà utilisé');

  const user = await model.update(id, { nom, email, role });

  if (req.body.password) {
    if (String(req.body.password).length < 6) throw new ApiError(400, 'Le mot de passe doit contenir au moins 6 caractères');
    const password_hash = await bcrypt.hash(String(req.body.password), 10);
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
  res.json({ message: 'Utilisateur supprimé' });
}
