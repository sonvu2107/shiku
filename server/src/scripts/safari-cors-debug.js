#!/usr/bin/env node

/**
 * Safari CORS Debug Tool
 * 
 * This script simulates Safari's strict CORS behavior to test your API
 * It makes preflight requests and follows up with actual requests
 * Run with: node safari-cors-debug.js [your-server-url]
 */

// Default configuration - change these values as needed
const CONFIG = {
  serverUrl: process.argv[2] || 'http://localhost:4000',
  clientOrigin: 'http://localhost:3000',
  endpoints: [
    '/api/csrf-token',
    '/api/auth/refresh-token',
    '/api/auth/check'
  ],
  // Safari's user agent string
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
  // Common headers Safari sends with preflight
  preflightHeaders: {
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-dest': 'empty'
  }
};

const fetch = require('node-fetch');
const chalk = require('chalk') || {
  green: (text) => `✓ ${text}`,
  red: (text) => `✗ ${text}`,
  yellow: (text) => `⚠️ ${text}`,
  blue: (text) => `ℹ️ ${text}`,
  bold: (text) => `${text}`
};

/**
 * Simulate Safari CORS preflight request
 */
async function testPreflightRequest(endpoint) {
  console.log(chalk.blue(`Testing OPTIONS preflight for ${endpoint}...`));
  
  try {
    const response = await fetch(`${CONFIG.serverUrl}${endpoint}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': CONFIG.clientOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type, authorization, x-csrf-token',
        'User-Agent': CONFIG.userAgent,
        ...CONFIG.preflightHeaders
      }
    });
    
    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowCredentials = response.headers.get('access-control-allow-credentials');
    const allowMethods = response.headers.get('access-control-allow-methods');
    const allowHeaders = response.headers.get('access-control-allow-headers');
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Access-Control-Allow-Origin: ${allowOrigin || 'missing!'}`);
    console.log(`  Access-Control-Allow-Credentials: ${allowCredentials || 'missing!'}`);
    console.log(`  Access-Control-Allow-Methods: ${allowMethods || 'missing!'}`);
    console.log(`  Access-Control-Allow-Headers: ${allowHeaders || 'missing!'}`);
    
    let valid = true;
    
    if (response.status !== 200 && response.status !== 204) {
      console.log(chalk.red('  ✗ Preflight should return 200 OK or 204 No Content'));
      valid = false;
    }
    
    if (!allowOrigin) {
      console.log(chalk.red('  ✗ Missing Access-Control-Allow-Origin header'));
      valid = false;
    } else if (allowOrigin !== CONFIG.clientOrigin && allowOrigin !== '*') {
      console.log(chalk.red(`  ✗ Access-Control-Allow-Origin should be '${CONFIG.clientOrigin}' or '*'`));
      valid = false;
    }
    
    if (!allowCredentials || allowCredentials !== 'true') {
      console.log(chalk.red('  ✗ Missing or invalid Access-Control-Allow-Credentials header'));
      valid = false;
    }
    
    if (!allowMethods) {
      console.log(chalk.red('  ✗ Missing Access-Control-Allow-Methods header'));
      valid = false;
    } else if (!allowMethods.includes('GET')) {
      console.log(chalk.red('  ✗ Access-Control-Allow-Methods should include GET'));
      valid = false;
    }
    
    if (!allowHeaders) {
      console.log(chalk.red('  ✗ Missing Access-Control-Allow-Headers header'));
      valid = false;
    } else {
      const reqHeaders = ['content-type', 'authorization', 'x-csrf-token'];
      for (const header of reqHeaders) {
        if (!allowHeaders.toLowerCase().includes(header)) {
          console.log(chalk.red(`  ✗ Access-Control-Allow-Headers should include ${header}`));
          valid = false;
        }
      }
    }
    
    if (valid) {
      console.log(chalk.green('  ✓ Preflight request passed all checks!'));
    } else {
      console.log(chalk.yellow('  ⚠️ Preflight request has issues that may block Safari'));
    }
    
    return valid;
  } catch (error) {
    console.log(chalk.red(`  ✗ Preflight request failed: ${error.message}`));
    return false;
  }
}

/**
 * Simulate Safari actual request
 */
async function testActualRequest(endpoint) {
  console.log(chalk.blue(`Testing actual GET request for ${endpoint}...`));
  
  try {
    const response = await fetch(`${CONFIG.serverUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Origin': CONFIG.clientOrigin,
        'User-Agent': CONFIG.userAgent,
        ...CONFIG.preflightHeaders
      },
      credentials: 'include'
    });
    
    console.log(`  Status: ${response.status}`);
    
    try {
      const body = await response.text();
      console.log(`  Response length: ${body.length} characters`);
      try {
        const json = JSON.parse(body);
        console.log('  JSON response:', JSON.stringify(json, null, 2).substring(0, 200) + (json.length > 200 ? '...' : ''));
      } catch (e) {
        // Not JSON, that's fine
        console.log(`  Text response: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
      }
    } catch (e) {
      console.log('  Could not read response body');
    }
    
    if (response.status >= 200 && response.status < 300) {
      console.log(chalk.green('  ✓ Actual request successful!'));
      return true;
    } else {
      console.log(chalk.yellow(`  ⚠️ Request returned status ${response.status}`));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ Actual request failed: ${error.message}`));
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(chalk.bold(`Safari CORS Compatibility Test`));
  console.log(`Server URL: ${CONFIG.serverUrl}`);
  console.log(`Client Origin: ${CONFIG.clientOrigin}\n`);
  
  let allPassed = true;
  
  for (const endpoint of CONFIG.endpoints) {
    console.log(chalk.bold(`\n=== Testing ${endpoint} ===`));
    
    const preflightPassed = await testPreflightRequest(endpoint);
    if (preflightPassed) {
      const requestPassed = await testActualRequest(endpoint);
      allPassed = allPassed && requestPassed;
    } else {
      console.log(chalk.yellow('  ⚠️ Skipping actual request due to preflight failure'));
      allPassed = false;
    }
  }
  
  console.log('\n' + chalk.bold('=== Summary ==='));
  if (allPassed) {
    console.log(chalk.green('✓ All tests passed! Your API should work with Safari.'));
  } else {
    console.log(chalk.yellow('⚠️ Some tests failed. Safari may have issues with your API.'));
    console.log('Make sure your CORS middleware:');
    console.log('1. Runs BEFORE any other middleware (especially CSRF)');
    console.log('2. Has the correct origin configuration');
    console.log('3. Includes credentials: true');
    console.log('4. Allows all necessary methods and headers');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test script error:', error);
});