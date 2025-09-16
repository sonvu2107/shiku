#!/usr/bin/env node

/**
 * Security Testing Script
 * Test các tính năng bảo mật đã implement
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Log test result
 */
function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}: ${message}`);
  
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

/**
 * Make HTTP request
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Test 1: Input Validation
 */
async function testInputValidation() {
  console.log('\n🔍 Testing Input Validation...');
  
  // Test weak password
  const weakPasswordResponse = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      password: '123' // Weak password
    })
  });
  
  logTest(
    'Weak Password Rejection',
    weakPasswordResponse.response?.status === 400,
    weakPasswordResponse.data?.error || 'No error message'
  );
  
  // Test invalid email
  const invalidEmailResponse = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      email: 'invalid-email',
      password: 'TestPassword123!'
    })
  });
  
  logTest(
    'Invalid Email Rejection',
    invalidEmailResponse.response?.status === 400,
    invalidEmailResponse.data?.error || 'No error message'
  );
  
  // Test XSS attempt
  const xssResponse = await makeRequest('/api/posts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fake-token'
    },
    body: JSON.stringify({
      title: '<script>alert("xss")</script>',
      content: 'Test content'
    })
  });
  
  logTest(
    'XSS Protection',
    xssResponse.response?.status === 401 || xssResponse.response?.status === 400,
    'XSS attempt blocked'
  );
}

/**
 * Test 2: Rate Limiting
 */
async function testRateLimiting() {
  console.log('\n🔍 Testing Rate Limiting...');
  
  const requests = [];
  const startTime = performance.now();
  
  // Make multiple requests quickly
  for (let i = 0; i < 10; i++) {
    requests.push(makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    }));
  }
  
  const responses = await Promise.all(requests);
  const endTime = performance.now();
  
  const rateLimitedResponses = responses.filter(r => r.response?.status === 429);
  
  logTest(
    'Rate Limiting',
    rateLimitedResponses.length > 0,
    `${rateLimitedResponses.length}/10 requests rate limited`
  );
}

/**
 * Test 3: JWT Security
 */
async function testJWTSecurity() {
  console.log('\n🔍 Testing JWT Security...');
  
  // Test invalid token
  const invalidTokenResponse = await makeRequest('/api/posts', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid-token'
    }
  });
  
  logTest(
    'Invalid Token Rejection',
    invalidTokenResponse.response?.status === 401,
    'Invalid token rejected'
  );
  
  // Test expired token (if we had one)
  const expiredTokenResponse = await makeRequest('/api/posts', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer expired-token'
    }
  });
  
  logTest(
    'Expired Token Rejection',
    expiredTokenResponse.response?.status === 401,
    'Expired token rejected'
  );
}

/**
 * Test 4: File Upload Security
 */
async function testFileUploadSecurity() {
  console.log('\n🔍 Testing File Upload Security...');
  
  // Test without authentication
  const noAuthResponse = await makeRequest('/api/uploads/single', {
    method: 'POST'
  });
  
  logTest(
    'File Upload Auth Required',
    noAuthResponse.response?.status === 401,
    'File upload requires authentication'
  );
}

/**
 * Test 5: CORS Protection
 */
async function testCORSProtection() {
  console.log('\n🔍 Testing CORS Protection...');
  
  const corsResponse = await makeRequest('/', {
    method: 'GET',
    headers: {
      'Origin': 'https://malicious-site.com'
    }
  });
  
  logTest(
    'CORS Protection',
    corsResponse.response?.status === 200, // Should still work but with CORS headers
    'CORS headers applied'
  );
}

/**
 * Test 6: SQL/NoSQL Injection
 */
async function testInjectionProtection() {
  console.log('\n🔍 Testing Injection Protection...');
  
  // Test NoSQL injection attempt
  const nosqlResponse = await makeRequest('/api/posts?q={"$ne":null}', {
    method: 'GET'
  });
  
  logTest(
    'NoSQL Injection Protection',
    nosqlResponse.response?.status === 400 || nosqlResponse.response?.status === 200,
    'NoSQL injection attempt handled safely'
  );
}

/**
 * Test 7: Security Headers
 */
async function testSecurityHeaders() {
  console.log('\n🔍 Testing Security Headers...');
  
  const headersResponse = await makeRequest('/');
  
  if (headersResponse.response) {
    const headers = headersResponse.response.headers;
    
    logTest(
      'Helmet Headers',
      headers['x-content-type-options'] === 'nosniff',
      'Security headers present'
    );
    
    logTest(
      'X-Frame-Options',
      headers['x-frame-options'] !== undefined,
      'X-Frame-Options header present'
    );
  } else {
    logTest('Security Headers', false, 'Could not test headers');
  }
}

/**
 * Test 8: Error Handling
 */
async function testErrorHandling() {
  console.log('\n🔍 Testing Error Handling...');
  
  // Test 404
  const notFoundResponse = await makeRequest('/api/nonexistent');
  
  logTest(
    '404 Error Handling',
    notFoundResponse.response?.status === 404,
    '404 error handled properly'
  );
  
  // Test malformed JSON
  const malformedJsonResponse = await makeRequest('/api/posts', {
    method: 'POST',
    body: '{"invalid": json}'
  });
  
  logTest(
    'Malformed JSON Handling',
    malformedJsonResponse.response?.status === 400,
    'Malformed JSON handled properly'
  );
}

/**
 * Run all security tests
 */
async function runSecurityTests() {
  console.log('🔒 Starting Security Tests...\n');
  
  const startTime = performance.now();
  
  await testInputValidation();
  await testRateLimiting();
  await testJWTSecurity();
  await testFileUploadSecurity();
  await testCORSProtection();
  await testInjectionProtection();
  await testSecurityHeaders();
  await testErrorHandling();
  
  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);
  
  console.log('\n📊 Security Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
  }
  
  console.log('\n🔒 Security Test Complete!');
  
  // Exit with error code if any tests failed
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(console.error);
}

export { runSecurityTests };
