import { Router } from 'express';
import { login } from '../controllers/authController';
import { asyncHandler } from '../utils/asyncHandler';
import { progressiveLimiter } from '../middleware/progressiveLimiter';

const router = Router();

router.post('/login', progressiveLimiter, asyncHandler(login));

export default router;
