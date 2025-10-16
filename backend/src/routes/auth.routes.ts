import express from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { registerValidation, loginValidation } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';

const router = express.Router();

router.post('/register', authLimiter, ...registerValidation, authController.register.bind(authController));
router.post('/login', authLimiter, ...loginValidation, authController.login.bind(authController));
router.get('/verify', authenticate, authController.verify.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
