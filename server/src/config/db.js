/**
 * Database Connection Module
 * 
 * Quản lý kết nối MongoDB với các tùy chọn tối ưu.
 * 
 * @module db
 */

import mongoose from "mongoose";

/**
 * Kết nối đến MongoDB database
 * 
 * @param {string} uri - MongoDB connection string
 * @throws {Error} Nếu không có MONGODB_URI
 */
export async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI is not set");
  
  mongoose.set("strictQuery", true);
  
  const options = {
    dbName: process.env.DB_NAME || undefined,
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 50,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 10,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: false,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
    compressors: ['zlib'],
    zlibCompressionLevel: 6,
  };
  
  try {
    await mongoose.connect(uri, options);
    console.log("[DATABASE] MongoDB connected with optimized settings");
    
    mongoose.connection.on('error', (err) => {
      console.error('[DATABASE] MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[DATABASE] MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[DATABASE] MongoDB reconnected');
    });
    
  } catch (err) {
    console.error("[DATABASE] MongoDB connection error:", err.message);
    process.exit(1);
  }
}
