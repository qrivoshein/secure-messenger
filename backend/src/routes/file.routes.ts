import express from 'express';
import fileController from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/file/:filename', authenticate, fileController.getFile.bind(fileController));

export default router;
