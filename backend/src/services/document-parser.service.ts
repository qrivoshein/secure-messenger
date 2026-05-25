import FormData from 'form-data';
import axios from 'axios';
import logger from '../utils/logger';

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || 'http://localhost:8000';

export interface ParseResult {
    status: string;
    document_id: string;
    structure: any;
    text_content: string;
    /**
     * Ключевые реквизиты, извлечённые модулем app/extractors:
     * inn, kpp, ogrn, bik, bank_accounts, amounts, dates, document_numbers,
     * document_type_hint. Структуру см. app/extractors/field_extractor.py.
     */
    extracted_fields?: Record<string, any>;
    processing_time: number;
    error?: string;
}

export interface ExportResult {
    status: string;
    format: string;
    content?: string;
    download_url?: string;
    error?: string;
}

class DocumentParserService {
    private serviceUrl: string;

    constructor() {
        this.serviceUrl = PARSER_SERVICE_URL;
        logger.info(`Document Parser Service URL: ${this.serviceUrl}`);
    }

    /**
     * Parse document via Python microservice
     */
    async parseDocument(fileBuffer: Buffer, filename: string): Promise<ParseResult> {
        try {
            const formData = new FormData();
            formData.append('file', fileBuffer, filename);

            const response = await axios.post(`${this.serviceUrl}/parse`, formData, {
                headers: formData.getHeaders(),
                timeout: 60000, // 60 seconds
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            logger.info(`Document parsed successfully: ${response.data.document_id}`);
            return response.data;
        } catch (error: any) {
            logger.error('Error parsing document:', error.message);
            
            if (error.response) {
                throw new Error(`Parser service error: ${error.response.data.detail || error.message}`);
            }
            throw new Error(`Failed to parse document: ${error.message}`);
        }
    }

    /**
     * Export document to specified format
     */
    async exportDocument(documentId: string, format: string): Promise<ExportResult> {
        try {
            const response = await axios.post(`${this.serviceUrl}/export`, {
                document_id: documentId,
                format: format
            }, {
                timeout: 30000 // 30 seconds
            });

            logger.info(`Document exported successfully: ${documentId} -> ${format}`);
            return response.data;
        } catch (error: any) {
            logger.error('Error exporting document:', error.message);
            
            if (error.response) {
                throw new Error(`Parser service error: ${error.response.data.detail || error.message}`);
            }
            throw new Error(`Failed to export document: ${error.message}`);
        }
    }

    /**
     * Get download URL for exported file
     */
    getDownloadUrl(filename: string): string {
        return `${this.serviceUrl}/download/${filename}`;
    }

    /**
     * Delete document from parser service
     */
    async deleteDocument(documentId: string): Promise<void> {
        try {
            await axios.delete(`${this.serviceUrl}/document/${documentId}`, {
                timeout: 10000 // 10 seconds
            });
            
            logger.info(`Document deleted: ${documentId}`);
        } catch (error: any) {
            logger.error('Error deleting document:', error.message);
            // Don't throw - deletion is not critical
        }
    }

    /**
     * Check if parser service is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.serviceUrl}/health`, {
                timeout: 5000 // 5 seconds
            });
            
            return response.data.status === 'healthy';
        } catch (error) {
            logger.error('Parser service health check failed:', error);
            return false;
        }
    }
}

export const documentParserService = new DocumentParserService();
