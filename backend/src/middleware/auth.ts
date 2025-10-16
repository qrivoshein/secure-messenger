import { Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import logger from '../utils/logger';
import { AuthRequest } from '../types';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const user = await authService.verifyToken(token);
        req.user = user;
        (req as any).token = token;
        
        next();
    } catch (error: any) {
        logger.debug(`Authentication failed: ${error.message}`);
        
        if (error.message === 'INVALID_TOKEN') {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        
        if (error.message === 'USER_NOT_FOUND') {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        
        res.status(500).json({ error: 'Authentication error' });
    }
};
