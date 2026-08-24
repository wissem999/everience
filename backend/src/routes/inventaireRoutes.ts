import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import inventaireController from '../controllers/inventaireController';

const router = Router();

router.use(authenticate);

router.get('/', inventaireController.list);
router.get('/:id', inventaireController.getOne);
router.post('/', inventaireController.create);
router.put('/:id', inventaireController.update);
router.delete('/:id', inventaireController.remove);

export default router;
