import { Response, NextFunction } from 'express';
import messageService from '../services/message.service';
import { AuthRequest } from '../types';

class MessageController {
    async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { otherUser } = req.params;
            const messages = await messageService.getMessages(req.user!.username, otherUser);
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

            const fileUrl = `/api/file/${req.file.filename}`;
            const fileInfo = {
                url: fileUrl,
                name: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype
            };

            res.json({ success: true, file: fileInfo });
        } catch (error) {
            next(error);
        }
    }
}

export default new MessageController();
