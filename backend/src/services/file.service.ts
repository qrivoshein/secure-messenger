import pool from '../database/postgres';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import config from '../config';

class FileService {
    async checkFileAccess(username: string, filename: string): Promise<boolean> {
        const newFileUrl = `/api/file/${filename}`;
        const oldFileUrl = `/uploads/${filename}`;
        
        const result = await pool.query(
            `SELECT m.from_username, m.to_username, m.media_url 
             FROM messages m 
             WHERE (m.media_url = $1 OR m.media_url = $2)
             AND (m.from_username = $3 OR m.to_username = $3)
             LIMIT 1`,
            [newFileUrl, oldFileUrl, username]
        );

        if (result.rows.length === 0) {
            logger.warn(`Unauthorized file access attempt: ${username} -> ${filename}`);
            return false;
        }

        logger.debug(`File access granted: ${username} -> ${filename}`);
        return true;
    }

    async getFilePath(filename: string): Promise<string> {
        const sanitizedFilename = path.basename(filename);
        const filePath = path.join(config.upload.uploadDir, sanitizedFilename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error('FILE_NOT_FOUND');
        }

        return filePath;
    }

    async getFileStream(filename: string): Promise<fs.ReadStream> {
        const filePath = await this.getFilePath(filename);
        return fs.createReadStream(filePath);
    }

    async getFileStats(filename: string): Promise<fs.Stats> {
        const filePath = await this.getFilePath(filename);
        return fs.statSync(filePath);
    }
}

export default new FileService();
