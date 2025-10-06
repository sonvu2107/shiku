/**
 * CORS and CSRF Test Script
 * 
 * This script tests CORS preflight requests and CSRF token retrieval
 * Run it with Node.js: node test-cors.js
 */

const testCORS = async () => {
  const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
  const serverUrl = process.env.SERVER_URL || 'http://localhost:4000';
  
  console.log(`Testing CORS from ${clientOrigin} to ${serverUrl}`);
  
  // Test 1: OPTIONS preflight request
  console.log('\n=== Test 1: CORS Preflight Request ===');
  try {
    const preflightResponse = await fetch(`${serverUrl}/api/csrf-token`, {
      method: 'OPTIONS',
      headers: {
        'Origin': clientOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type, authorization'
      }
    });
    
    console.log(`Preflight Status: ${preflightResponse.status}`);
    console.log(`Access-Control-Allow-Origin: ${preflightResponse.headers.get('access-control-allow-origin')}`);
    console.log(`Access-Control-Allow-Methods: ${preflightResponse.headers.get('access-control-allow-methods')}`);
    console.log(`Access-Control-Allow-Headers: ${preflightResponse.headers.get('access-control-allow-headers')}`);
    console.log(`Access-Control-Allow-Credentials: ${preflightResponse.headers.get('access-control-allow-credentials')}`);
    
    console.log('✓ CORS Preflight request successful');
  } catch (error) {
    console.error('✗ CORS Preflight request failed:', error.message);
  }
  
  // Test 2: Get CSRF Token
  console.log('\n=== Test 2: CSRF Token Retrieval ===');
  try {
    const csrfResponse = await fetch(`${serverUrl}/api/csrf-token`, {
      method: 'GET',
      headers: {
        'Origin': clientOrigin
      },
      credentials: 'include'
    });
    
    const csrfData = await csrfResponse.json();
    console.log(`Response Status: ${csrfResponse.status}`);
    console.log('CSRF Token:', csrfData.csrfToken);
    console.log('SessionID Cookie Present:', csrfResponse.headers.get('set-cookie') ? 'Yes' : 'No');
    
    console.log('✓ CSRF token retrieval successful');
    
    return {
      csrfToken: csrfData.csrfToken,
      cookies: csrfResponse.headers.get('set-cookie')
    };
  } catch (error) {
    console.error('✗ CSRF token retrieval failed:', error.message);
    return null;
  }
};

testCORS().then(() => {
  console.log('\nTests completed. Check the results above to verify CORS and CSRF functionality.');
});