#!/usr/bin/env node

/**
 * Test Server Startup
 * Test xem server có start được không và có warning nào không
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testServerStartup() {
  console.log('🚀 Testing Server Startup...\n');
  
  // Start server
  const serverProcess = spawn('node', ['src/index-secure.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });
  
  let output = '';
  let hasWarnings = false;
  let hasErrors = false;
  
  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log('📤 STDOUT:', text.trim());
    
    // Check for warnings
    if (text.includes('warning') || text.includes('Warning') || text.includes('WARN')) {
      hasWarnings = true;
    }
    
    // Check for errors
    if (text.includes('error') || text.includes('Error') || text.includes('ERROR')) {
      hasErrors = true;
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log('❌ STDERR:', text.trim());
    
    // Check for warnings
    if (text.includes('warning') || text.includes('Warning') || text.includes('WARN')) {
      hasWarnings = true;
    }
    
    // Check for errors
    if (text.includes('error') || text.includes('Error') || text.includes('ERROR')) {
      hasErrors = true;
    }
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n📊 Server Process Exited with code: ${code}`);
    
    if (hasWarnings) {
      console.log('⚠️  Warnings detected in server startup');
    } else {
      console.log('✅ No warnings detected');
    }
    
    if (hasErrors) {
      console.log('❌ Errors detected in server startup');
    } else {
      console.log('✅ No errors detected');
    }
    
    // Check for specific rate limit warnings
    if (output.includes('onLimitReached') || output.includes('deprecated')) {
      console.log('❌ Deprecated rate limit options detected');
    } else {
      console.log('✅ No deprecated rate limit options detected');
    }
    
    console.log('\n📝 Full Output:');
    console.log(output);
  });
  
  // Kill server after 10 seconds
  setTimeout(() => {
    console.log('\n⏰ Killing server after 10 seconds...');
    serverProcess.kill('SIGTERM');
  }, 10000);
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testServerStartup();
}

export { testServerStartup };
