import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as settingsController from '../controllers/settingsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(settingsController.getAll));
router.put('/', asyncHandler(settingsController.update));

export default router;
