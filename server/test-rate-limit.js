#!/usr/bin/env node

/**
 * Test script để kiểm tra rate limiting hoạt động đúng với proxy
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

// Test data
const testData = {
  email: 'test@example.com',
  password: 'wrongpassword'
};

/**
 * Test rate limiting với X-Forwarded-For header
 */
async function testRateLimitWithProxy() {
  console.log('🧪 Testing Rate Limiting with Proxy Headers...\n');
  
  const requests = [];
  const startTime = Date.now();
  
  // Simulate requests với X-Forwarded-For header (như Railway/Heroku)
  for (let i = 0; i < 10; i++) {
    requests.push(
      fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '203.0.113.195, 70.41.3.18, 150.172.238.178', // Simulate proxy chain
          'X-Real-IP': '203.0.113.195',
          'User-Agent': `TestClient/${i + 1}`
        },
        body: JSON.stringify(testData)
      })
    );
  }
  
  console.log('📤 Sending 10 requests with proxy headers...');
  
  try {
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    console.log(`⏱️  Completed in ${endTime - startTime}ms\n`);
    
    // Analyze responses
    const statusCodes = responses.map(r => r.status);
    const rateLimitedCount = statusCodes.filter(status => status === 429).length;
    const successCount = statusCodes.filter(status => status === 401).length; // Expected for wrong password
    
    console.log('📊 Results:');
    console.log(`   - Total requests: ${responses.length}`);
    console.log(`   - Rate limited (429): ${rateLimitedCount}`);
    console.log(`   - Auth failed (401): ${successCount}`);
    console.log(`   - Other status codes: ${statusCodes.length - rateLimitedCount - successCount}`);
    
    // Check rate limit headers
    const firstResponse = responses[0];
    const rateLimitHeaders = {
      'X-RateLimit-Limit': firstResponse.headers.get('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': firstResponse.headers.get('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': firstResponse.headers.get('X-RateLimit-Reset')
    };
    
    console.log('\n🔍 Rate Limit Headers:');
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value || 'Not set'}`);
    });
    
    // Test individual IP detection
    console.log('\n🔍 Testing IP Detection:');
    const testIPs = [
      '203.0.113.195',
      '70.41.3.18', 
      '150.172.238.178'
    ];
    
    for (const ip of testIPs) {
      try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip,
            'User-Agent': 'IPTestClient'
          },
          body: JSON.stringify(testData)
        });
        
        console.log(`   - IP ${ip}: Status ${response.status}`);
      } catch (error) {
        console.log(`   - IP ${ip}: Error ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test rate limiting without proxy headers
 */
async function testRateLimitWithoutProxy() {
  console.log('\n🧪 Testing Rate Limiting without Proxy Headers...\n');
  
  const requests = [];
  
  // Simulate requests without proxy headers
  for (let i = 0; i < 10; i++) {
    requests.push(
      fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `DirectClient/${i + 1}`
        },
        body: JSON.stringify(testData)
      })
    );
  }
  
  console.log('📤 Sending 10 requests without proxy headers...');
  
  try {
    const responses = await Promise.all(requests);
    
    const statusCodes = responses.map(r => r.status);
    const rateLimitedCount = statusCodes.filter(status => status === 429).length;
    const successCount = statusCodes.filter(status => status === 401).length;
    
    console.log('📊 Results:');
    console.log(`   - Total requests: ${responses.length}`);
    console.log(`   - Rate limited (429): ${rateLimitedCount}`);
    console.log(`   - Auth failed (401): ${successCount}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test server health
 */
async function testServerHealth() {
  console.log('🏥 Testing Server Health...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Server is healthy:');
    console.log(`   - Status: ${data.status}`);
    console.log(`   - Uptime: ${data.uptime}s`);
    console.log(`   - Environment: ${data.environment}`);
    console.log(`   - Security features: ${data.security ? 'Enabled' : 'Disabled'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Rate Limit Tests...\n');
  
  // Test server health first
  const isHealthy = await testServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy, stopping tests');
    return;
  }
  
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test with proxy headers
  await testRateLimitWithProxy();
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test without proxy headers
  await testRateLimitWithoutProxy();
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
