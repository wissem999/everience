import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route introuvable' });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err.message);

  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err.message.includes('ER_DUP_ENTRY')) {
    return res.status(409).json({ message: 'Un enregistrement avec cette valeur existe deja' });
  }

  res.status(500).json({ message: 'Erreur interne du serveur' });
}
