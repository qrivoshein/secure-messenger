import { Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import logger from '../utils/logger';
import { AuthRequest } from '../types';
import userController from './user.controller';

class AuthController {
    async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, password, publicKey } = req.body;
            const result = await authService.register(username, password, publicKey);

            userController.onlineUsers.forEach((ws, user) => {
                if (ws.readyState === 1 && user !== username) {
                    ws.send(JSON.stringify({
                        type: 'new_user',
                        username,
                        userId: result.userId
                    }));
                }
            });

            res.json({
                success: true,
                message: 'User registered successfully',
                userId: result.userId
            });
        } catch (error: any) {
            if (error.message === 'USER_EXISTS') {
                res.status(409).json({ error: 'User already exists' });
                return;
            }
            next(error);
        }
    }

    /**
     * Загружает / обновляет публичный ECDH-ключ текущего пользователя.
     * Тело: { publicKey: string }  (JWK-сериализация публичной части пары P-256)
     */
    async setPublicKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { publicKey } = req.body;
            if (!publicKey || typeof publicKey !== 'string' || publicKey.length > 4096) {
                res.status(400).json({ error: 'Invalid publicKey' });
                return;
            }
            await authService.updatePublicKey(req.user!.username, publicKey);
            res.json({ success: true });
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            next(error);
        }
    }

    /**
     * Возвращает публичный ECDH-ключ собеседника по username.
     * Клиент использует его в crypto.subtle.deriveKey() для вычисления
     * общего ключа пары собеседников.
     */
    async getPublicKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username } = req.params;
            if (!username) {
                res.status(400).json({ error: 'username required' });
                return;
            }
            const result = await authService.getPublicKey(username);
            res.json({
                username,
                publicKey: result.publicKey,
                updatedAt: result.updatedAt,
            });
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            if (error.message === 'PUBLIC_KEY_NOT_SET') {
                res.status(404).json({ error: 'Public key not set for this user' });
                return;
            }
            next(error);
        }
    }

    async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, password } = req.body;
            const result = await authService.login(username, password);
            
            res.json({ 
                success: true, 
                token: result.token,
                username: result.username,
                userId: result.userId
            });
        } catch (error: any) {
            if (error.message === 'INVALID_CREDENTIALS') {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            next(error);
        }
    }

    async verify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            res.json({ 
                success: true, 
                username: req.user!.username,
                userId: req.user!.userId
            });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await authService.logout((req as any).token);
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
