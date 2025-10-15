const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('.'));

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

const DATA_FILE = path.join(__dirname, 'data.json');

let users = new Map();
const sessions = new Map();
const messages = new Map();
const onlineUsers = new Map();
const pinnedMessages = new Map();

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = new Map(Object.entries(data.users || {}));
            if (data.pinnedMessages) {
                Object.entries(data.pinnedMessages).forEach(([chatId, pinData]) => {
                    pinnedMessages.set(chatId, pinData);
                });
            }
            
            // Migrate existing users without userId
            let migrated = 0;
            for (const [username, userData] of users.entries()) {
                if (!userData.userId) {
                    userData.userId = generateUserId();
                    migrated++;
                }
            }
            
            if (migrated > 0) {
                console.log(`Migrated ${migrated} users with new IDs`);
                saveData();
            }
            
            console.log(`Loaded ${users.size} users from disk`);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        const data = {
            users: Object.fromEntries(users),
            pinnedMessages: Object.fromEntries(pinnedMessages)
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

loadData();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function generateUserId() {
    // Generate unique 4-digit ID
    let userId;
    let attempts = 0;
    const maxAttempts = 10000;
    
    do {
        userId = String(Math.floor(1000 + Math.random() * 9000));
        attempts++;
        
        if (attempts >= maxAttempts) {
            // If we've tried 10000 times, just use timestamp
            userId = String(Date.now()).slice(-4);
            break;
        }
        
        // Check if this ID is already used
        let isUsed = false;
        for (const [username, userData] of users.entries()) {
            if (userData.userId === userId) {
                isUsed = true;
                break;
            }
        }
        
        if (!isUsed) break;
    } while (true);
    
    return userId;
}

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (users.has(username)) {
        return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = hashPassword(password);
    const userId = generateUserId();
    
    users.set(username, {
        password: hashedPassword,
        userId: userId,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    
    // Notify all online users about the new user
    broadcastNewUser(username, userId);

    res.json({ success: true, message: 'User registered successfully', userId: userId });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.get(username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken();
    sessions.set(token, { username, loginTime: Date.now() });

    res.json({ success: true, token, username, userId: user.userId });
});

app.get('/api/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);

    if (!session) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const user = users.get(session.username);
    res.json({ success: true, username: session.username, userId: user?.userId });
});

app.get('/api/users', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const usersList = Array.from(users.entries())
        .filter(([username]) => username !== session.username)
        .map(([username, userData]) => ({
            username,
            userId: userData.userId,
            online: onlineUsers.has(username),
            avatar: username[0].toUpperCase()
        }));

    res.json({ users: usersList });
});

app.get('/api/messages/:otherUser', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { otherUser } = req.params;
    const chatId = [session.username, otherUser].sort().join('_');
    const chatMessages = messages.get(chatId) || [];

    res.json({ messages: chatMessages });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(token);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

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
});

wss.on('connection', (ws, req) => {
    let username = null;
    let token = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
                case 'auth':
                    token = message.token;
                    const session = sessions.get(token);
                    
                    if (session) {
                        username = session.username;
                        onlineUsers.set(username, ws);
                        
                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            username
                        }));

                        // Send pinned messages info
                        const userPinnedMessages = {};
                        pinnedMessages.forEach((pinData, chatId) => {
                            if (chatId.includes(username)) {
                                userPinnedMessages[chatId] = pinData;
                            }
                        });
                        
                        if (Object.keys(userPinnedMessages).length > 0) {
                            ws.send(JSON.stringify({
                                type: 'pinned_messages_sync',
                                pinnedMessages: userPinnedMessages
                            }));
                        }

                        broadcastOnlineUsers();
                        console.log(`User ${username} connected`);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'auth_error',
                            error: 'Invalid token'
                        }));
                        ws.close();
                    }
                    break;

                case 'message':
                    if (!username) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Not authenticated'
                        }));
                        return;
                    }

                    const { to, text, encrypted, iv, messageId, mediaType, mediaUrl, fileName, fileSize, forwarded, forwardedFrom } = message;
                    const chatId = [username, to].sort().join('_');
                    
                    const msg = {
                        id: messageId || Date.now().toString(),
                        from: username,
                        to,
                        text,
                        encrypted,
                        iv,
                        mediaType,
                        mediaUrl,
                        fileName,
                        fileSize,
                        forwarded: forwarded || false,
                        forwardedFrom: forwardedFrom || null,
                        read: false,
                        timestamp: new Date().toISOString(),
                        time: new Date().toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })
                    };

                    if (!messages.has(chatId)) {
                        messages.set(chatId, []);
                    }
                    messages.get(chatId).push(msg);

                    ws.send(JSON.stringify({
                        type: 'message_sent',
                        messageId: msg.id
                    }));

                    const recipientWs = onlineUsers.get(to);
                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify({
                            type: 'message',
                            message: msg
                        }));
                    }
                    break;

                case 'edit_message':
                    if (!username) return;
                    
                    const { messageId: editId, newText, to: editTo } = message;
                    const editChatId = [username, editTo].sort().join('_');
                    
                    if (messages.has(editChatId)) {
                        const chatMessages = messages.get(editChatId);
                        const msgToEdit = chatMessages.find(m => m.id === editId && m.from === username);
                        
                        if (msgToEdit) {
                            msgToEdit.text = newText;
                            msgToEdit.edited = true;
                            
                            // Notify recipient
                            const editRecipient = onlineUsers.get(editTo);
                            if (editRecipient && editRecipient.readyState === WebSocket.OPEN) {
                                editRecipient.send(JSON.stringify({
                                    type: 'message_edited',
                                    messageId: editId,
                                    newText: newText,
                                    from: username
                                }));
                            }
                        }
                    }
                    break;

                case 'delete_message':
                    if (!username) return;
                    
                    const { messageId: deleteId, to: deleteTo } = message;
                    const deleteChatId = [username, deleteTo].sort().join('_');
                    
                    if (messages.has(deleteChatId)) {
                        const chatMessages = messages.get(deleteChatId);
                        const msgIndex = chatMessages.findIndex(m => m.id === deleteId && m.from === username);
                        
                        if (msgIndex !== -1) {
                            chatMessages.splice(msgIndex, 1);
                            
                            // Notify recipient
                            const deleteRecipient = onlineUsers.get(deleteTo);
                            if (deleteRecipient && deleteRecipient.readyState === WebSocket.OPEN) {
                                deleteRecipient.send(JSON.stringify({
                                    type: 'message_deleted',
                                    messageId: deleteId,
                                    from: username
                                }));
                            }
                        }
                    }
                    break;

                case 'typing':
                    if (!username) return;
                    
                    const typingRecipient = onlineUsers.get(message.to);
                    if (typingRecipient && typingRecipient.readyState === WebSocket.OPEN) {
                        typingRecipient.send(JSON.stringify({
                            type: 'typing',
                            from: username,
                            isTyping: message.isTyping
                        }));
                    }
                    break;

                case 'mark_read':
                    if (!username) return;
                    
                    const { from: readFrom } = message;
                    const readChatId = [username, readFrom].sort().join('_');
                    
                    if (messages.has(readChatId)) {
                        const chatMessages = messages.get(readChatId);
                        const messageIds = [];
                        
                        chatMessages.forEach(msg => {
                            if (msg.from === readFrom && msg.to === username && !msg.read) {
                                msg.read = true;
                                messageIds.push(msg.id);
                            }
                        });
                        
                        // Notify sender
                        if (messageIds.length > 0) {
                            const senderWs = onlineUsers.get(readFrom);
                            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                                senderWs.send(JSON.stringify({
                                    type: 'messages_read',
                                    messageIds: messageIds,
                                    by: username
                                }));
                            }
                        }
                    }
                    break;

                case 'pin_message':
                    if (!username) return;
                    
                    const { to: pinTo, messageId: pinId, messageText: pinText } = message;
                    const pinChatId = [username, pinTo].sort().join('_');
                    
                    pinnedMessages.set(pinChatId, {
                        messageId: pinId,
                        messageText: pinText,
                        pinnedBy: username
                    });
                    
                    saveData();
                    
                    // Notify recipient
                    const pinRecipient = onlineUsers.get(pinTo);
                    if (pinRecipient && pinRecipient.readyState === WebSocket.OPEN) {
                        pinRecipient.send(JSON.stringify({
                            type: 'message_pinned',
                            from: username,
                            messageId: pinId,
                            messageText: pinText
                        }));
                    }
                    break;

                case 'unpin_message':
                    if (!username) return;
                    
                    const { to: unpinTo } = message;
                    const unpinChatId = [username, unpinTo].sort().join('_');
                    
                    pinnedMessages.delete(unpinChatId);
                    
                    saveData();
                    
                    // Notify recipient
                    const unpinRecipient = onlineUsers.get(unpinTo);
                    if (unpinRecipient && unpinRecipient.readyState === WebSocket.OPEN) {
                        unpinRecipient.send(JSON.stringify({
                            type: 'message_unpinned',
                            from: username
                        }));
                    }
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        if (username) {
            onlineUsers.delete(username);
            broadcastOnlineUsers();
            console.log(`User ${username} disconnected`);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcastOnlineUsers() {
    const onlineUsersList = Array.from(onlineUsers.keys());
    
    onlineUsers.forEach((ws, username) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'online_users',
                users: onlineUsersList.filter(u => u !== username)
            }));
        }
    });
}

function broadcastNewUser(newUsername, userId) {
    onlineUsers.forEach((ws, username) => {
        if (ws.readyState === WebSocket.OPEN && username !== newUsername) {
            ws.send(JSON.stringify({
                type: 'new_user',
                username: newUsername,
                userId: userId
            }));
        }
    });
}

setInterval(() => {
    onlineUsers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Secure Messenger Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`);
});
