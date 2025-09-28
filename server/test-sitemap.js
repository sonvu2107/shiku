/**
 * Test script cho sitemap API
 * Chạy: node test-sitemap.js
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://shiku.click' 
  : 'http://localhost:5000';

async function testSitemapAPI() {
  console.log('🧪 Testing Sitemap API...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/sitemap/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');
    
    // Test sitemap generation
    console.log('2. Testing sitemap generation...');
    const sitemapResponse = await fetch(`${BASE_URL}/api/sitemap`);
    
    if (!sitemapResponse.ok) {
      throw new Error(`HTTP ${sitemapResponse.status}: ${sitemapResponse.statusText}`);
    }
    
    const sitemapContent = await sitemapResponse.text();
    
    // Basic validation
    console.log('✅ Sitemap generated successfully');
    console.log(`📊 Content length: ${sitemapContent.length} characters`);
    console.log(`📄 Content type: ${sitemapResponse.headers.get('content-type')}`);
    
    // Count URLs
    const urlMatches = sitemapContent.match(/<url>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;
    console.log(`🔗 Total URLs: ${urlCount}`);
    
    // Check for required elements
    const hasXmlDeclaration = sitemapContent.includes('<?xml version="1.0"');
    const hasUrlset = sitemapContent.includes('<urlset');
    const hasStaticPages = sitemapContent.includes('https://shiku.click/');
    const hasDynamicContent = sitemapContent.includes('/post/') || sitemapContent.includes('/user/');
    
    console.log('\n📋 Validation results:');
    console.log(`✅ XML declaration: ${hasXmlDeclaration}`);
    console.log(`✅ URLset element: ${hasUrlset}`);
    console.log(`✅ Static pages: ${hasStaticPages}`);
    console.log(`✅ Dynamic content: ${hasDynamicContent}`);
    
    // Show sample URLs
    console.log('\n📝 Sample URLs:');
    const urlLines = sitemapContent.split('\n').filter(line => line.includes('<loc>'));
    urlLines.slice(0, 5).forEach((line, index) => {
      const url = line.match(/<loc>(.*?)<\/loc>/)?.[1];
      if (url) {
        console.log(`   ${index + 1}. ${url}`);
      }
    });
    
    if (urlLines.length > 5) {
      console.log(`   ... and ${urlLines.length - 5} more URLs`);
    }
    
    console.log('\n🎉 Sitemap API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testSitemapAPI();
