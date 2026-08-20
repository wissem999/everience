import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as userController from '../controllers/userController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(userController.list));
router.get('/:id', asyncHandler(userController.getOne));
router.post('/', asyncHandler(userController.create));
router.put('/:id', asyncHandler(userController.update));
router.delete('/:id', asyncHandler(userController.remove));

export default router;
