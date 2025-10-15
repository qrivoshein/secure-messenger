const WebSocket = require('ws');
const messageHandlers = require('./handlers');
const messageService = require('../services/message.service');
const userController = require('../controllers/user.controller');
const logger = require('../utils/logger');
const config = require('../config');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    const onlineUsers = userController.onlineUsers;

    function broadcastOnlineUsers() {
        const onlineUsersList = Array.from(onlineUsers.keys());
        
        onlineUsers.forEach((ws, username) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'online_users',
                    users: onlineUsersList.filter(u => u !== username)
                }));
            }
        });
    }

    function broadcastNewUser(newUsername, userId) {
        onlineUsers.forEach((ws, username) => {
            if (ws.readyState === WebSocket.OPEN && username !== newUsername) {
                ws.send(JSON.stringify({
                    type: 'new_user',
                    username: newUsername,
                    userId: userId
                }));
            }
        });
    }

    wss.on('connection', (ws) => {
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                const handler = messageHandlers[message.type];

                if (handler) {
                    await handler(ws, message, { 
                        onlineUsers, 
                        broadcastOnlineUsers,
                        broadcastNewUser
                    });
                } else {
                    logger.warn(`Unknown message type: ${message.type}`);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: 'Unknown message type'
                    }));
                }
            } catch (error) {
                logger.error('Error processing WebSocket message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Invalid message format'
                }));
            }
        });

        ws.on('close', async () => {
            if (ws.username) {
                onlineUsers.delete(ws.username);
                await messageService.setOnlineStatus(ws.username, false);
                broadcastOnlineUsers();
                logger.info(`User ${ws.username} disconnected`);
            }
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
        });
    });

    setInterval(() => {
        onlineUsers.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        });
    }, config.websocket.pingInterval);

    logger.info('📡 WebSocket server ready');
    
    return wss;
}

module.exports = { setupWebSocket };
