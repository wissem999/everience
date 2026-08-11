import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import clientController from '../controllers/clientController';

const router = Router();

router.use(authenticate);

router.get('/', clientController.list);
router.get('/:id', clientController.getOne);
router.post('/', clientController.create);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.remove);

export default router;
