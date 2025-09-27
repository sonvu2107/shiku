#!/usr/bin/env node

/**
 * Rate Limit Test Script
 * Test rate limiting functionality
 * Usage: node scripts/test-rate-limits.js
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Test configuration
const TESTS = [
  {
    name: 'Posts Rate Limit Test',
    endpoint: '/api/posts',
    expectedLimit: 800,
    windowMs: 15 * 60 * 1000,
    requests: 10
  },
  {
    name: 'General API Rate Limit Test',
    endpoint: '/api/users',
    expectedLimit: 1500,
    windowMs: 15 * 60 * 1000,
    requests: 10
  },
  {
    name: 'Auth Status Rate Limit Test',
    endpoint: '/api/auth/me',
    expectedLimit: 120,
    windowMs: 1 * 60 * 1000,
    requests: 5
  },
  {
    name: 'Message Rate Limit Test',
    endpoint: '/api/messages',
    expectedLimit: 100,
    windowMs: 1 * 60 * 1000,
    requests: 5
  }
];

/**
 * Parse rate limit headers
 */
function parseRateLimitHeaders(response) {
  return {
    limit: response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('X-RateLimit-Remaining'),
    reset: response.headers.get('X-RateLimit-Reset'),
    used: response.headers.get('X-RateLimit-Used'),
    warning: response.headers.get('X-RateLimit-Warning'),
    retryAfter: response.headers.get('Retry-After')
  };
}

/**
 * Test a single endpoint
 */
async function testEndpoint(testConfig) {
  console.log(`\n🧪 Testing: ${testConfig.name}`);
  console.log(`   Endpoint: ${testConfig.endpoint}`);
  console.log(`   Expected Limit: ${testConfig.expectedLimit}`);
  console.log(`   Window: ${testConfig.windowMs / 1000}s`);
  console.log(`   Requests: ${testConfig.requests}`);
  
  const results = [];
  
  for (let i = 0; i < testConfig.requests; i++) {
    try {
      const response = await fetch(`${API_URL}${testConfig.endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const rateLimitInfo = parseRateLimitHeaders(response);
      results.push({
        request: i + 1,
        status: response.status,
        rateLimitInfo
      });
      
      console.log(`   Request ${i + 1}: Status ${response.status}, Remaining: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`   Request ${i + 1}: Error - ${error.message}`);
      results.push({
        request: i + 1,
        error: error.message
      });
    }
  }
  
  // Analyze results
  const successfulRequests = results.filter(r => r.status && r.status < 400);
  const rateLimitedRequests = results.filter(r => r.status === 429);
  const firstResult = successfulRequests[0];
  
  if (firstResult && firstResult.rateLimitInfo.limit) {
    const actualLimit = parseInt(firstResult.rateLimitInfo.limit);
    const expectedLimit = testConfig.expectedLimit;
    
    console.log(`\n   📊 Results:`);
    console.log(`   - Successful requests: ${successfulRequests.length}/${testConfig.requests}`);
    console.log(`   - Rate limited requests: ${rateLimitedRequests.length}`);
    console.log(`   - Actual limit: ${actualLimit}`);
    console.log(`   - Expected limit: ${expectedLimit}`);
    console.log(`   - Match: ${actualLimit === expectedLimit ? '✅' : '❌'}`);
    
    if (firstResult.rateLimitInfo.warning) {
      console.log(`   - Warning header: ✅`);
    }
    
    return {
      success: actualLimit === expectedLimit,
      actualLimit,
      expectedLimit,
      successfulRequests: successfulRequests.length,
      rateLimitedRequests: rateLimitedRequests.length
    };
  } else {
    console.log(`   ❌ No rate limit headers found`);
    return {
      success: false,
      error: 'No rate limit headers'
    };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 RATE LIMIT TEST SUITE');
  console.log('========================');
  console.log(`API URL: ${API_URL}`);
  
  const results = [];
  
  for (const test of TESTS) {
    try {
      const result = await testEndpoint(test);
      results.push({
        name: test.name,
        ...result
      });
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\nOverall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Rate limiting is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the configuration.');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests as testRateLimits };
