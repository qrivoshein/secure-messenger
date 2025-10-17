import { handleAuth } from './authHandler';
import { handleMessage, handleEditMessage, handleDeleteMessage, handleDeleteMessageForMe, handleMarkRead } from './messageHandler';
import { handlePinMessage, handleUnpinMessage } from './pinHandler';
import { handleTyping } from './typingHandler';
import { handlePing } from './pingHandler';

const messageHandlers: Record<string, any> = {
    'auth': handleAuth,
    'message': handleMessage,
    'edit_message': handleEditMessage,
    'delete_message': handleDeleteMessage,
    'delete_message_for_me': handleDeleteMessageForMe,
    'mark_read': handleMarkRead,
    'pin_message': handlePinMessage,
    'unpin_message': handleUnpinMessage,
    'typing': handleTyping,
    'ping': handlePing
};

export default messageHandlers;
