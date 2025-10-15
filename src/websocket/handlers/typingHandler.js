const WebSocket = require('ws');
const messageService = require('../../services/message.service');

async function handleTyping(ws, message, context) {
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

module.exports = { handleTyping };
