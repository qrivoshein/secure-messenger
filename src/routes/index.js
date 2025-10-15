const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const messageRoutes = require('./message.routes');

router.use('/api', authRoutes);
router.use('/api', userRoutes);
router.use('/api', messageRoutes);

module.exports = router;
