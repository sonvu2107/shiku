#!/usr/bin/env node

/**
 * Simple Endpoint Test
 * Test các endpoint cơ bản
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function testEndpoints() {
  console.log('🧪 Testing Endpoints...\n');
  
  const endpoints = [
    { method: 'GET', path: '/', name: 'Health Check' },
    { method: 'GET', path: '/health', name: 'Detailed Health' },
    { method: 'GET', path: '/api/auth/me', name: 'Auth Me (no token)' },
    { method: 'POST', path: '/api/auth/login', name: 'Auth Login' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📤 Testing ${endpoint.name}: ${endpoint.method} ${endpoint.path}`);
      
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (endpoint.method === 'POST') {
        options.body = JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      }
      
      const response = await fetch(`${BASE_URL}${endpoint.path}`, options);
      const data = await response.json().catch(() => ({}));
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEndpoints().catch(console.error);
}

export { testEndpoints };
