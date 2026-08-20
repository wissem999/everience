import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import bookingController from '../controllers/bookingController';

const router = Router();

router.use(authenticate);

router.get('/stock-summary', bookingController.stockSummary);
router.get('/', bookingController.list);
router.get('/:id', bookingController.getOne);
router.post('/', bookingController.create);
router.put('/:id', bookingController.update);
router.delete('/:id', bookingController.remove);

export default router;
