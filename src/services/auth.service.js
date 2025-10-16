const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../database/postgres');
const { redisClient } = require('../database/redis');
const config = require('../config');
const logger = require('../utils/logger');

class AuthService {
    async hashPassword(password) {
        return bcrypt.hash(password, config.auth.bcryptRounds);
    }

    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    generateToken() {
        return crypto.randomBytes(config.auth.tokenLength).toString('hex');
    }

    async generateUserId() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            // Генерируем случайное 5-значное число (10000-99999)
            const userId = String(Math.floor(Math.random() * 90000) + 10000);
            
            // Проверяем что такого ID еще нет
            const result = await pool.query('SELECT id FROM users WHERE user_id = $1', [userId]);
            
            if (result.rows.length === 0) {
                return userId;
            }
            
            attempts++;
        }
        
        // Если не нашли свободный ID за 100 попыток (что практически невозможно), 
        // используем timestamp
        const fallbackId = String(Date.now()).slice(-5);
        logger.warn(`Failed to generate unique userId after ${maxAttempts} attempts, using fallback: ${fallbackId}`);
        return fallbackId;
    }

    async register(username, password) {
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        
        if (existingUser.rows.length > 0) {
            throw new Error('USER_EXISTS');
        }

        const hashedPassword = await this.hashPassword(password);
        const userId = await this.generateUserId();
        
        await pool.query(
            'INSERT INTO users (username, password_hash, user_id) VALUES ($1, $2, $3)',
            [username, hashedPassword, userId]
        );
        
        logger.info(`User registered: ${username}#${userId}`);
        
        return { username, userId };
    }

    async login(username, password) {
        const result = await pool.query(
            'SELECT password_hash, user_id FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const user = result.rows[0];
        const isValidPassword = await this.comparePassword(password, user.password_hash);
        
        if (!isValidPassword) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const token = this.generateToken();
        
        await redisClient.setEx(
            `session:${token}`,
            config.auth.sessionTTL,
            JSON.stringify({ username, loginTime: Date.now() })
        );

        logger.info(`User logged in: ${username}#${user.user_id}`);

        return { token, username, userId: user.user_id };
    }

    async verifyToken(token) {
        const sessionData = await redisClient.get(`session:${token}`);
        
        if (!sessionData) {
            throw new Error('INVALID_TOKEN');
        }

        const session = JSON.parse(sessionData);
        const result = await pool.query('SELECT user_id FROM users WHERE username = $1', [session.username]);
        
        if (result.rows.length === 0) {
            throw new Error('USER_NOT_FOUND');
        }

        return { username: session.username, userId: result.rows[0].user_id };
    }

    async logout(token) {
        await redisClient.del(`session:${token}`);
        logger.debug(`Session deleted: ${token.substring(0, 8)}...`);
    }
}

module.exports = new AuthService();
