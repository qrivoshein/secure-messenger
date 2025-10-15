const rateLimit = require('express-rate-limit');
const config = require('../config');

const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many authentication attempts, please try again later' },
    skipSuccessfulRequests: true
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many file uploads, please try again later' }
});

module.exports = { generalLimiter, authLimiter, uploadLimiter };
