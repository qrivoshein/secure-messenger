import pool from '../database/postgres';
import { redisClient } from '../database/redis';
import config from '../config';
import logger from '../utils/logger';
import { Message } from '../types';

interface MessageData {
    messageId: string;
    from: string;
    to: string;
    text: string;
    mediaType?: string;
    mediaUrl?: string;
    fileSize?: number;
    duration?: string;
    waveformData?: number[];
    forwarded?: boolean;
    forwardedFrom?: string;
    replyToMessageId?: string;
    replyToText?: string;
    replyToSender?: string;
}

class MessageService {
    async getMessages(username: string, otherUser: string): Promise<any[]> {
        const result = await pool.query(
            `SELECT m.*, 
             EXISTS(SELECT 1 FROM read_receipts WHERE message_id = m.message_id AND username = $2) as read
             FROM messages m 
             WHERE (from_username = $1 AND to_username = $2) 
                OR (from_username = $2 AND to_username = $1)
             ORDER BY created_at ASC`,
            [username, otherUser]
        );

        return result.rows.map(row => {
            const message: any = {
                id: row.message_id,
                from: row.from_username,
                to: row.to_username,
                text: row.text,
                mediaType: row.media_type,
                mediaUrl: row.media_url,
                fileName: row.text,
                fileSize: row.media_size,
                duration: row.duration,
                waveformData: row.waveform_data,
                forwarded: row.forwarded,
                forwardedFrom: row.forwarded_from,
                read: row.read,
                edited: !!row.edited_at,
                timestamp: row.created_at,
                time: new Date(row.created_at).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'Europe/Moscow'
                })
            };

            // Add replyTo as nested object if exists
            if (row.reply_to_message_id) {
                message.replyTo = {
                    id: row.reply_to_message_id,
                    from: row.reply_to_sender,
                    text: row.reply_to_text || ''
                };
            }

            return message;
        });
    }

    async saveMessage(messageData: MessageData): Promise<void> {
        const { 
            messageId, from, to, text, mediaType, mediaUrl, fileSize, duration, waveformData,
            forwarded, forwardedFrom, replyToMessageId, replyToText, replyToSender 
        } = messageData;
        
        await pool.query(
            `INSERT INTO messages (message_id, from_username, to_username, text, media_type, media_url, media_size, duration, waveform_data, forwarded, forwarded_from, reply_to_message_id, reply_to_text, reply_to_sender)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                messageId, from, to, text, mediaType, mediaUrl, fileSize,
                duration || null,
                waveformData ? JSON.stringify(waveformData) : null,
                forwarded || false, forwardedFrom || null, 
                replyToMessageId || null, replyToText || null, replyToSender || null
            ]
        );

        logger.debug(`Message saved: ${messageId} from ${from} to ${to}`);
    }

    async editMessage(messageId: string, username: string, newText: string): Promise<any> {
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

    async deleteMessage(messageId: string, username: string): Promise<any> {
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

    async markMessagesAsRead(from: string, to: string): Promise<string[]> {
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

    async pinMessage(username: string, otherUser: string, messageId: string, messageText: string): Promise<void> {
        const chatId = [username, otherUser].sort().join('_');
        
        await pool.query(
            `INSERT INTO pinned_messages (chat_id, message_id, message_text, pinned_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (chat_id) DO UPDATE SET message_id = $2, message_text = $3, pinned_by = $4`,
            [chatId, messageId, messageText, username]
        );

        logger.debug(`Message pinned in chat ${chatId}: ${messageId}`);
    }

    async unpinMessage(username: string, otherUser: string): Promise<void> {
        const chatId = [username, otherUser].sort().join('_');
        
        await pool.query('DELETE FROM pinned_messages WHERE chat_id = $1', [chatId]);

        logger.debug(`Message unpinned in chat ${chatId}`);
    }

    async getPinnedMessages(username: string): Promise<Record<string, any>> {
        const result = await pool.query(
            `SELECT pm.* FROM pinned_messages pm
             WHERE chat_id LIKE $1 OR chat_id LIKE $2`,
            [`%${username}%`, `%${username}%`]
        );
        
        const pinnedMessages: Record<string, any> = {};
        result.rows.forEach(row => {
            pinnedMessages[row.chat_id] = {
                messageId: row.message_id,
                messageText: row.message_text,
                pinnedBy: row.pinned_by
            };
        });

        return pinnedMessages;
    }

    async setTypingStatus(from: string, to: string, isTyping: boolean): Promise<void> {
        await redisClient.setEx(
            `typing:${from}:${to}`,
            config.websocket.typingStatusTTL,
            isTyping ? '1' : '0'
        );
    }

    async setOnlineStatus(username: string, isOnline: boolean): Promise<void> {
        if (isOnline) {
            await redisClient.setEx(`online:${username}`, config.websocket.onlineStatusTTL, '1');
        } else {
            await redisClient.del(`online:${username}`);
        }
    }
}

export default new MessageService();
