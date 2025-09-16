// Test script to check imports
import { LOG_LEVELS, SECURITY_EVENTS } from './src/middleware/securityLogging.js';
import { authRequired } from './src/middleware/jwtSecurity.js';
import { validate, registerSchema } from './src/middleware/validation.js';

console.log('✅ All imports successful!');
console.log('LOG_LEVELS:', LOG_LEVELS);
console.log('SECURITY_EVENTS:', Object.keys(SECURITY_EVENTS).length, 'events');
console.log('authRequired function:', typeof authRequired);
console.log('validate function:', typeof validate);
console.log('registerSchema:', typeof registerSchema);
