#!/usr/bin/env node

/**
 * Rate Limit Monitor Script
 * Monitor và phân tích rate limiting usage patterns
 * Usage: node scripts/monitor-rate-limits.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình rate limits hiện tại
const RATE_LIMITS = {
  api: { windowMs: 15 * 60 * 1000, max: 1000, name: 'General API' },
  auth: { windowMs: 15 * 60 * 1000, max: 20, name: 'Authentication' },
  authStatus: { windowMs: 1 * 60 * 1000, max: 60, name: 'Auth Status' },
  upload: { windowMs: 15 * 60 * 1000, max: 50, name: 'File Upload' },
  message: { windowMs: 1 * 60 * 1000, max: 100, name: 'Messages' },
  posts: { windowMs: 15 * 60 * 1000, max: 500, name: 'Posts' }
};

// Đọc logs từ security logs
function readSecurityLogs() {
  const logsDir = path.join(__dirname, '../logs');
  const logFiles = fs.readdirSync(logsDir).filter(file => file.startsWith('security-'));
  
  const allLogs = [];
  
  logFiles.forEach(file => {
    const filePath = path.join(logsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      try {
        const log = JSON.parse(line);
        allLogs.push(log);
      } catch (e) {
        // Skip invalid JSON lines
      }
    });
  });
  
  return allLogs;
}

// Phân tích rate limit events
function analyzeRateLimits(logs) {
  const rateLimitEvents = logs.filter(log => 
    log.event === 'RATE_LIMIT_EXCEEDED' || 
    log.message?.includes('Rate limit') ||
    log.message?.includes('rate limit')
  );
  
  console.log(`\n📊 RATE LIMIT ANALYSIS`);
  console.log(`Total rate limit events: ${rateLimitEvents.length}`);
  
  if (rateLimitEvents.length === 0) {
    console.log('✅ No rate limit events found in logs');
    return;
  }
  
  // Group by IP
  const byIP = {};
  rateLimitEvents.forEach(event => {
    const ip = event.ip || event.clientIP || 'unknown';
    if (!byIP[ip]) {
      byIP[ip] = [];
    }
    byIP[ip].push(event);
  });
  
  console.log(`\n🔍 Rate limit events by IP:`);
  Object.entries(byIP).forEach(([ip, events]) => {
    console.log(`  ${ip}: ${events.length} events`);
    events.forEach(event => {
      const time = new Date(event.timestamp || event.time).toLocaleString();
      console.log(`    - ${time}: ${event.message || event.event}`);
    });
  });
  
  // Group by endpoint type
  const byEndpoint = {};
  rateLimitEvents.forEach(event => {
    const url = event.url || event.path || 'unknown';
    let endpoint = 'unknown';
    
    if (url.includes('/api/auth')) endpoint = 'auth';
    else if (url.includes('/api/posts')) endpoint = 'posts';
    else if (url.includes('/api/uploads')) endpoint = 'upload';
    else if (url.includes('/api/messages')) endpoint = 'message';
    else if (url.includes('/api/')) endpoint = 'api';
    
    if (!byEndpoint[endpoint]) {
      byEndpoint[endpoint] = 0;
    }
    byEndpoint[endpoint]++;
  });
  
  console.log(`\n📈 Rate limit events by endpoint:`);
  Object.entries(byEndpoint).forEach(([endpoint, count]) => {
    const limit = RATE_LIMITS[endpoint];
    const limitInfo = limit ? ` (${limit.max}/${limit.windowMs/1000}s)` : '';
    console.log(`  ${endpoint}${limitInfo}: ${count} events`);
  });
}

// Phân tích API usage patterns
function analyzeAPIUsage(logs) {
  const apiLogs = logs.filter(log => 
    log.url?.includes('/api/') || 
    log.path?.includes('/api/')
  );
  
  console.log(`\n📊 API USAGE ANALYSIS`);
  console.log(`Total API calls logged: ${apiLogs.length}`);
  
  if (apiLogs.length === 0) {
    console.log('⚠️ No API calls found in logs');
    return;
  }
  
  // Group by endpoint
  const byEndpoint = {};
  apiLogs.forEach(log => {
    const url = log.url || log.path || 'unknown';
    const endpoint = url.split('?')[0]; // Remove query params
    
    if (!byEndpoint[endpoint]) {
      byEndpoint[endpoint] = { count: 0, methods: new Set() };
    }
    byEndpoint[endpoint].count++;
    if (log.method) {
      byEndpoint[endpoint].methods.add(log.method);
    }
  });
  
  // Sort by count
  const sortedEndpoints = Object.entries(byEndpoint)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 20); // Top 20
  
  console.log(`\n🔥 Top API endpoints by usage:`);
  sortedEndpoints.forEach(([endpoint, data]) => {
    const methods = Array.from(data.methods).join(', ');
    console.log(`  ${endpoint}: ${data.count} calls (${methods})`);
  });
  
  // Group by IP
  const byIP = {};
  apiLogs.forEach(log => {
    const ip = log.ip || log.clientIP || 'unknown';
    if (!byIP[ip]) {
      byIP[ip] = 0;
    }
    byIP[ip]++;
  });
  
  // Sort by count
  const sortedIPs = Object.entries(byIP)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10); // Top 10
  
  console.log(`\n🌐 Top IPs by API usage:`);
  sortedIPs.forEach(([ip, count]) => {
    console.log(`  ${ip}: ${count} calls`);
  });
}

// Tính toán recommendations
function generateRecommendations() {
  console.log(`\n💡 RATE LIMIT RECOMMENDATIONS`);
  
  console.log(`\n📋 Current Rate Limits:`);
  Object.entries(RATE_LIMITS).forEach(([key, limit]) => {
    const requestsPerMinute = Math.round(limit.max / (limit.windowMs / 60000));
    console.log(`  ${limit.name}: ${limit.max} requests / ${limit.windowMs/60000}min (${requestsPerMinute}/min)`);
  });
  
  console.log(`\n🎯 Recommended Adjustments:`);
  
  // Posts rate limiting
  console.log(`\n1. POSTS RATE LIMITING:`);
  console.log(`   Current: 500 requests / 15min (33/min)`);
  console.log(`   Analysis: Infinite scroll needs more requests`);
  console.log(`   Recommendation: Increase to 800 requests / 15min (53/min)`);
  console.log(`   Reason: Support heavy infinite scroll usage`);
  
  // General API rate limiting
  console.log(`\n2. GENERAL API RATE LIMITING:`);
  console.log(`   Current: 1000 requests / 15min (67/min)`);
  console.log(`   Analysis: Good for most users`);
  console.log(`   Recommendation: Keep current or increase to 1200/15min`);
  console.log(`   Reason: Covers all non-specific endpoints`);
  
  // Message rate limiting
  console.log(`\n3. MESSAGE RATE LIMITING:`);
  console.log(`   Current: 100 requests / 1min`);
  console.log(`   Analysis: Good for active chat users`);
  console.log(`   Recommendation: Keep current`);
  console.log(`   Reason: Prevents spam while allowing active chat`);
  
  // Upload rate limiting
  console.log(`\n4. UPLOAD RATE LIMITING:`);
  console.log(`   Current: 50 requests / 15min (3.3/min)`);
  console.log(`   Analysis: Good for content creators`);
  console.log(`   Recommendation: Keep current or increase to 60/15min`);
  console.log(`   Reason: Supports batch uploads`);
  
  // Auth rate limiting
  console.log(`\n5. AUTH RATE LIMITING:`);
  console.log(`   Current: 20 requests / 15min (1.3/min)`);
  console.log(`   Analysis: Strict for security`);
  console.log(`   Recommendation: Keep current`);
  console.log(`   Reason: Security is more important than convenience`);
  
  console.log(`\n🔧 IMPLEMENTATION SUGGESTIONS:`);
  console.log(`1. Add rate limit headers to responses`);
  console.log(`2. Implement client-side rate limit awareness`);
  console.log(`3. Add exponential backoff for retries`);
  console.log(`4. Cache frequently accessed data`);
  console.log(`5. Use WebSocket for real-time features`);
  console.log(`6. Implement request batching where possible`);
}

// Main function
function main() {
  console.log('🚀 RATE LIMIT MONITOR');
  console.log('====================');
  
  try {
    const logs = readSecurityLogs();
    console.log(`📁 Loaded ${logs.length} log entries`);
    
    analyzeRateLimits(logs);
    analyzeAPIUsage(logs);
    generateRecommendations();
    
    console.log(`\n✅ Analysis complete!`);
    
  } catch (error) {
    console.error('❌ Error analyzing logs:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as analyzeRateLimits };
