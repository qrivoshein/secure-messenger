import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    user: process.env.DB_USER || 'messenger_app',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'secure_messenger',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const DATA_FILE = path.join(__dirname, 'data.json');

interface UserData {
    password: string;
    userId: string;
}

interface PinData {
    messageId: string;
    messageText: string;
    pinnedBy: string;
}

interface MigrationData {
    users?: Record<string, UserData>;
    pinnedMessages?: Record<string, PinData>;
}

async function migrate(): Promise<void> {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log('❌ No data.json file found, nothing to migrate');
            process.exit(0);
        }

        const data: MigrationData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        
        console.log('🔄 Starting migration...');
        
        // Migrate users
        if (data.users) {
            console.log(`\n📊 Migrating ${Object.keys(data.users).length} users...`);
            
            for (const [username, userData] of Object.entries(data.users)) {
                try {
                    await pool.query(
                        'INSERT INTO users (username, password_hash, user_id) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
                        [username, userData.password, userData.userId]
                    );
                    console.log(`  ✅ Migrated user: ${username}`);
                } catch (error: any) {
                    console.log(`  ❌ Failed to migrate user ${username}:`, error.message);
                }
            }
        }
        
        // Migrate pinned messages
        if (data.pinnedMessages) {
            console.log(`\n📌 Migrating ${Object.keys(data.pinnedMessages).length} pinned messages...`);
            
            for (const [chatId, pinData] of Object.entries(data.pinnedMessages)) {
                try {
                    await pool.query(
                        'INSERT INTO pinned_messages (chat_id, message_id, message_text, pinned_by) VALUES ($1, $2, $3, $4) ON CONFLICT (chat_id) DO NOTHING',
                        [chatId, pinData.messageId, pinData.messageText, pinData.pinnedBy]
                    );
                    console.log(`  ✅ Migrated pinned message for chat: ${chatId}`);
                } catch (error: any) {
                    console.log(`  ❌ Failed to migrate pinned message for ${chatId}:`, error.message);
                }
            }
        }
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 You can now start the new server with: pm2 restart secure-messenger');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
