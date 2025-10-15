const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, registerValidation, authController.register.bind(authController));
router.post('/login', authLimiter, loginValidation, authController.login.bind(authController));
router.get('/verify', authenticate, authController.verify.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

module.exports = router;
