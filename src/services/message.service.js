const pool = require('../database/postgres');
const { redisClient } = require('../database/redis');
const config = require('../config');
const logger = require('../utils/logger');

class MessageService {
    async getMessages(username, otherUser) {
        const result = await pool.query(
            `SELECT m.*, 
             EXISTS(SELECT 1 FROM read_receipts WHERE message_id = m.message_id AND username = $2) as read
             FROM messages m 
             WHERE (from_username = $1 AND to_username = $2) 
                OR (from_username = $2 AND to_username = $1)
             ORDER BY created_at ASC`,
            [username, otherUser]
        );

        return result.rows.map(row => ({
            id: row.message_id,
            from: row.from_username,
            to: row.to_username,
            text: row.text,
            mediaType: row.media_type,
            mediaUrl: row.media_url,
            fileName: row.text,
            fileSize: row.media_size,
            forwarded: row.forwarded,
            forwardedFrom: row.forwarded_from,
            read: row.read,
            edited: !!row.edited_at,
            timestamp: row.created_at,
            time: new Date(row.created_at).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        }));
    }

    async saveMessage(messageData) {
        const { messageId, from, to, text, mediaType, mediaUrl, fileSize, forwarded, forwardedFrom } = messageData;
        
        await pool.query(
            `INSERT INTO messages (message_id, from_username, to_username, text, media_type, media_url, media_size, forwarded, forwarded_from)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [messageId, from, to, text, mediaType, mediaUrl, fileSize, forwarded || false, forwardedFrom || null]
        );

        logger.debug(`Message saved: ${messageId} from ${from} to ${to}`);
    }

    async editMessage(messageId, username, newText) {
        const result = await pool.query(
            `UPDATE messages SET text = $1, edited_at = CURRENT_TIMESTAMP
             WHERE message_id = $2 AND from_username = $3
             RETURNING *`,
            [newText, messageId, username]
        );

        if (result.rows.length === 0) {
            throw new Error('MESSAGE_NOT_FOUND');
        }

        logger.debug(`Message edited: ${messageId}`);
        return result.rows[0];
    }

    async deleteMessage(messageId, username) {
        const result = await pool.query(
            'DELETE FROM messages WHERE message_id = $1 AND from_username = $2 RETURNING *',
            [messageId, username]
        );

        if (result.rows.length === 0) {
            throw new Error('MESSAGE_NOT_FOUND');
        }

        logger.debug(`Message deleted: ${messageId}`);
        return result.rows[0];
    }

    async markMessagesAsRead(from, to) {
        const unreadMessages = await pool.query(
            `SELECT message_id FROM messages 
             WHERE from_username = $1 AND to_username = $2
             AND NOT EXISTS (SELECT 1 FROM read_receipts WHERE message_id = messages.message_id AND username = $2)`,
            [from, to]
        );
        
        for (const row of unreadMessages.rows) {
            await pool.query(
                'INSERT INTO read_receipts (message_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [row.message_id, to]
            );
        }

        return unreadMessages.rows.map(r => r.message_id);
    }

    async pinMessage(username, otherUser, messageId, messageText) {
        const chatId = [username, otherUser].sort().join('_');
        
        await pool.query(
            `INSERT INTO pinned_messages (chat_id, message_id, message_text, pinned_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (chat_id) DO UPDATE SET message_id = $2, message_text = $3, pinned_by = $4`,
            [chatId, messageId, messageText, username]
        );

        logger.debug(`Message pinned in chat ${chatId}: ${messageId}`);
    }

    async unpinMessage(username, otherUser) {
        const chatId = [username, otherUser].sort().join('_');
        
        await pool.query('DELETE FROM pinned_messages WHERE chat_id = $1', [chatId]);

        logger.debug(`Message unpinned in chat ${chatId}`);
    }

    async getPinnedMessages(username) {
        const result = await pool.query(
            `SELECT pm.* FROM pinned_messages pm
             WHERE chat_id LIKE $1 OR chat_id LIKE $2`,
            [`%${username}%`, `%${username}%`]
        );
        
        const pinnedMessages = {};
        result.rows.forEach(row => {
            pinnedMessages[row.chat_id] = {
                messageId: row.message_id,
                messageText: row.message_text,
                pinnedBy: row.pinned_by
            };
        });

        return pinnedMessages;
    }

    async setTypingStatus(from, to, isTyping) {
        await redisClient.setEx(
            `typing:${from}:${to}`,
            config.websocket.typingStatusTTL,
            isTyping ? '1' : '0'
        );
    }

    async setOnlineStatus(username, isOnline) {
        if (isOnline) {
            await redisClient.setEx(`online:${username}`, config.websocket.onlineStatusTTL, '1');
        } else {
            await redisClient.del(`online:${username}`);
        }
    }
}

module.exports = new MessageService();
