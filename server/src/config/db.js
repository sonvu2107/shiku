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
  
  // Configure connection options for better stability
  const options = {
    dbName: process.env.DB_NAME || undefined,
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    bufferCommands: false, // Disable mongoose buffering
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds to keep connection alive
  };
  
  try {
    // Kết nối đến MongoDB với improved options
    await mongoose.connect(uri, options);
    console.log("✅ MongoDB connected with optimized settings");
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (err) {
    // Log lỗi và thoát process nếu không kết nối được
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
