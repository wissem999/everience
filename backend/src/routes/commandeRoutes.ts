import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/commandeController';

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

router.post('/:id/relancer-devis', controller.relancerDevis);
router.post('/:id/envoyer-admin', controller.envoyerAdmin);
router.post('/:id/approuver', requireRole('admin'), controller.approuver);
router.post('/:id/refuser', requireRole('admin'), controller.refuser);

export default router;
