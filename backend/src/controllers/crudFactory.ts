import { Request, Response } from 'express';
import { ApiError } from '../middleware/error';

interface CrudHandlers<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | undefined>;
  create(data: Omit<T, 'id'>): Promise<T | undefined>;
  update(id: number, data: Omit<T, 'id'>): Promise<T | undefined>;
  remove(id: number): Promise<boolean>;
  validate(data: Record<string, unknown>): Omit<T, 'id'>;
}

export function crudController<T>(handlers: CrudHandlers<T>) {
  return {
    list: async (req: Request, res: Response) => {
      const rows = await handlers.findAll();
      res.json(rows);
    },

    getOne: async (req: Request, res: Response) => {
      const row = await handlers.findById(Number(req.params.id));
      if (!row) throw new ApiError(404, 'Enregistrement introuvable');
      res.json(row);
    },

    create: async (req: Request, res: Response) => {
      const data = handlers.validate(req.body);
      const row = await handlers.create(data);
      res.status(201).json(row);
    },

    update: async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const existing = await handlers.findById(id);
      if (!existing) throw new ApiError(404, 'Enregistrement introuvable');
      const data = handlers.validate(req.body);
      const row = await handlers.update(id, data);
      res.json(row);
    },

    remove: async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const deleted = await handlers.remove(id);
      if (!deleted) throw new ApiError(404, 'Enregistrement introuvable');
      res.json({ message: 'Supprimé avec succès' });
    },
  };
}
