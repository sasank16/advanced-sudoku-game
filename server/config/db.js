/**
 * Database Connection Module
 * Connects to MongoDB using Mongoose with resilient connection handling.
 */

const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/advanced_sudoku';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 // Fast failover if mongo is not running locally
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.warn(`⚠️ MongoDB Connection Notice: ${error.message}`);
    console.warn('ℹ️ Operating with hybrid in-memory fallback for local environments without an active MongoDB daemon.');
  }
}

function getIsConnected() {
  return isConnected;
}

module.exports = {
  connectDB,
  getIsConnected
};
