const authService = require('../../services/auth.service');
const messageService = require('../../services/message.service');
const logger = require('../../utils/logger');

async function handleAuth(ws, message, context) {
    const { token } = message;
    const { onlineUsers } = context;
    
    try {
        const user = await authService.verifyToken(token);
        
        ws.username = user.username;
        ws.token = token;
        onlineUsers.set(user.username, ws);
        
        await messageService.setOnlineStatus(user.username, true);
        
        ws.send(JSON.stringify({
            type: 'auth_success',
            username: user.username
        }));

        const pinnedMessages = await messageService.getPinnedMessages(user.username);
        
        if (Object.keys(pinnedMessages).length > 0) {
            ws.send(JSON.stringify({
                type: 'pinned_messages_sync',
                pinnedMessages
            }));
        }

        context.broadcastOnlineUsers();
        logger.info(`User ${user.username} connected via WebSocket`);
    } catch (error) {
        logger.warn(`WebSocket auth failed: ${error.message}`);
        ws.send(JSON.stringify({
            type: 'auth_error',
            error: 'Invalid token'
        }));
        ws.close();
    }
}

module.exports = { handleAuth };
