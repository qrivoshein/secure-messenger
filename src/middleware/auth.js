const authService = require('../services/auth.service');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const user = await authService.verifyToken(token);
        req.user = user;
        req.token = token;
        
        next();
    } catch (error) {
        logger.debug(`Authentication failed: ${error.message}`);
        
        if (error.message === 'INVALID_TOKEN') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        if (error.message === 'USER_NOT_FOUND') {
            return res.status(401).json({ error: 'User not found' });
        }
        
        return res.status(500).json({ error: 'Authentication error' });
    }
};

module.exports = { authenticate };
