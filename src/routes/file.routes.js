const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const { authenticate } = require('../middleware/auth');

router.get('/file/:filename', authenticate, fileController.getFile.bind(fileController));

module.exports = router;
