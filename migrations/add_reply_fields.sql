-- Add reply fields to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS reply_to_text TEXT,
ADD COLUMN IF NOT EXISTS reply_to_sender VARCHAR(255);

-- Add index for reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);
