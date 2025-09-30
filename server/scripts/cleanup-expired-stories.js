import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Story from '../src/models/Story.js';
import { connectDB } from '../src/config/db.js';

/**
 * Script tự động xóa stories đã hết hạn (expired)
 * Chạy định kỳ bằng cron job hoặc scheduler
 */

dotenv.config();

async function cleanupExpiredStories() {
  try {
    console.log('🧹 Starting cleanup of expired stories...');
    console.log(`Current time: ${new Date().toISOString()}`);
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Delete expired stories
    const result = await Story.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`✅ Cleanup completed: ${result.deletedCount} expired stories deleted`);
    
    // Optionally, also deactivate stories that are expired but not deleted
    const deactivateResult = await Story.updateMany(
      {
        expiresAt: { $lt: new Date() },
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );
    
    console.log(`✅ Deactivated ${deactivateResult.modifiedCount} expired stories`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupExpiredStories();
