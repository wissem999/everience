import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import productController from '../controllers/productController';

const router = Router();

router.use(authenticate);

router.get('/', productController.list);
router.get('/:id', productController.getOne);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
