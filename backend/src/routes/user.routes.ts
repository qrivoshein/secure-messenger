import express from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { searchValidation } from '../middleware/validation';

const router = express.Router();

router.get('/users', authenticate, userController.getUsers.bind(userController));
router.get('/users/all', authenticate, userController.getAllUsers.bind(userController));
router.get('/search-users', authenticate, ...searchValidation, userController.searchUsers.bind(userController));

export default router;
