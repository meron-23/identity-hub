const mongoose = require('mongoose');

/**
 * connectDB – establishes MongoDB connection via Mongoose.
 * The server waits for this promise before accepting requests.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/identity-hub';
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Fatal — cannot run without DB
  }
};

module.exports = connectDB;
