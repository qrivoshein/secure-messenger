import { Router } from 'express';
import multer from 'multer';
import { parserController } from '../controllers/parser.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});

// All routes require authentication
router.use(authMiddleware);

// Parse document
router.post('/parse', upload.single('file'), (req, res) => {
    parserController.parseDocument(req, res);
});

// Export document
router.post('/export', (req, res) => {
    parserController.exportDocument(req, res);
});

// Download exported file
router.get('/download/:filename', (req, res) => {
    parserController.downloadFile(req, res);
});

// Delete document
router.delete('/document/:documentId', (req, res) => {
    parserController.deleteDocument(req, res);
});

// Health check
router.get('/health', (req, res) => {
    parserController.healthCheck(req, res);
});

export default router;
