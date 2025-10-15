const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool(config.db);

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('PostgreSQL connection error:', err);
    } else {
        logger.info('✅ Connected to PostgreSQL');
    }
});

pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL error:', err);
});

module.exports = pool;
