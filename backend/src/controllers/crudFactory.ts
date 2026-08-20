import { Request, Response } from 'express';
import { ApiError } from '../middleware/error';
import { asyncHandler } from '../utils/asyncHandler';

interface CrudHandlers<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | undefined>;
  create(data: Omit<T, 'id'>): Promise<T | undefined>;
  update(id: number, data: Omit<T, 'id'>): Promise<T | undefined>;
  remove(id: number): Promise<boolean>;
  validate(data: Record<string, unknown>, id?: number): Omit<T, 'id'> | Promise<Omit<T, 'id'>>;
}

export function crudController<T>(handlers: CrudHandlers<T>) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const rows = await handlers.findAll();
      res.json(rows);
    }),

    getOne: asyncHandler(async (req: Request, res: Response) => {
      const row = await handlers.findById(Number(req.params.id));
      if (!row) throw new ApiError(404, 'Enregistrement introuvable');
      res.json(row);
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const data = await handlers.validate(req.body);
      const row = await handlers.create(data);
      res.status(201).json(row);
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const existing = await handlers.findById(id);
      if (!existing) throw new ApiError(404, 'Enregistrement introuvable');
      const data = await handlers.validate(req.body, id);
      const row = await handlers.update(id, data);
      res.json(row);
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const deleted = await handlers.remove(id);
      if (!deleted) throw new ApiError(404, 'Enregistrement introuvable');
      res.json({ message: 'Supprimé avec succès' });
    }),
  };
}
