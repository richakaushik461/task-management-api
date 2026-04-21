const redis = require('redis');
const logger = require('../utils/logger');

let client;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    await client.connect();
    
    return client;
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Don't crash the app if Redis fails
    return null;
  }
};

const getAsync = async (key) => {
  try {
    if (!client || !client.isOpen) return null;
    return await client.get(key);
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

const setAsync = async (key, value, option = 'EX', expiry = 3600) => {
  try {
    if (!client || !client.isOpen) return null;
    return await client.set(key, value, { [option]: expiry });
  } catch (error) {
    logger.error('Redis set error:', error);
    return null;
  }
};

const delAsync = async (key) => {
  try {
    if (!client || !client.isOpen) return 0;
    return await client.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
    return 0;
  }
};

const clearPattern = async (pattern) => {
  try {
    if (!client || !client.isOpen) return;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    logger.error('Redis clear pattern error:', error);
  }
};

module.exports = {
  connectRedis,
  getAsync,
  setAsync,
  delAsync,
  clearPattern
};