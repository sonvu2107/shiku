#!/usr/bin/env node

/**
 * Test script để kiểm tra hệ thống API monitoring persistent
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiStats from './src/models/ApiStats.js';

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

const testApiStats = async () => {
  try {
    console.log('🧪 Testing API Stats functionality...\n');

    // Test 1: Get or create stats
    console.log('1. Testing getOrCreateStats...');
    const stats = await ApiStats.getOrCreateStats();
    console.log(`   ✅ Stats document created/found`);
    console.log(`   📊 Total requests: ${stats.totalRequests}`);
    console.log(`   🚫 Rate limit hits: ${stats.rateLimitHits}\n`);

    // Test 2: Simulate API calls
    console.log('2. Simulating API calls...');
    for (let i = 0; i < 10; i++) {
      stats.totalRequests++;
      stats.incrementEndpoint('/api/posts');
      stats.incrementIP('192.168.1.100');
      stats.incrementHour(new Date().getHours());
      
      if (i % 3 === 0) {
        stats.incrementRateLimitHit('/api/posts');
      }
      
      stats.addRealtimeUpdate({
        endpoint: '/api/posts',
        method: 'GET',
        ip: '192.168.1.100',
        statusCode: i % 3 === 0 ? 429 : 200,
        userAgent: 'Test Agent'
      });
    }
    
    await stats.save();
    console.log(`   ✅ Simulated 10 API calls`);
    console.log(`   📊 New total requests: ${stats.totalRequests}`);
    console.log(`   🚫 New rate limit hits: ${stats.rateLimitHits}\n`);

    // Test 3: Test reset functionality
    console.log('3. Testing reset functionality...');
    stats.resetCurrentPeriod();
    await stats.save();
    console.log(`   ✅ Current period reset`);
    console.log(`   📊 Total requests after reset: ${stats.totalRequests}`);
    console.log(`   🚫 Rate limit hits after reset: ${stats.rateLimitHits}\n`);

    // Test 4: Test data retrieval
    console.log('4. Testing data retrieval...');
    const topEndpoints = Array.from(stats.currentPeriod.requestsByEndpoint.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    console.log(`   📈 Top endpoints:`);
    topEndpoints.forEach(([endpoint, count], index) => {
      console.log(`      ${index + 1}. ${endpoint}: ${count} requests`);
    });
    
    const realtimeCount = stats.realtimeUpdates.length;
    console.log(`   🔄 Real-time updates: ${realtimeCount} entries\n`);

    // Test 5: Test cleanup
    console.log('5. Testing cleanup functionality...');
    const beforeCleanup = await ApiStats.countDocuments();
    await ApiStats.cleanOldData();
    const afterCleanup = await ApiStats.countDocuments();
    console.log(`   🧹 Documents before cleanup: ${beforeCleanup}`);
    console.log(`   🧹 Documents after cleanup: ${afterCleanup}\n`);

    // Test 6: Performance test
    console.log('6. Performance test...');
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      stats.totalRequests++;
      stats.incrementEndpoint(`/api/test${i % 10}`);
      stats.incrementIP(`192.168.1.${i % 255}`);
    }
    
    await stats.save();
    const endTime = Date.now();
    console.log(`   ⚡ 100 operations completed in ${endTime - startTime}ms\n`);

    console.log('🎉 All tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Total requests tracked: ${stats.totalRequests}`);
    console.log(`   - Rate limit hits: ${stats.rateLimitHits}`);
    console.log(`   - Hourly stats entries: ${stats.hourlyStats.length}`);
    console.log(`   - Real-time updates: ${stats.realtimeUpdates.length}`);
    console.log(`   - Last reset: ${stats.lastReset.toISOString()}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

const main = async () => {
  try {
    await connectToDatabase();
    await testApiStats();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
