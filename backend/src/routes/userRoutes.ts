import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as userController from '../controllers/userController';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', userController.list);
router.get('/:id', userController.getOne);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

export default router;
