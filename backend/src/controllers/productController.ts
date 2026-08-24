import { crudController } from './crudFactory';
import * as model from '../models/productModel';
import { ApiError } from '../middleware/error';
import { pool } from '../config/db';

export default crudController<model.Product>({
  findAll: model.findAll,
  findById: model.findById,
  create: model.create,
  update: model.update,
  remove: model.remove,

  async validate(data, id?) {
    const num_article = String(data.num_article ?? '').trim();
    const nom = String(data.nom ?? '').trim();
    if (!num_article) throw new ApiError(400, 'Le numéro article est requis');
    if (!nom) throw new ApiError(400, 'Le nom est requis');

    const where = id ? 'AND id != ?' : '';
    const params = id ? [num_article, id] : [num_article];
    const [dup] = await pool.query(
      `SELECT id FROM products WHERE num_article = ? ${where} LIMIT 1`,
      params
    );
    if ((dup as unknown[]).length > 0) {
      throw new ApiError(409, 'Ce numéro article existe déjà');
    }

    return {
      num_article,
      nom,
      description: data.description == null ? undefined : String(data.description),
      type: data.type == null ? undefined : String(data.type),
      prix: Number(data.prix) || 0,
      stock: Number(data.stock) || 0,
      stock_min: Number(data.stock_min) || 0,
    };
  },
});
