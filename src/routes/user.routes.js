const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { searchValidation } = require('../middleware/validation');

router.get('/users', authenticate, userController.getUsers.bind(userController));
router.get('/search-users', authenticate, searchValidation, userController.searchUsers.bind(userController));

module.exports = router;
