import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    if (err.name === 'ValidationError') {
        res.status(400).json({
            error: 'Validation error',
            details: err.message
        });
        return;
    }

    if (err.code === '23505') {
        res.status(409).json({ error: 'Duplicate entry' });
        return;
    }

    if (err.code === '23503') {
        res.status(404).json({ error: 'Referenced entity not found' });
        return;
    }

    const statusCode = err.statusCode || 500;
    const message = err.statusCode ? err.message : 'Internal server error';

    res.status(statusCode).json({ 
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({ error: 'Route not found' });
};
