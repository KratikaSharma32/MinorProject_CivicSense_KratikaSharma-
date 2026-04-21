const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const options = {
    maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  };

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

  try {
    await mongoose.connect(process.env.MONGODB_URI, options);
    return true;
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    return false;
  }
};

module.exports = connectDB;
