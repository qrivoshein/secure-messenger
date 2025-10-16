-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_id VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    from_username VARCHAR(255) NOT NULL,
    to_username VARCHAR(255) NOT NULL,
    text TEXT,
    media_type VARCHAR(50),
    media_url TEXT,
    media_size INTEGER,
    forwarded BOOLEAN DEFAULT FALSE,
    forwarded_from VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    FOREIGN KEY (from_username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (to_username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_messages_chat ON messages(from_username, to_username);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Pinned messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(255) UNIQUE NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    message_text TEXT,
    pinned_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pinned_by) REFERENCES users(username) ON DELETE CASCADE
);

-- Read receipts table
CREATE TABLE IF NOT EXISTS read_receipts (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, username),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_read_receipts_message ON read_receipts(message_id);

-- Grant permissions to messenger_app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO messenger_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO messenger_app;
