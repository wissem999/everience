import { crudController } from './crudFactory';
import * as model from '../models/productModel';
import { ApiError } from '../middleware/error';

export default crudController<model.Product>({
  findAll: model.findAll,
  findById: model.findById,
  create: model.create,
  update: model.update,
  remove: model.remove,

  validate(data) {
    const num_article = String(data.num_article ?? '').trim();
    const nom = String(data.nom ?? '').trim();
    if (!num_article) throw new ApiError(400, 'Le numéro article est requis');
    if (!nom) throw new ApiError(400, 'Le nom est requis');

    return {
      num_article,
      nom,
      description: data.description == null ? undefined : String(data.description),
      prix: Number(data.prix) || 0,
      stock: Number(data.stock) || 0,
      stock_min: Number(data.stock_min) || 0,
    };
  },
});
