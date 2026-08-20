import { Request, Response } from 'express';
import * as model from '../models/packModel';
import { ApiError } from '../middleware/error';
import { asyncHandler } from '../utils/asyncHandler';

export default {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const packs = await model.findAll();
    res.json(packs);
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const pack = await model.findById(Number(req.params.id));
    if (!pack) throw new ApiError(404, 'Pack introuvable');
    res.json(pack);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { nom, description, items } = req.body;
    if (!nom || !nom.trim()) throw new ApiError(400, 'Le nom est requis');
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Le pack doit contenir au moins un article');
    }
    const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantite || 0), 0);
    if (totalQty < 2) {
      throw new ApiError(400, 'Un pack doit totaliser au moins 2 articles (ex: 1 article avec 2 quantites)');
    }
    for (const item of items) {
      if (!item.article_id || !item.quantite || item.quantite < 1) {
        throw new ApiError(400, 'Chaque article doit avoir un id et une quantite >= 1');
      }
    }
    const pack = await model.create({ nom: nom.trim(), description, items });
    res.status(201).json(pack);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await model.findById(id);
    if (!existing) throw new ApiError(404, 'Pack introuvable');
    const { nom, description, items } = req.body;
    if (!nom || !nom.trim()) throw new ApiError(400, 'Le nom est requis');
    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Le pack doit contenir au moins un article');
    }
    const totalQty2 = items.reduce((sum: number, item: any) => sum + (item.quantite || 0), 0);
    if (totalQty2 < 2) {
      throw new ApiError(400, 'Un pack doit totaliser au moins 2 articles (ex: 1 article avec 2 quantites)');
    }
    for (const item of items) {
      if (!item.article_id || !item.quantite || item.quantite < 1) {
        throw new ApiError(400, 'Chaque article doit avoir un id et une quantite >= 1');
      }
    }
    const pack = await model.update(id, { nom: nom.trim(), description, items });
    res.json(pack);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const deleted = await model.remove(Number(req.params.id));
    if (!deleted) throw new ApiError(404, 'Pack introuvable');
    res.json({ message: 'Supprimé avec succès' });
  }),
};
