#!/usr/bin/env node

/**
 * Simple test for API monitoring endpoints
 */

// Test the endpoints
async function testEndpoints() {
  const baseURL = 'http://localhost:4000';
  
  console.log('🧪 Testing API Monitoring Endpoints...');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing /api/api-monitoring/health...');
    const healthResponse = await fetch(`${baseURL}/api/api-monitoring/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health endpoint:', healthData);
    
    // Test stats endpoint
    console.log('\n2. Testing /api/api-monitoring/stats...');
    const statsResponse = await fetch(`${baseURL}/api/api-monitoring/stats`);
    const statsData = await statsResponse.json();
    console.log('✅ Stats endpoint:', statsData);
    
    // Test rate limits endpoint
    console.log('\n3. Testing /api/api-monitoring/rate-limits...');
    const rateLimitsResponse = await fetch(`${baseURL}/api/api-monitoring/rate-limits`);
    const rateLimitsData = await rateLimitsResponse.json();
    console.log('✅ Rate limits endpoint:', rateLimitsData);
    
    console.log('\n🎉 All tests passed! API monitoring is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testEndpoints();
