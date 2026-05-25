import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../database/postgres';
import { redisClient } from '../database/redis';
import config from '../config';
import logger from '../utils/logger';

class AuthService {
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, config.auth.bcryptRounds);
    }

    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    generateToken(): string {
        return crypto.randomBytes(config.auth.tokenLength).toString('hex');
    }

    async generateUserId(): Promise<string> {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            const userId = String(Math.floor(Math.random() * 90000) + 10000);
            
            const result = await pool.query('SELECT id FROM users WHERE user_id = $1', [userId]);
            
            if (result.rows.length === 0) {
                return userId;
            }
            
            attempts++;
        }
        
        const fallbackId = String(Date.now()).slice(-5);
        logger.warn(`Failed to generate unique userId after ${maxAttempts} attempts, using fallback: ${fallbackId}`);
        return fallbackId;
    }

    async register(
        username: string,
        password: string,
        publicKey?: string
    ): Promise<{ username: string; userId: string }> {
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

        if (existingUser.rows.length > 0) {
            throw new Error('USER_EXISTS');
        }

        const hashedPassword = await this.hashPassword(password);
        const userId = await this.generateUserId();

        await pool.query(
            `INSERT INTO users (username, password_hash, user_id, public_key, public_key_updated_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                username,
                hashedPassword,
                userId,
                publicKey ?? null,
                publicKey ? new Date() : null,
            ]
        );

        logger.info(`User registered: ${username}#${userId}${publicKey ? ' (with E2E key)' : ''}`);

        return { username, userId };
    }

    /**
     * Сохраняет / обновляет публичный ECDH-ключ пользователя.
     * Используется при первом запуске клиента, ротации ключей (раз в 90 дней)
     * или восстановлении пары ключей на новом устройстве.
     */
    async updatePublicKey(username: string, publicKey: string): Promise<void> {
        const result = await pool.query(
            `UPDATE users
             SET public_key = $2,
                 public_key_updated_at = CURRENT_TIMESTAMP
             WHERE username = $1`,
            [username, publicKey]
        );
        if (result.rowCount === 0) {
            throw new Error('USER_NOT_FOUND');
        }
        logger.info(`Public ECDH key updated for ${username}`);
    }

    /**
     * Возвращает публичный ECDH-ключ пользователя (для вычисления общего ключа
     * пары собеседников через crypto.subtle.deriveKey на стороне клиента).
     * Сам сервер не вычисляет и не хранит общий симметричный ключ.
     */
    async getPublicKey(
        username: string
    ): Promise<{ publicKey: string; updatedAt: Date | null }> {
        const result = await pool.query(
            'SELECT public_key, public_key_updated_at FROM users WHERE username = $1',
            [username]
        );
        if (result.rows.length === 0) {
            throw new Error('USER_NOT_FOUND');
        }
        const row = result.rows[0];
        if (!row.public_key) {
            throw new Error('PUBLIC_KEY_NOT_SET');
        }
        return {
            publicKey: row.public_key,
            updatedAt: row.public_key_updated_at,
        };
    }

    async login(username: string, password: string): Promise<{ token: string; username: string; userId: string }> {
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

    async verifyToken(token: string): Promise<{ username: string; userId: string }> {
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

    async logout(token: string): Promise<void> {
        await redisClient.del(`session:${token}`);
        logger.debug(`Session deleted: ${token.substring(0, 8)}...`);
    }
}

export default new AuthService();
