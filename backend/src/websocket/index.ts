import WebSocket from 'ws';
import http from 'http';
import messageHandlers from './handlers';
import messageService from '../services/message.service';
import userController from '../controllers/user.controller';
import logger from '../utils/logger';
import config from '../config';
import { ExtendedWebSocket } from '../types';

export function setupWebSocket(server: http.Server): WebSocket.Server {
    const wss = new WebSocket.Server({ server });
    const onlineUsers = userController.onlineUsers;

    function broadcastOnlineUsers(): void {
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

    function broadcastNewUser(newUsername: string, userId: string): void {
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

    wss.on('connection', (ws: ExtendedWebSocket) => {
        ws.on('message', async (data: WebSocket.Data) => {
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
            } catch (error: any) {
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
