import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Event from '../models/Event.js';

const router = express.Router();

/**
 * Sitemap Routes - API routes cho sitemap động
 * Generate sitemap.xml với tất cả nội dung từ database
 */

// Generate dynamic sitemap
router.get('/', async (req, res) => {
  try {
    const envBase = process.env.SITE_BASE_URL && process.env.SITE_BASE_URL.trim();
    const inferredBase = `${req.protocol}://${req.get('host')}`;
    const baseUrl = envBase || inferredBase;
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // ==================== TRANG TĨNH ====================
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/login', priority: '0.6', changefreq: 'monthly' },
      { url: '/register', priority: '0.6', changefreq: 'monthly' },
      { url: '/reset-password', priority: '0.4', changefreq: 'monthly' },
      { url: '/explore', priority: '0.8', changefreq: 'daily' },
      { url: '/groups', priority: '0.7', changefreq: 'daily' },
      { url: '/groups/create', priority: '0.5', changefreq: 'monthly' },
      { url: '/events', priority: '0.7', changefreq: 'daily' },
      { url: '/events/create', priority: '0.5', changefreq: 'monthly' },
      { url: '/media', priority: '0.6', changefreq: 'daily' },
      { url: '/friends', priority: '0.6', changefreq: 'daily' },
      { url: '/support', priority: '0.5', changefreq: 'monthly' }
    ];

    // Add static pages
    staticPages.forEach(page => {
      sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // ==================== NỘI DUNG ĐỘNG ====================
    
    // Get published posts (giới hạn 1000 bài mới nhất)
    const posts = await Post.find({ 
      status: 'published',
      // Loại trừ bài viết trong group khỏi homepage
      $and: [
        {
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        }
      ]
    })
      .select('_id title updatedAt')
      .sort({ updatedAt: -1 })
      .limit(1000);

    console.log(`Found ${posts.length} published posts`);

    posts.forEach(post => {
      const lastmod = new Date(post.updatedAt).toISOString().split('T')[0];
      sitemap += `
  <url>
    <loc>${baseUrl}/post/${post._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Get public users (không bị ban, giới hạn 500 user)
    const users = await User.find({ 
      isBanned: false,
      // Có thể thêm điều kiện cho public profiles nếu cần
    })
      .select('_id name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(500);

    console.log(`Found ${users.length} public users`);

    users.forEach(user => {
      const lastmod = new Date(user.updatedAt).toISOString().split('T')[0];
      sitemap += `
  <url>
    <loc>${baseUrl}/user/${user._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    // Get public groups (active, giới hạn 200 nhóm)
    const groups = await Group.find({ 
      isActive: true,
      // Có thể thêm điều kiện cho public groups nếu cần
    })
      .select('_id name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(200);

    console.log(`Found ${groups.length} active groups`);

    groups.forEach(group => {
      const lastmod = new Date(group.updatedAt).toISOString().split('T')[0];
      sitemap += `
  <url>
    <loc>${baseUrl}/groups/${group._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // Get active events (sự kiện sắp tới, giới hạn 100 sự kiện)
    const events = await Event.find({ 
      isActive: true,
      date: { $gte: new Date() } // Chỉ lấy sự kiện sắp tới
    })
      .select('_id title updatedAt')
      .sort({ date: 1 })
      .limit(100);

    console.log(`Found ${events.length} upcoming events`);

    events.forEach(event => {
      const lastmod = new Date(event.updatedAt).toISOString().split('T')[0];
      sitemap += `
  <url>
    <loc>${baseUrl}/events/${event._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    // Set proper headers
    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600' // Cache 1 hour
    });
    
    res.send(sitemap);
    
    console.log(`Sitemap generated successfully for ${baseUrl} with ${staticPages.length + posts.length + users.length + groups.length + events.length} URLs`);
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ 
      error: 'Error generating sitemap',
      message: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Sitemap API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
