import express from 'express';
import multer from 'multer';
import path from 'path';
import messageController from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { messageParamValidation } from '../middleware/validation';
import { uploadLimiter } from '../middleware/rateLimit';
import config from '../config';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.upload.uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: config.upload.maxFileSize }
});

router.get('/messages/:otherUser', authenticate, ...messageParamValidation, messageController.getMessages.bind(messageController));
router.post('/messages', authenticate, messageController.sendMessage.bind(messageController));
router.post('/upload', authenticate, uploadLimiter, upload.single('file'), messageController.uploadFile.bind(messageController));

export default router;
