import messageService from '../../services/message.service';
import { ExtendedWebSocket, WebSocketMessage } from '../../types';

export async function handlePing(ws: ExtendedWebSocket, message: WebSocketMessage, context: any): Promise<void> {
    if (ws.username) {
        await messageService.setOnlineStatus(ws.username, true);
    }
    ws.send(JSON.stringify({ type: 'pong' }));
}
