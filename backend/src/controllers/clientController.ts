import { crudController } from './crudFactory';
import * as model from '../models/clientModel';
import { ApiError } from '../middleware/error';

export default crudController<model.Client>({
  findAll: model.findAll,
  findById: model.findById,
  create: model.create,
  update: model.update,
  remove: model.remove,

  validate(data) {
    const nom = String(data.nom ?? '').trim();
    if (!nom) throw new ApiError(400, 'Le nom est requis');

    return {
      nom,
      adresse: data.adresse == null ? undefined : String(data.adresse),
      ville: data.ville == null ? undefined : String(data.ville),
      pays: data.pays == null ? undefined : String(data.pays),
      telephone: data.telephone == null ? undefined : String(data.telephone),
      mail: data.mail == null ? undefined : String(data.mail),
    };
  },
});
