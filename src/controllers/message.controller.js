const messageService = require('../services/message.service');

class MessageController {
    async getMessages(req, res, next) {
        try {
            const { otherUser } = req.params;
            const messages = await messageService.getMessages(req.user.username, otherUser);
            res.json({ messages });
        } catch (error) {
            next(error);
        }
    }

    async uploadFile(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const fileUrl = `/uploads/${req.file.filename}`;
            const fileInfo = {
                url: fileUrl,
                name: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype
            };

            res.json({ success: true, file: fileInfo });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MessageController();
