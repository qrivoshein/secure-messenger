const { handleAuth } = require('./authHandler');
const { handleMessage, handleEditMessage, handleDeleteMessage, handleMarkRead } = require('./messageHandler');
const { handlePinMessage, handleUnpinMessage } = require('./pinHandler');
const { handleTyping } = require('./typingHandler');
const { handlePing } = require('./pingHandler');

const messageHandlers = {
    'auth': handleAuth,
    'message': handleMessage,
    'edit_message': handleEditMessage,
    'delete_message': handleDeleteMessage,
    'mark_read': handleMarkRead,
    'pin_message': handlePinMessage,
    'unpin_message': handleUnpinMessage,
    'typing': handleTyping,
    'ping': handlePing
};

module.exports = messageHandlers;
