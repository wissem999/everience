import { Request, Response } from 'express';
import * as model from '../models/settingsModel';
import { invalidateSettingsCache } from '../services/emailService';
import { ApiError } from '../middleware/error';

const SMTP_KEYS = ['smtp_user', 'smtp_pass', 'mail_from'];
const FINANCE_KEYS = ['finance_emails'];
const EMAIL_KEYS = [
  'stock_alert_subject', 'stock_alert_body',
  'devis_supplier_subject', 'devis_supplier_body',
  'devis_admin_subject', 'devis_admin_body', 'devis_admin_html',
  'commande_approve_subject', 'commande_approve_body', 'commande_approve_html',
];

export async function getAll(req: Request, res: Response) {
  const keys = [...SMTP_KEYS, ...FINANCE_KEYS, ...EMAIL_KEYS];
  const settings = await model.getMany(keys);
  res.json(settings);
}

export async function update(req: Request, res: Response) {
  const body = req.body as Record<string, string>;
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Donnees invalides');
  }

  const allowedKeys = new Set([...SMTP_KEYS, ...FINANCE_KEYS, ...EMAIL_KEYS]);
  const entries = Object.entries(body)
    .filter(([k]) => allowedKeys.has(k))
    .map(([key, value]) => ({ key, value: String(value ?? '') }));

  if (!entries.length) {
    throw new ApiError(400, 'Aucune parametre valide fourni');
  }

  await model.upsertMany(entries);
  invalidateSettingsCache();
  const updated = await model.getMany([...SMTP_KEYS, ...FINANCE_KEYS, ...EMAIL_KEYS]);
  res.json(updated);
}
