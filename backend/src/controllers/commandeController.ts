import { Request, Response } from 'express';
import * as model from '../models/commandeModel';
import { ApiError } from '../middleware/error';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';
import { sendDemandeDevis, sendDevisAdmin, sendCommandeApprouvee, DevisCommandeInfo } from '../services/emailService';

const toBool = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true';

function validate(data: Record<string, unknown>): model.CommandeData {
  const nr_commande = String(data.nr_commande ?? '').trim();
  if (!nr_commande) throw new ApiError(400, 'Le numero de commande est requis');

  const date = String(data.date ?? '');
  if (!date) throw new ApiError(400, 'La date est requise');

  const article_id = Number(data.article_id);
  if (!Number.isInteger(article_id) || article_id <= 0) {
    throw new ApiError(400, 'Selectionnez un article');
  }

  const nombre = Number(data.nombre);
  if (!Number.isInteger(nombre) || nombre <= 0) {
    throw new ApiError(400, 'Le nombre doit etre un entier positif');
  }

  const fournisseur_id = Number(data.fournisseur_id);
  if (!Number.isInteger(fournisseur_id) || fournisseur_id <= 0) {
    throw new ApiError(400, 'Selectionnez un fournisseur');
  }

  let prix_unitaire: number | null = null;
  if (data.prix_unitaire !== '' && data.prix_unitaire != null) {
    prix_unitaire = Number(data.prix_unitaire);
    if (!Number.isFinite(prix_unitaire) || prix_unitaire < 0) {
      throw new ApiError(400, 'Le prix unitaire doit etre un nombre >= 0');
    }
  }
  const prix_total = prix_unitaire === null ? null : Number((nombre * prix_unitaire).toFixed(2));

  return {
    nr_commande,
    date,
    article_id,
    nombre,
    prix_unitaire,
    prix_total,
    fournisseur_id,
    controle: toBool(data.controle),
  };
}

function toDevisInfo(c: model.Commande): DevisCommandeInfo {
  return {
    id: c.id,
    nr_commande: c.nr_commande,
    date: c.date,
    article_id: c.article_id,
    num_article: c.nr_article ?? '',
    article_nom: c.article_nom ?? '',
    nombre: c.nombre,
    prix_unitaire: c.prix_unitaire,
    prix_total: c.prix_total,
    fournisseur: c.fournisseur,
    fournisseur_mail: c.fournisseur_mail,
  };
}

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await model.findAll());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const row = await model.findById(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Commande introuvable');
  res.json(row);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = validate(req.body);
  const row = await model.create(data, req.user?.id);
  if (row) {
    void sendDemandeDevis(toDevisInfo(row)).catch(() => {});
  }
  res.status(201).json(row);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = await model.findById(id);
  if (!existing) throw new ApiError(404, 'Commande introuvable');
  if (existing.statut !== 'en_attente' && req.user?.role !== 'admin') {
    throw new ApiError(400, 'Cette commande a deja ete envoyee, elle ne peut plus etre modifiee');
  }
  const data = validate(req.body);
  res.json(await model.update(id, data));
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = await model.findById(id);
  if (!existing) throw new ApiError(404, 'Commande introuvable');
  if (existing.statut !== 'en_attente' && req.user?.role !== 'admin') {
    throw new ApiError(400, 'Impossible de supprimer une commande deja envoyee');
  }
  await model.remove(id);
  res.json({ message: 'Commande supprimee' });
});

export const relancerDevis = asyncHandler(async (req: Request, res: Response) => {
  const row = await model.findById(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Commande introuvable');
  if (row.statut !== 'en_attente') {
    throw new ApiError(400, 'Devis deja envoye a l administrateur');
  }
  await sendDemandeDevis(toDevisInfo(row));
  res.json({ message: 'Demande de devis renvoyee au fournisseur' });
});

export const envoyerAdmin = asyncHandler(async (req: Request, res: Response) => {
  const row = await model.findById(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Commande introuvable');
  if (row.statut !== 'en_attente') {
    throw new ApiError(400, 'Devis deja envoye a l administrateur');
  }
  if (row.prix_unitaire == null || row.prix_unitaire <= 0) {
    throw new ApiError(400, 'Renseignez le prix unitaire avant de l envoyer a l administrateur');
  }
  await sendDevisAdmin(toDevisInfo(row));
  const updated = await model.setStatut(row.id, 'soumis');
  res.json({ message: 'Devis envoye a l administrateur', commande: updated });
});

export const approuver = asyncHandler(async (req: Request, res: Response) => {
  const row = await model.findById(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Commande introuvable');
  if (row.statut !== 'soumis') throw new ApiError(400, 'Seule une commande soumise peut etre approuvee');
  const updated = await model.setStatut(row.id, 'approuve');
  void sendCommandeApprouvee(toDevisInfo(row)).catch(() => {});
  res.json({ message: 'Commande approuvee', commande: updated });
});

export const refuser = asyncHandler(async (req: Request, res: Response) => {
  const row = await model.findById(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Commande introuvable');
  if (row.statut !== 'soumis') throw new ApiError(400, 'Seule une commande soumise peut etre refusee');
  const updated = await model.setStatut(row.id, 'refuse');
  res.json({ message: 'Commande refusee', commande: updated });
});
