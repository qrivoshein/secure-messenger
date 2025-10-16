import WebSocket from 'ws';
import messageService from '../../services/message.service';
import { ExtendedWebSocket, WebSocketMessage } from '../../types';

interface WebSocketContext {
    onlineUsers: Map<string, ExtendedWebSocket>;
}

export async function handleTyping(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) return;
    
    const { to, isTyping } = message;
    const { onlineUsers } = context;
    
    await messageService.setTypingStatus(ws.username, to, isTyping);
    
    const typingRecipient = onlineUsers.get(to);
    if (typingRecipient && typingRecipient.readyState === WebSocket.OPEN) {
        typingRecipient.send(JSON.stringify({
            type: 'typing',
            from: ws.username,
            isTyping
        }));
    }
}
