import rateLimit from 'express-rate-limit';
import config from '../config';

export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 200, // 200 запросов в минуту (было меньше)
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10, // 10 попыток (было 5)
    message: { error: 'Too many authentication attempts, please try again later' },
    skipSuccessfulRequests: true
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 30, // 30 файлов (было 10)
    message: { error: 'Too many file uploads, please try again later' }
});
