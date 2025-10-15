const userService = require('../services/user.service');

class UserController {
    constructor() {
        this.onlineUsers = new Map();
    }

    async getUsers(req, res, next) {
        try {
            const users = await userService.getActiveChats(req.user.username, this.onlineUsers);
            res.json({ users });
        } catch (error) {
            next(error);
        }
    }

    async searchUsers(req, res, next) {
        try {
            const query = req.query.q;
            const users = await userService.searchUsers(req.user.username, query, this.onlineUsers);
            res.json({ users });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
