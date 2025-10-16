import redis from 'redis';
import config from '../config';
import logger from '../utils/logger';

const redisClient = redis.createClient({
    socket: {
        host: config.redis.host,
        port: config.redis.port
    }
});

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.on('connect', () => logger.info('✅ Connected to Redis'));
redisClient.on('ready', () => logger.debug('Redis client ready'));
redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

const connectRedis = async (): Promise<void> => {
    try {
        await redisClient.connect();
    } catch (err) {
        logger.error('Failed to connect to Redis:', err);
        throw err;
    }
};

export { redisClient, connectRedis };
