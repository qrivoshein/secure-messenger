const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./src/config');
const logger = require('./src/utils/logger');
const { connectRedis } = require('./src/database/redis');
const pool = require('./src/database/postgres');
const routes = require('./src/routes');
const { setupWebSocket } = require('./src/websocket');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimit');
const authService = require('./src/services/auth.service');

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

async function broadcastNewUser(username, userId) {
    const userController = require('./src/controllers/user.controller');
    userController.onlineUsers.forEach((ws, user) => {
        if (ws.readyState === 1 && user !== username) {
            ws.send(JSON.stringify({
                type: 'new_user',
                username,
                userId
            }));
        }
    });
}

async function startServer() {
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
    const { redisClient } = require('./src/database/redis');
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

module.exports = { broadcastNewUser };
