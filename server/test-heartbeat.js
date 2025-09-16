#!/usr/bin/env node

/**
 * Test Heartbeat Endpoint
 * Test endpoint /heartbeat để đảm bảo monitoring services hoạt động
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Test /heartbeat endpoint
 */
async function testHeartbeat() {
  console.log('💓 Testing Heartbeat Endpoint...\n');
  
  try {
    console.log(`📤 GET ${BASE_URL}/heartbeat`);
    
    const response = await fetch(`${BASE_URL}/heartbeat`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.status === 'ok') {
      console.log('   ✅ Heartbeat endpoint working correctly');
      
      // Check required fields
      const requiredFields = ['status', 'timestamp', 'uptime', 'memory', 'environment'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length === 0) {
        console.log('   ✅ All required fields present');
      } else {
        console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
      }
      
      // Check uptime
      if (data.uptime > 0) {
        console.log(`   ✅ Uptime: ${Math.round(data.uptime)}s`);
      } else {
        console.log('   ⚠️  Uptime is 0 or invalid');
      }
      
      // Check memory usage
      if (data.memory && typeof data.memory === 'object') {
        const memMB = Math.round(data.memory.heapUsed / 1024 / 1024);
        console.log(`   ✅ Memory usage: ${memMB}MB`);
      } else {
        console.log('   ⚠️  Memory usage data missing');
      }
      
    } else {
      console.log('   ❌ Heartbeat endpoint not working correctly');
    }
    
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test /health endpoint for comparison
 */
async function testHealth() {
  console.log('\n🏥 Testing Health Endpoint for comparison...\n');
  
  try {
    console.log(`📤 GET ${BASE_URL}/health`);
    
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('   ✅ Health endpoint working correctly');
    } else {
      console.log('   ❌ Health endpoint not working correctly');
    }
    
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test server startup
 */
async function testServerStartup() {
  console.log('🚀 Testing Server Startup...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('   ✅ Server is running');
    } else {
      console.log('   ❌ Server not responding correctly');
    }
    
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Starting Heartbeat Endpoint Tests...\n');
  
  await testServerStartup();
  await testHeartbeat();
  await testHealth();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - /heartbeat endpoint should return 200 with basic server info');
  console.log('   - This will fix 404 errors from monitoring services');
  console.log('   - Railway/Netlify health checks will work properly');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
