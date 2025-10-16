import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import config from './src/config';
import logger from './src/utils/logger';
import { connectRedis } from './src/database/redis';
import pool from './src/database/postgres';
import routes from './src/routes';
import { setupWebSocket } from './src/websocket';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler';
import { generalLimiter } from './src/middleware/rateLimit';

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

if (!fs.existsSync(config.upload.uploadDir)) {
    fs.mkdirSync(config.upload.uploadDir);
    logger.info(`Created upload directory: ${config.upload.uploadDir}`);
}

if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

app.use(generalLimiter);

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

const wss = setupWebSocket(server);

async function startServer(): Promise<void> {
    try {
        await connectRedis();
        
        server.listen(config.server.port, config.server.host, () => {
            logger.info(`🚀 Secure Messenger Server running on port ${config.server.port}`);
            logger.info(`🌐 Server listening on ${config.server.host}:${config.server.port}`);
            logger.info(`📝 Environment: ${config.server.env}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing connections...');
    const { redisClient } = await import('./src/database/redis');
    await redisClient.quit();
    await pool.end();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
