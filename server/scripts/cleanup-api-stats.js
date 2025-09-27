#!/usr/bin/env node

/**
 * Script để dọn dẹp dữ liệu API stats cũ
 * Chạy script này để xóa dữ liệu cũ hơn 7 ngày
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiStats from '../src/models/ApiStats.js';

// Load environment variables
dotenv.config();

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myblog');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanupOldData = async () => {
  try {
    console.log('🧹 Starting API stats cleanup...');
    
    // Clean data older than 7 days
    const result = await ApiStats.cleanOldData();
    
    console.log('✅ API stats cleanup completed');
    console.log(`📊 Cleaned up old data`);
    
    // Get current stats
    const stats = await ApiStats.getOrCreateStats();
    console.log(`📈 Current stats:`);
    console.log(`   - Total requests: ${stats.totalRequests}`);
    console.log(`   - Rate limit hits: ${stats.rateLimitHits}`);
    console.log(`   - Hourly stats entries: ${stats.hourlyStats.length}`);
    console.log(`   - Real-time updates: ${stats.realtimeUpdates.length}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

const main = async () => {
  try {
    await connectToDatabase();
    await cleanupOldData();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
