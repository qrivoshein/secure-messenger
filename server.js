require('dotenv').config();

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('.'));

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER || 'messenger_app',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'secure_messenger',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Redis client
const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

(async () => {
    await redisClient.connect();
})();

// Test PostgreSQL connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('PostgreSQL connection error:', err);
    } else {
        console.log('✅ Connected to PostgreSQL');
    }
});

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

const onlineUsers = new Map();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function generateUserId() {
    let userId;
    let attempts = 0;
    const maxAttempts = 10000;
    
    do {
        userId = String(Math.floor(1000 + Math.random() * 9000));
        attempts++;
        
        if (attempts >= maxAttempts) {
            userId = String(Date.now()).slice(-4);
            break;
        }
        
        const result = await pool.query('SELECT id FROM users WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) break;
    } while (true);
    
    return userId;
}

app.post('/api/register', async (req, res) => {
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

    try {
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = hashPassword(password);
        const userId = await generateUserId();
        
        await pool.query(
            'INSERT INTO users (username, password_hash, user_id) VALUES ($1, $2, $3)',
            [username, hashedPassword, userId]
        );
        
        broadcastNewUser(username, userId);

        res.json({ success: true, message: 'User registered successfully', userId: userId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const result = await pool.query('SELECT password_hash, user_id FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const hashedPassword = hashPassword(password);
        
        if (user.password_hash !== hashedPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken();
        
        // Store session in Redis with 24h expiry
        await redisClient.setEx(`session:${token}`, 86400, JSON.stringify({ 
            username, 
            loginTime: Date.now() 
        }));

        res.json({ success: true, token, username, userId: user.user_id });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/verify', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const sessionData = await redisClient.get(`session:${token}`);
        
        if (!sessionData) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const session = JSON.parse(sessionData);
        const result = await pool.query('SELECT user_id FROM users WHERE username = $1', [session.username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({ success: true, username: session.username, userId: result.rows[0].user_id });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/users', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
        const sessionData = await redisClient.get(`session:${token}`);
        
        if (!sessionData) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const session = JSON.parse(sessionData);
        
        // Get only users with whom there are messages (active chats)
        const result = await pool.query(
            `SELECT DISTINCT u.username, u.user_id 
             FROM users u
             INNER JOIN messages m ON (m.from_username = u.username OR m.to_username = u.username)
             WHERE u.username != $1 
               AND (m.from_username = $1 OR m.to_username = $1)
             ORDER BY u.username`,
            [session.username]
        );

        const usersList = result.rows.map(row => ({
            username: row.username,
            userId: row.user_id,
            online: onlineUsers.has(row.username),
            avatar: row.username[0].toUpperCase()
        }));

        res.json({ users: usersList });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Search users by username or tag (username#userId)
app.get('/api/search-users', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const query = req.query.q;
    
    try {
        const sessionData = await redisClient.get(`session:${token}`);
        
        if (!sessionData) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!query || query.trim().length < 2) {
            return res.json({ users: [] });
        }

        const session = JSON.parse(sessionData);
        const searchQuery = query.trim();
        
        // Check if search includes tag (username#userId)
        let result;
        if (searchQuery.includes('#')) {
            const [username, userId] = searchQuery.split('#');
            result = await pool.query(
                `SELECT username, user_id FROM users 
                 WHERE username != $1 
                 AND LOWER(username) LIKE LOWER($2) 
                 AND user_id LIKE $3
                 LIMIT 20`,
                [session.username, `%${username}%`, `%${userId}%`]
            );
        } else {
            result = await pool.query(
                `SELECT username, user_id FROM users 
                 WHERE username != $1 
                 AND (LOWER(username) LIKE LOWER($2) OR user_id LIKE $2)
                 LIMIT 20`,
                [session.username, `%${searchQuery}%`]
            );
        }

        const usersList = result.rows.map(row => ({
            username: row.username,
            userId: row.user_id,
            online: onlineUsers.has(row.username),
            avatar: row.username[0].toUpperCase()
        }));

        res.json({ users: usersList });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/messages/:otherUser', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
        const sessionData = await redisClient.get(`session:${token}`);
        
        if (!sessionData) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const session = JSON.parse(sessionData);
        const { otherUser } = req.params;
        
        const result = await pool.query(
            `SELECT m.*, 
             EXISTS(SELECT 1 FROM read_receipts WHERE message_id = m.message_id AND username = $2) as read
             FROM messages m 
             WHERE (from_username = $1 AND to_username = $2) 
                OR (from_username = $2 AND to_username = $1)
             ORDER BY created_at ASC`,
            [session.username, otherUser]
        );

        const messages = result.rows.map(row => ({
            id: row.message_id,
            from: row.from_username,
            to: row.to_username,
            text: row.text,
            mediaType: row.media_type,
            mediaUrl: row.media_url,
            fileName: row.text,
            fileSize: row.media_size,
            forwarded: row.forwarded,
            forwardedFrom: row.forwarded_from,
            read: row.read,
            edited: !!row.edited_at,
            timestamp: row.created_at,
            time: new Date(row.created_at).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        }));

        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
        const sessionData = await redisClient.get(`session:${token}`);
        
        if (!sessionData) {
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
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

wss.on('connection', (ws, req) => {
    let username = null;
    let token = null;

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
                case 'auth':
                    token = message.token;
                    const sessionData = await redisClient.get(`session:${token}`);
                    
                    if (sessionData) {
                        const session = JSON.parse(sessionData);
                        username = session.username;
                        onlineUsers.set(username, ws);
                        
                        // Set online status in Redis
                        await redisClient.setEx(`online:${username}`, 60, '1');
                        
                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            username
                        }));

                        // Send pinned messages info
                        const pinnedResult = await pool.query(
                            `SELECT pm.* FROM pinned_messages pm
                             WHERE chat_id LIKE $1 OR chat_id LIKE $2`,
                            [`%${username}%`, `%${username}%`]
                        );
                        
                        if (pinnedResult.rows.length > 0) {
                            const userPinnedMessages = {};
                            pinnedResult.rows.forEach(row => {
                                userPinnedMessages[row.chat_id] = {
                                    messageId: row.message_id,
                                    messageText: row.message_text,
                                    pinnedBy: row.pinned_by
                                };
                            });
                            
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
                    
                    const msgId = messageId || Date.now().toString();
                    
                    // Save to database
                    await pool.query(
                        `INSERT INTO messages (message_id, from_username, to_username, text, media_type, media_url, media_size, forwarded, forwarded_from)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [msgId, username, to, text, mediaType, mediaUrl, fileSize, forwarded || false, forwardedFrom || null]
                    );

                    const msg = {
                        id: msgId,
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
                    
                    await pool.query(
                        `UPDATE messages SET text = $1, edited_at = CURRENT_TIMESTAMP
                         WHERE message_id = $2 AND from_username = $3`,
                        [newText, editId, username]
                    );
                    
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
                    break;

                case 'delete_message':
                    if (!username) return;
                    
                    const { messageId: deleteId, to: deleteTo } = message;
                    
                    await pool.query(
                        'DELETE FROM messages WHERE message_id = $1 AND from_username = $2',
                        [deleteId, username]
                    );
                    
                    // Notify recipient
                    const deleteRecipient = onlineUsers.get(deleteTo);
                    if (deleteRecipient && deleteRecipient.readyState === WebSocket.OPEN) {
                        deleteRecipient.send(JSON.stringify({
                            type: 'message_deleted',
                            messageId: deleteId,
                            from: username
                        }));
                    }
                    break;

                case 'typing':
                    if (!username) return;
                    
                    // Store in Redis with short TTL
                    await redisClient.setEx(`typing:${username}:${message.to}`, 5, message.isTyping ? '1' : '0');
                    
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
                    
                    // Get unread messages
                    const unreadMessages = await pool.query(
                        `SELECT message_id FROM messages 
                         WHERE from_username = $1 AND to_username = $2
                         AND NOT EXISTS (SELECT 1 FROM read_receipts WHERE message_id = messages.message_id AND username = $2)`,
                        [readFrom, username]
                    );
                    
                    // Mark as read
                    for (const row of unreadMessages.rows) {
                        await pool.query(
                            'INSERT INTO read_receipts (message_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                            [row.message_id, username]
                        );
                    }
                    
                    // Notify sender
                    if (unreadMessages.rows.length > 0) {
                        const senderWs = onlineUsers.get(readFrom);
                        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                            senderWs.send(JSON.stringify({
                                type: 'messages_read',
                                messageIds: unreadMessages.rows.map(r => r.message_id),
                                by: username
                            }));
                        }
                    }
                    break;

                case 'pin_message':
                    if (!username) return;
                    
                    const { to: pinTo, messageId: pinId, messageText: pinText } = message;
                    const pinChatId = [username, pinTo].sort().join('_');
                    
                    await pool.query(
                        `INSERT INTO pinned_messages (chat_id, message_id, message_text, pinned_by)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (chat_id) DO UPDATE SET message_id = $2, message_text = $3, pinned_by = $4`,
                        [pinChatId, pinId, pinText, username]
                    );
                    
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
                    
                    await pool.query('DELETE FROM pinned_messages WHERE chat_id = $1', [unpinChatId]);
                    
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
                    if (username) {
                        await redisClient.setEx(`online:${username}`, 60, '1');
                    }
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

    ws.on('close', async () => {
        if (username) {
            onlineUsers.delete(username);
            await redisClient.del(`online:${username}`);
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

// Keep-alive ping
setInterval(() => {
    onlineUsers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    });
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await redisClient.quit();
    await pool.end();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Secure Messenger Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`);
});
