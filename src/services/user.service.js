const pool = require('../database/postgres');
const logger = require('../utils/logger');

class UserService {
    async getActiveChats(username, onlineUsers) {
        const result = await pool.query(
            `SELECT DISTINCT u.username, u.user_id 
             FROM users u
             INNER JOIN messages m ON (m.from_username = u.username OR m.to_username = u.username)
             WHERE u.username != $1 
               AND (m.from_username = $1 OR m.to_username = $1)
             ORDER BY u.username`,
            [username]
        );

        return result.rows.map(row => ({
            username: row.username,
            userId: row.user_id,
            online: onlineUsers.has(row.username),
            avatar: row.username[0].toUpperCase()
        }));
    }

    async searchUsers(username, query, onlineUsers) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchQuery = query.trim();
        let result;
        
        if (searchQuery.includes('#')) {
            const [usernameSearch, userId] = searchQuery.split('#');
            result = await pool.query(
                `SELECT username, user_id FROM users 
                 WHERE username != $1 
                 AND LOWER(username) LIKE LOWER($2) 
                 AND user_id LIKE $3
                 LIMIT 20`,
                [username, `%${usernameSearch}%`, `%${userId}%`]
            );
        } else {
            result = await pool.query(
                `SELECT username, user_id FROM users 
                 WHERE username != $1 
                 AND (LOWER(username) LIKE LOWER($2) OR user_id LIKE $2)
                 LIMIT 20`,
                [username, `%${searchQuery}%`]
            );
        }

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
