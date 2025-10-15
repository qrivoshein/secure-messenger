const fileService = require('../services/file.service');
const logger = require('../utils/logger');
const mime = require('mime-types');

class FileController {
    async getFile(req, res, next) {
        try {
            const { filename } = req.params;
            const username = req.user.username;

            const hasAccess = await fileService.checkFileAccess(username, filename);
            
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied to this file' });
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
        } catch (error) {
            if (error.message === 'FILE_NOT_FOUND') {
                return res.status(404).json({ error: 'File not found' });
            }
            next(error);
        }
    }
}

module.exports = new FileController();
