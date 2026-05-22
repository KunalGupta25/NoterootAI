import { Router } from 'express';
import { signup, login, me, getSettings, updateSettings } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/settings', requireAuth, getSettings);
router.put('/settings', requireAuth, updateSettings);

export default router;
