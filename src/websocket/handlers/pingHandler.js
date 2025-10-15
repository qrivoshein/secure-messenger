const messageService = require('../../services/message.service');

async function handlePing(ws, message, context) {
    if (ws.username) {
        await messageService.setOnlineStatus(ws.username, true);
    }
    ws.send(JSON.stringify({ type: 'pong' }));
}

module.exports = { handlePing };
