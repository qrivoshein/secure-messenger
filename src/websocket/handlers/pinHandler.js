const WebSocket = require('ws');
const messageService = require('../../services/message.service');
const logger = require('../../utils/logger');

async function handlePinMessage(ws, message, context) {
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
    } catch (error) {
        logger.error(`Error pinning message: ${error.message}`);
    }
}

async function handleUnpinMessage(ws, message, context) {
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
    } catch (error) {
        logger.error(`Error unpinning message: ${error.message}`);
    }
}

module.exports = {
    handlePinMessage,
    handleUnpinMessage
};
