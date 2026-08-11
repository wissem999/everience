import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import fournisseurController from '../controllers/fournisseurController';

const router = Router();

router.use(authenticate);

router.get('/', fournisseurController.list);
router.get('/:id', fournisseurController.getOne);
router.post('/', fournisseurController.create);
router.put('/:id', fournisseurController.update);
router.delete('/:id', fournisseurController.remove);

export default router;
