import express from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import messageRoutes from './message.routes';
import fileRoutes from './file.routes';

const router = express.Router();

router.use('/api', authRoutes);
router.use('/api', userRoutes);
router.use('/api', messageRoutes);
router.use('/api', fileRoutes);

export default router;
