const authService = require('../services/auth.service');
const logger = require('../utils/logger');

class AuthController {
    async register(req, res, next) {
        try {
            const { username, password } = req.body;
            const result = await authService.register(username, password);
            
            const userController = require('./user.controller');
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
        } catch (error) {
            if (error.message === 'USER_EXISTS') {
                return res.status(409).json({ error: 'User already exists' });
            }
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { username, password } = req.body;
            const result = await authService.login(username, password);
            
            res.json({ 
                success: true, 
                token: result.token,
                username: result.username,
                userId: result.userId
            });
        } catch (error) {
            if (error.message === 'INVALID_CREDENTIALS') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            next(error);
        }
    }

    async verify(req, res, next) {
        try {
            res.json({ 
                success: true, 
                username: req.user.username,
                userId: req.user.userId
            });
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            await authService.logout(req.token);
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
