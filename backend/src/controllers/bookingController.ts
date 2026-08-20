import { crudController } from './crudFactory';
import * as model from '../models/bookingModel';
import { ApiError } from '../middleware/error';
import { asyncHandler } from '../utils/asyncHandler';

const VALID_TYPES = ['entree', 'sortie', 'retour', 'corbeille', 'recuperation'] as const;
const VALID_RETOUR_CONDITIONS = ['bon', 'endommage'] as const;

function toType(value: unknown): model.BookingType {
  if (VALID_TYPES.includes(value as any)) return value as model.BookingType;
  return 'entree';
}

function toRetourCondition(value: unknown): model.RetourCondition | null {
  if (VALID_RETOUR_CONDITIONS.includes(value as any)) return value as model.RetourCondition;
  return null;
}

const baseCrud = crudController<model.Booking>({
  findAll: model.findAll,
  findById: model.findById,
  create: model.create,
  update: model.update,
  remove: model.remove,

  validate(data) {
    const type = toType(data.type);
    const retour_condition = type === 'retour' ? toRetourCondition(data.retour_condition) : null;
    const nombre = Number(data.nombre);
    if (!Number.isInteger(nombre) || nombre <= 0) {
      throw new ApiError(400, 'Le nombre doit etre un entier positif');
    }

    const rawDate = String(data.date ?? '');
    if (!rawDate) throw new ApiError(400, 'La date est requise');

    const article_id = Number(data.article_id);
    if (!Number.isInteger(article_id) || article_id <= 0) {
      throw new ApiError(400, "Selectionnez un article");
    }

    const toId = (v: unknown): number | undefined => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : undefined;
    };

    return {
      type,
      retour_condition,
      nr_facture: data.nr_facture == null || data.nr_facture === '' ? undefined : String(data.nr_facture),
      nr_bon_commande: data.nr_bon_commande == null || data.nr_bon_commande === '' ? undefined : String(data.nr_bon_commande),
      fournisseur_id: toId(data.fournisseur_id),
      client_id: toId(data.client_id),
      article_id,
      nombre,
      date: rawDate,
    };
  },
});

const listWithFilters = asyncHandler(async (req, res) => {
  const filters: model.BookingFilters = {};
  if (req.query.type) filters.type = String(req.query.type);
  if (req.query.date_from) filters.date_from = String(req.query.date_from);
  if (req.query.date_to) filters.date_to = String(req.query.date_to);
  if (req.query.client_id) filters.client_id = Number(req.query.client_id);
  if (req.query.fournisseur_id) filters.fournisseur_id = Number(req.query.fournisseur_id);
  if (req.query.article_id) filters.article_id = Number(req.query.article_id);
  const rows = await model.findAll(Object.keys(filters).length ? filters : undefined);
  res.json(rows);
});

const stockSummary = asyncHandler(async (_req, res) => {
  const summary = await model.getStockSummary();
  res.json(summary);
});

export default { ...baseCrud, list: listWithFilters, stockSummary };
