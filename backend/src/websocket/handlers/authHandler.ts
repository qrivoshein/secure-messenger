import authService from '../../services/auth.service';
import messageService from '../../services/message.service';
import logger from '../../utils/logger';
import { ExtendedWebSocket, WebSocketMessage } from '../../types';

interface WebSocketContext {
    onlineUsers: Map<string, ExtendedWebSocket>;
    broadcastOnlineUsers: () => void;
    broadcastNewUser: (username: string, userId: string) => void;
}

export async function handleAuth(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    const { token } = message;
    const { onlineUsers } = context;
    
    try {
        const user = await authService.verifyToken(token);
        
        ws.username = user.username;
        (ws as any).token = token;
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
    } catch (error: any) {
        logger.warn(`WebSocket auth failed: ${error.message}`);
        ws.send(JSON.stringify({
            type: 'auth_error',
            error: 'Invalid token'
        }));
        ws.close();
    }
}
