import WebSocket from 'ws';
import messageService from '../../services/message.service';
import logger from '../../utils/logger';
import { ExtendedWebSocket, WebSocketMessage } from '../../types';

interface WebSocketContext {
    onlineUsers: Map<string, ExtendedWebSocket>;
}

export async function handlePinMessage(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) return;
    
    const { to, messageId, messageText } = message;
    const { onlineUsers } = context;
    
    try {
        await messageService.pinMessage(ws.username, to, messageId, messageText);
        
        const pinRecipient = onlineUsers.get(to);
        if (pinRecipient && pinRecipient.readyState === WebSocket.OPEN) {
            pinRecipient.send(JSON.stringify({
                type: 'message_pinned',
                from: ws.username,
                messageId,
                messageText
            }));
        }
    } catch (error: any) {
        logger.error(`Error pinning message: ${error.message}`);
    }
}

export async function handleUnpinMessage(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) return;
    
    const { to } = message;
    const { onlineUsers } = context;
    
    try {
        await messageService.unpinMessage(ws.username, to);
        
        const unpinRecipient = onlineUsers.get(to);
        if (unpinRecipient && unpinRecipient.readyState === WebSocket.OPEN) {
            unpinRecipient.send(JSON.stringify({
                type: 'message_unpinned',
                from: ws.username
            }));
        }
    } catch (error: any) {
        logger.error(`Error unpinning message: ${error.message}`);
    }
}
