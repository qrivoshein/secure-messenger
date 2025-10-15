const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const { messageParamValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimit');
const config = require('../config');

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

router.get('/messages/:otherUser', authenticate, messageParamValidation, messageController.getMessages.bind(messageController));
router.post('/upload', authenticate, uploadLimiter, upload.single('file'), messageController.uploadFile.bind(messageController));

module.exports = router;
