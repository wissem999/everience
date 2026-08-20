import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import packController from '../controllers/packController';

const router = Router();

router.use(authenticate);

router.get('/', packController.list);
router.get('/:id', packController.getOne);
router.post('/', packController.create);
router.put('/:id', packController.update);
router.delete('/:id', packController.remove);

export default router;
