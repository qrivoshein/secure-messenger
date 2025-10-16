-- Add voice message fields to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS duration VARCHAR(10),
ADD COLUMN IF NOT EXISTS waveform_data JSONB;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(media_type) WHERE media_type IS NOT NULL;
