#!/usr/bin/env node

/**
 * API Monitoring Test Script
 * Test API monitoring functionality
 * Usage: node scripts/test-api-monitoring.js
 */

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Test endpoints to generate API calls
const TEST_ENDPOINTS = [
  '/api/posts',
  '/api/users',
  '/api/auth/me',
  '/api/notifications',
  '/api/friends',
  '/api/groups',
  '/api/events',
  '/api/media'
];

/**
 * Make test API calls
 */
async function makeTestCalls() {
  console.log('🚀 Making test API calls...');
  
  for (let i = 0; i < 20; i++) {
    const endpoint = TEST_ENDPOINTS[Math.floor(Math.random() * TEST_ENDPOINTS.length)];
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ ${endpoint}: ${response.status}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

/**
 * Test API monitoring endpoints
 */
async function testMonitoringEndpoints() {
  console.log('\n📊 Testing API monitoring endpoints...');
  
  try {
    // Test stats endpoint
    const statsResponse = await fetch(`${API_URL}/api/api-monitoring/stats`);
    const stats = await statsResponse.json();
    
    if (stats.success) {
      console.log('✅ Stats endpoint working');
      console.log(`   Total requests: ${stats.data.overview.totalRequests}`);
      console.log(`   Rate limit hits: ${stats.data.overview.rateLimitHits}`);
      console.log(`   Requests per minute: ${stats.data.overview.requestsPerMinute}`);
    } else {
      console.log('❌ Stats endpoint failed:', stats.error);
    }
    
    // Test rate limits endpoint
    const rateLimitsResponse = await fetch(`${API_URL}/api/api-monitoring/rate-limits`);
    const rateLimits = await rateLimitsResponse.json();
    
    if (rateLimits.success) {
      console.log('✅ Rate limits endpoint working');
      console.log(`   Available rate limits: ${Object.keys(rateLimits.data).length}`);
    } else {
      console.log('❌ Rate limits endpoint failed:', rateLimits.error);
    }
    
    // Test health endpoint
    const healthResponse = await fetch(`${API_URL}/api/api-monitoring/health`);
    const health = await healthResponse.json();
    
    if (health.success) {
      console.log('✅ Health endpoint working');
      console.log(`   Status: ${health.status}`);
      console.log(`   Uptime: ${Math.round(health.uptime)}s`);
    } else {
      console.log('❌ Health endpoint failed:', health.error);
    }
    
  } catch (error) {
    console.log('❌ Error testing monitoring endpoints:', error.message);
  }
}

/**
 * Test reset functionality
 */
async function testReset() {
  console.log('\n🔄 Testing reset functionality...');
  
  try {
    const resetResponse = await fetch(`${API_URL}/api/api-monitoring/reset`, {
      method: 'POST'
    });
    const reset = await resetResponse.json();
    
    if (reset.success) {
      console.log('✅ Reset endpoint working');
      console.log(`   Message: ${reset.message}`);
    } else {
      console.log('❌ Reset endpoint failed:', reset.error);
    }
    
  } catch (error) {
    console.log('❌ Error testing reset:', error.message);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 API MONITORING TEST SUITE');
  console.log('============================');
  console.log(`API URL: ${API_URL}`);
  
  try {
    // Make test API calls to generate data
    await makeTestCalls();
    
    // Test monitoring endpoints
    await testMonitoringEndpoints();
    
    // Test reset functionality
    await testReset();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests as testAPIMonitoring };
