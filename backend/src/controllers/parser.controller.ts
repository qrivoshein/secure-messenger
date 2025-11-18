import { Response } from 'express';
import { AuthRequest } from '../types';
import { documentParserService } from '../services/document-parser.service';
import { logger } from '../utils/logger';

export class ParserController {
    /**
     * Parse uploaded document
     */
    async parseDocument(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const { buffer, originalname } = req.file;

            // Parse document via microservice
            const result = await documentParserService.parseDocument(buffer, originalname);

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            logger.error('Parse document error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to parse document'
            });
        }
    }

    /**
     * Export document to specified format
     */
    async exportDocument(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { documentId, format } = req.body;

            if (!documentId || !format) {
                res.status(400).json({
                    success: false,
                    error: 'Missing documentId or format'
                });
                return;
            }

            // Export via microservice
            const result = await documentParserService.exportDocument(documentId, format);

            // If Excel file, modify download URL to go through our backend
            if (result.download_url) {
                result.download_url = `/api/parser/download/${documentId}.xlsx`;
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            logger.error('Export document error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to export document'
            });
        }
    }

    /**
     * Download exported file
     */
    async downloadFile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { filename } = req.params;

            // Get download URL from microservice
            const downloadUrl = documentParserService.getDownloadUrl(filename);

            // Redirect to microservice
            res.redirect(downloadUrl);
        } catch (error: any) {
            logger.error('Download file error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to download file'
            });
        }
    }

    /**
     * Delete document
     */
    async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { documentId } = req.params;

            await documentParserService.deleteDocument(documentId);

            res.json({
                success: true,
                message: 'Document deleted successfully'
            });
        } catch (error: any) {
            logger.error('Delete document error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete document'
            });
        }
    }

    /**
     * Health check for parser service
     */
    async healthCheck(req: AuthRequest, res: Response): Promise<void> {
        try {
            const isHealthy = await documentParserService.healthCheck();

            res.json({
                success: true,
                parserService: isHealthy ? 'healthy' : 'unhealthy'
            });
        } catch (error: any) {
            logger.error('Parser health check error:', error);
            res.status(500).json({
                success: false,
                error: 'Health check failed'
            });
        }
    }
}

export const parserController = new ParserController();
