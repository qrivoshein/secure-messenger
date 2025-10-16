import { Response, NextFunction } from 'express';
import fileService from '../services/file.service';
import logger from '../utils/logger';
import mime from 'mime-types';
import { AuthRequest } from '../types';

class FileController {
    async getFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { filename } = req.params;
            const username = req.user!.username;

            const hasAccess = await fileService.checkFileAccess(username, filename);
            
            if (!hasAccess) {
                res.status(403).json({ error: 'Access denied to this file' });
                return;
            }

            const filePath = await fileService.getFilePath(filename);
            const stats = await fileService.getFileStats(filename);
            
            const mimeType = mime.lookup(filename) || 'application/octet-stream';
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');

            const fileStream = await fileService.getFileStream(filename);
            
            fileStream.on('error', (error) => {
                logger.error(`Error streaming file ${filename}:`, error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error reading file' });
                }
            });

            fileStream.pipe(res);
        } catch (error: any) {
            if (error.message === 'FILE_NOT_FOUND') {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            next(error);
        }
    }
}

export default new FileController();
