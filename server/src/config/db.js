import mongoose from "mongoose";

/**
 * Kết nối đến MongoDB database
 * @param {string} uri - MongoDB connection string
 * @throws {Error} Nếu không có MONGODB_URI
 */
export async function connectDB(uri) {
  // Kiểm tra URI có được cung cấp không
  if (!uri) throw new Error("MONGODB_URI is not set");
  
  // Bật strict mode cho queries (chỉ cho phép fields được định nghĩa trong schema)
  mongoose.set("strictQuery", true);
  
  // Configure connection options for better stability and performance
  const options = {
    dbName: process.env.DB_NAME || undefined,
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 50,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 10,
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    bufferCommands: false, // Disable mongoose buffering
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds to keep connection alive
    retryWrites: true, // Retry write operations on transient network errors
    retryReads: true, // Retry read operations on transient network errors
    compressors: ['zlib'], // Enable compression
    zlibCompressionLevel: 6, // Compression level (1-9, 6 is good balance)
  };
  
  try {
    // Kết nối đến MongoDB với improved options
    await mongoose.connect(uri, options);
    console.log("[DATABASE] MongoDB connected with optimized settings");
    
    // Handle connection events
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
    // Log lỗi và thoát process nếu không kết nối được
    console.error("[DATABASE] MongoDB connection error:", err.message);
    process.exit(1);
  }
}
