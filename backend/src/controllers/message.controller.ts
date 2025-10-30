import { Response, NextFunction } from 'express';
import messageService from '../services/message.service';
import { AuthRequest } from '../types';
import path from 'path';
import fs from 'fs';
import config from '../config';

class MessageController {
    async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { otherUser } = req.params;
            const limit = parseInt(req.query.limit as string) || 100; // Default 100 messages
            const messages = await messageService.getMessages(req.user!.username, otherUser, limit);
            res.json({ messages });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { to, text, mediaType, mediaUrl } = req.body;
            
            if (!to || !text) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await messageService.saveMessage({
                messageId,
                from: req.user!.username,
                to,
                text,
                mediaType,
                mediaUrl
            });

            res.json({ 
                success: true, 
                messageId
            });
        } catch (error) {
            next(error);
        }
    }

    async uploadFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            // Return authenticated API URL - requires JWT token to access
            const fileUrl = `/api/file/${req.file.filename}`;
            
            res.json({ 
                fileUrl: fileUrl,
                fileName: req.file.originalname,
                fileSize: req.file.size
            });
        } catch (error) {
            next(error);
        }
    }

    async getFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { filename } = req.params;
            
            // Security: prevent path traversal
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                res.status(400).json({ error: 'Invalid filename' });
                return;
            }

            const filePath = path.join(config.upload.uploadDir, filename);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                res.status(404).json({ error: 'File not found' });
                return;
            }

            // Get file stats
            const stats = fs.statSync(filePath);
            
            // Set proper content type based on extension
            const ext = path.extname(filename).toLowerCase();
            const contentTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.webm': 'audio/webm',
                '.mp3': 'audio/mpeg',
                '.mp4': 'video/mp4',
                '.m4a': 'audio/mp4',
                '.ogg': 'audio/ogg',
                '.wav': 'audio/wav',
                '.pdf': 'application/pdf',
            };
            
            const contentType = contentTypes[ext] || 'application/octet-stream';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
            
            // Stream file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new MessageController();
