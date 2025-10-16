import { Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { AuthRequest, ExtendedWebSocket } from '../types';

class UserController {
    public onlineUsers: Map<string, ExtendedWebSocket> = new Map();

    async getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const users = await userService.getActiveChats(req.user!.username, this.onlineUsers);
            res.json({ users });
        } catch (error) {
            next(error);
        }
    }

    async searchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = req.query.q as string;
            const users = await userService.searchUsers(req.user!.username, query, this.onlineUsers);
            res.json({ users });
        } catch (error) {
            next(error);
        }
    }
}

export default new UserController();
