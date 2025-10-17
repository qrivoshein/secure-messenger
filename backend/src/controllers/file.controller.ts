import { Response, NextFunction } from 'express';
import fileService from '../services/file.service';
import logger from '../utils/logger';
import mime from 'mime-types';
import { AuthRequest } from '../types';
import fs from 'fs';

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
            
            let mimeType = mime.lookup(filename) || 'application/octet-stream';
            
            // Safari requires specific MIME types for audio/video
            if (filename.endsWith('.m4a')) {
                mimeType = 'audio/mp4';
            } else if (filename.endsWith('.mp4') && mimeType.startsWith('video/')) {
                // Keep video/mp4 for video files
            } else if (filename.endsWith('.webm')) {
                mimeType = 'audio/webm';
            } else if (filename.endsWith('.ogg')) {
                mimeType = 'audio/ogg';
            }
            
            logger.info(`Serving file ${filename}, type: ${mimeType}, size: ${stats.size}`);
            
            // Handle Range requests (required for Safari audio/video)
            const range = req.headers.range;
            
            if (range) {
                // Parse range header
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
                const chunkSize = (end - start) + 1;
                
                logger.info(`Range request: bytes ${start}-${end}/${stats.size}`);
                
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': mimeType,
                    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
                    'Cache-Control': 'private, max-age=3600'
                });
                
                const stream = fs.createReadStream(filePath, { start, end });
                stream.on('error', (error) => {
                    logger.error(`Error streaming range for ${filename}:`, error);
                });
                stream.pipe(res);
            } else {
                // Full file
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Length', stats.size);
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
                res.setHeader('Cache-Control', 'private, max-age=3600');
                res.setHeader('Accept-Ranges', 'bytes');

                const fileStream = await fileService.getFileStream(filename);
                
                fileStream.on('error', (error) => {
                    logger.error(`Error streaming file ${filename}:`, error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Error reading file' });
                    }
                });

                fileStream.pipe(res);
            }
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
