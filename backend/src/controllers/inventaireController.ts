import { crudController } from './crudFactory';
import * as model from '../models/inventaireModel';
import { ApiError } from '../middleware/error';

export default crudController<model.Inventaire>({
  findAll: model.findAll,
  findById: model.findById,
  create: model.create,
  update: model.update,
  remove: model.remove,

  async validate(data, id?) {
    const numero_serie = String(data.numero_serie ?? '').trim();
    if (!numero_serie) throw new ApiError(400, 'Le numero de serie est requis');

    const article_id = Number(data.article_id);
    if (!article_id || article_id <= 0) throw new ApiError(400, 'Selectionnez un article');

    const dup = await model.findByNumeroSerieAndArticle(numero_serie, article_id, id);
    if (dup) throw new ApiError(409, 'Ce numero de serie existe deja pour cet article');

    const statut = (data.statut === 'affecte' ? 'affecte' : 'stock') as 'stock' | 'affecte';

    let client_id: number | null = null;
    let employee_name: string | null = null;

    if (statut === 'affecte') {
      client_id = data.client_id ? Number(data.client_id) : null;
      employee_name = data.employee_name ? String(data.employee_name).trim() : null;
    }

    return {
      numero_serie,
      article_id,
      statut,
      client_id,
      employee_name,
    };
  },
});
