#!/usr/bin/env node

/**
 * Simple Rate Limit Test
 * Test rate limiting với express-rate-limit v7
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting with express-rate-limit v7...\n');
  
  try {
    // Test 1: Normal request
    console.log('📤 Test 1: Normal request');
    const response1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.195'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log(`   Headers:`, {
      'X-RateLimit-Limit': response1.headers.get('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': response1.headers.get('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': response1.headers.get('X-RateLimit-Reset')
    });
    
    // Test 2: Multiple requests to trigger rate limit
    console.log('\n📤 Test 2: Multiple requests to trigger rate limit');
    const requests = [];
    
    for (let i = 0; i < 10; i++) {
      requests.push(
        fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '203.0.113.195'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status);
    const rateLimitedCount = statusCodes.filter(status => status === 429).length;
    
    console.log(`   Total requests: ${responses.length}`);
    console.log(`   Rate limited (429): ${rateLimitedCount}`);
    console.log(`   Other status codes: ${statusCodes.length - rateLimitedCount}`);
    
    // Test 3: Check rate limit headers
    console.log('\n📤 Test 3: Check rate limit headers');
    const lastResponse = responses[responses.length - 1];
    console.log(`   Final status: ${lastResponse.status}`);
    console.log(`   Headers:`, {
      'X-RateLimit-Limit': lastResponse.headers.get('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': lastResponse.headers.get('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': lastResponse.headers.get('X-RateLimit-Reset')
    });
    
    if (lastResponse.status === 429) {
      const errorData = await lastResponse.json();
      console.log(`   Error message: ${errorData.error}`);
      console.log(`   Retry after: ${errorData.retryAfter} seconds`);
    }
    
    console.log('\n✅ Rate limit test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRateLimit().catch(console.error);
}

export { testRateLimit };
