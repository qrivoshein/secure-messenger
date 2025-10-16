const pool = require('../database/postgres');
const logger = require('../utils/logger');

class UserService {
    async getActiveChats(username, onlineUsers) {
        const result = await pool.query(
            `SELECT DISTINCT 
                u.username, 
                u.user_id,
                (
                    SELECT m2.text 
                    FROM messages m2 
                    WHERE (m2.from_username = u.username AND m2.to_username = $1) 
                       OR (m2.from_username = $1 AND m2.to_username = u.username)
                    ORDER BY m2.created_at DESC 
                    LIMIT 1
                ) as last_message,
                (
                    SELECT m2.created_at
                    FROM messages m2 
                    WHERE (m2.from_username = u.username AND m2.to_username = $1) 
                       OR (m2.from_username = $1 AND m2.to_username = u.username)
                    ORDER BY m2.created_at DESC 
                    LIMIT 1
                ) as last_message_time
             FROM users u
             INNER JOIN messages m ON (m.from_username = u.username OR m.to_username = u.username)
             WHERE u.username != $1 
               AND (m.from_username = $1 OR m.to_username = $1)
             ORDER BY last_message_time DESC NULLS LAST`,
            [username]
        );

        return result.rows.map(row => {
            let timeStr = '';
            if (row.last_message_time) {
                const date = new Date(row.last_message_time);
                const now = new Date();
                
                // Конвертируем обе даты в московское время для сравнения
                const moscowDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
                const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
                
                const isToday = moscowDate.toDateString() === moscowNow.toDateString();
                
                if (isToday) {
                    // Форматируем время в московском часовом поясе
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
            
            return {
                username: row.username,
                userId: row.user_id,
                online: onlineUsers.has(row.username),
                avatar: row.username[0].toUpperCase(),
                lastMessage: row.last_message || '',
                time: timeStr
            };
        });
    }

    async searchUsers(username, query, onlineUsers) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchQuery = query.trim();
        
        // Search ONLY by userId (5 digits)
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
        }));
    }

    async getUserByUsername(username) {
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

module.exports = new UserService();
