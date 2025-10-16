import pool from '../database/postgres';
import logger from '../utils/logger';
import { ExtendedWebSocket, ChatUser } from '../types';

class UserService {
    async getActiveChats(username: string, onlineUsers: Map<string, ExtendedWebSocket>): Promise<ChatUser[]> {
        const result = await pool.query(
            `WITH ranked_messages AS (
                SELECT DISTINCT ON (u.username)
                    u.username, 
                    u.user_id,
                    COALESCE(m.text, '') as last_message,
                    m.media_type,
                    m.created_at as last_message_time
                FROM users u
                INNER JOIN messages m ON 
                    (m.from_username = u.username AND m.to_username = $1) OR
                    (m.from_username = $1 AND m.to_username = u.username)
                WHERE u.username != $1
                ORDER BY u.username, m.created_at DESC
            ),
            unread_counts AS (
                SELECT 
                    m.from_username,
                    COUNT(*) as unread_count
                FROM messages m
                WHERE m.to_username = $1
                AND NOT EXISTS (
                    SELECT 1 FROM read_receipts rr 
                    WHERE rr.message_id = m.message_id 
                    AND rr.username = $1
                )
                GROUP BY m.from_username
            )
            SELECT 
                rm.*,
                COALESCE(uc.unread_count, 0) as unread_count
            FROM ranked_messages rm
            LEFT JOIN unread_counts uc ON rm.username = uc.from_username
            ORDER BY rm.last_message_time DESC`,
            [username]
        );

        return result.rows.map(row => {
            let timeStr = '';
            if (row.last_message_time) {
                const date = new Date(row.last_message_time);
                const now = new Date();
                
                const moscowDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
                const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
                
                const isToday = moscowDate.toDateString() === moscowNow.toDateString();
                
                if (isToday) {
                    timeStr = date.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'Europe/Moscow'
                    });
                } else {
                    timeStr = date.toLocaleDateString('ru-RU', { 
                        day: '2-digit', 
                        month: '2-digit',
                        timeZone: 'Europe/Moscow'
                    });
                }
            }
            
            // Show [Медиа] for media messages
            let lastMessageText = row.last_message || '';
            if (row.media_type && !lastMessageText) {
                lastMessageText = '[Медиа]';
            }
            
            return {
                username: row.username,
                userId: row.user_id,
                online: onlineUsers.has(row.username),
                avatar: row.username[0].toUpperCase(),
                lastMessage: lastMessageText,
                time: timeStr,
                unreadCount: parseInt(row.unread_count) || 0
            } as any;
        });
    }

    async searchUsers(username: string, query: string, onlineUsers: Map<string, ExtendedWebSocket>): Promise<ChatUser[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchQuery = query.trim();
        
        const result = await pool.query(
            `SELECT username, user_id FROM users 
             WHERE username != $1 
             AND user_id LIKE $2
             LIMIT 20`,
            [username, `%${searchQuery}%`]
        );

        return result.rows.map(row => ({
            username: row.username,
            userId: row.user_id,
            online: onlineUsers.has(row.username),
            avatar: row.username[0].toUpperCase()
        } as any));
    }

    async getAllUsers(username: string, onlineUsers: Map<string, ExtendedWebSocket>): Promise<ChatUser[]> {
        const result = await pool.query(
            `SELECT username, user_id FROM users 
             WHERE username != $1 
             ORDER BY username ASC`,
            [username]
        );

        return result.rows.map(row => ({
            username: row.username,
            userId: row.user_id,
            online: onlineUsers.has(row.username),
            avatar: row.username[0].toUpperCase()
        } as any));
    }

    async getUserByUsername(username: string): Promise<{ username: string; user_id: string }> {
        const result = await pool.query(
            'SELECT username, user_id FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            throw new Error('USER_NOT_FOUND');
        }

        return result.rows[0];
    }
}

export default new UserService();
