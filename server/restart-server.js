#!/usr/bin/env node

/**
 * Simple script to restart the server
 * This will help load the new API monitoring routes
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔄 Restarting server to load new routes...');

// Kill existing node processes (be careful in production)
const killProcesses = () => {
  return new Promise((resolve) => {
    const kill = spawn('taskkill', ['/F', '/IM', 'node.exe'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    kill.on('close', (code) => {
      console.log(`Killed processes with code: ${code}`);
      setTimeout(resolve, 2000); // Wait 2 seconds
    });
  });
};

// Start server
const startServer = () => {
  console.log('🚀 Starting server...');
  const server = spawn('node', ['src/index-secure.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
  
  server.on('close', (code) => {
    console.log(`Server exited with code: ${code}`);
  });
  
  return server;
};

// Main function
const main = async () => {
  try {
    console.log('⚠️  This will kill all Node.js processes and restart the server.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Kill existing processes
    await killProcesses();
    
    // Start server
    const server = startServer();
    
    console.log('✅ Server restarted! API monitoring routes should now be available.');
    console.log('Test with: curl http://localhost:4000/api/api-monitoring/health');
    
  } catch (error) {
    console.error('Error restarting server:', error);
  }
};

main();
