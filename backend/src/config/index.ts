import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

const config: Config = {
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0',
        env: process.env.NODE_ENV || 'development'
    },
    
    db: {
        user: process.env.DB_USER || 'messenger_app',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'secure_messenger',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    },
    
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10)
    },
    
    auth: {
        sessionTTL: 86400,
        bcryptRounds: 10,
        tokenLength: 32
    },
    
    upload: {
        maxFileSize: 50 * 1024 * 1024,
        uploadDir: './uploads'
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100
    },
    
    websocket: {
        pingInterval: 30000,
        onlineStatusTTL: 60,
        typingStatusTTL: 5
    }
};

export default config;
