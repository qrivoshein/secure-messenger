import WebSocket from 'ws';
import messageService from '../../services/message.service';
import logger from '../../utils/logger';
import { ExtendedWebSocket, WebSocketMessage } from '../../types';

interface WebSocketContext {
    onlineUsers: Map<string, ExtendedWebSocket>;
}

export async function handleMessage(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) {
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Not authenticated'
        }));
        return;
    }

    const { to, text, encrypted, iv, messageId, mediaType, mediaUrl, fileName, fileSize, forwarded, forwardedFrom, replyTo, replyToText, replyToSender } = message;
    const { onlineUsers } = context;
    
    const msgId = messageId || Date.now().toString();
    
    try {
        await messageService.saveMessage({
            messageId: msgId,
            from: ws.username,
            to,
            text,
            mediaType,
            mediaUrl,
            fileSize,
            forwarded,
            forwardedFrom,
            replyToMessageId: replyTo,
            replyToText,
            replyToSender
        });

        const msg = {
            id: msgId,
            from: ws.username,
            to,
            text,
            encrypted,
            iv,
            mediaType,
            mediaUrl,
            fileName,
            fileSize,
            forwarded: forwarded || false,
            forwardedFrom: forwardedFrom || null,
            replyTo: replyTo || null,
            replyToText: replyToText || null,
            replyToSender: replyToSender || null,
            read: false,
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };

        // Send confirmation to sender
        ws.send(JSON.stringify({
            type: 'message_sent',
            messageId: msg.id
        }));

        // Send the full message back to sender so they see it immediately
        ws.send(JSON.stringify({
            type: 'message',
            message: msg
        }));

        // Send message to recipient if online
        const recipientWs = onlineUsers.get(to);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
                type: 'message',
                message: msg
            }));
        }
    } catch (error: any) {
        logger.error(`Error sending message: ${error.message}`);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to send message'
        }));
    }
}

export async function handleEditMessage(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) return;
    
    const { messageId, newText, to } = message;
    const { onlineUsers } = context;
    
    try {
        await messageService.editMessage(messageId, ws.username, newText);
        
        const editRecipient = onlineUsers.get(to);
        if (editRecipient && editRecipient.readyState === WebSocket.OPEN) {
            editRecipient.send(JSON.stringify({
                type: 'message_edited',
                messageId,
                newText,
                from: ws.username
            }));
        }
    } catch (error: any) {
        logger.error(`Error editing message: ${error.message}`);
    }
}

export async function handleDeleteMessage(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) return;
    
    const { messageId, to } = message;
    const { onlineUsers } = context;
    
    try {
        await messageService.deleteMessage(messageId, ws.username);
        
        const deleteRecipient = onlineUsers.get(to);
        if (deleteRecipient && deleteRecipient.readyState === WebSocket.OPEN) {
            deleteRecipient.send(JSON.stringify({
                type: 'message_deleted',
                messageId,
                from: ws.username
            }));
        }
    } catch (error: any) {
        logger.error(`Error deleting message: ${error.message}`);
    }
}

export async function handleMarkRead(ws: ExtendedWebSocket, message: WebSocketMessage, context: WebSocketContext): Promise<void> {
    if (!ws.username) return;
    
    const { from } = message;
    const { onlineUsers } = context;
    
    try {
        const messageIds = await messageService.markMessagesAsRead(from, ws.username);
        
        if (messageIds.length > 0) {
            const senderWs = onlineUsers.get(from);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                senderWs.send(JSON.stringify({
                    type: 'messages_read',
                    messageIds,
                    by: ws.username
                }));
            }
        }
    } catch (error: any) {
        logger.error(`Error marking messages as read: ${error.message}`);
    }
}
