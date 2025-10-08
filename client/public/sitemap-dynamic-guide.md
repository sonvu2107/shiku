# Hướng dẫn tạo Sitemap động cho Shiku

## Tổng quan
File `sitemap.xml` hiện tại chỉ chứa các trang tĩnh. Để tối ưu SEO hoàn toàn, bạn cần thêm các trang động như bài viết, người dùng, nhóm, và sự kiện.

## Cách 1: Tạo API endpoint sitemap động (Khuyến nghị)

### 1. Tạo route sitemap trong server
Tạo file `server/src/routes/sitemap.js`:

```javascript
import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Event from '../models/Event.js';

const router = express.Router();

// Generate dynamic sitemap
router.get('/', async (req, res) => {
  try {
    const baseUrl = 'https://shiku.click';
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages (copy từ sitemap.xml hiện tại)
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/login', priority: '0.6', changefreq: 'monthly' },
      { url: '/register', priority: '0.6', changefreq: 'monthly' },
      { url: '/explore', priority: '0.8', changefreq: 'daily' },
      { url: '/groups', priority: '0.7', changefreq: 'daily' },
      { url: '/events', priority: '0.7', changefreq: 'daily' },
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

    // Get published posts
    const posts = await Post.find({ status: 'published' })
      .select('_id title updatedAt')
      .sort({ updatedAt: -1 })
      .limit(1000); // Giới hạn 1000 bài viết mới nhất

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

    // Get public users (có thể thêm filter cho public profiles)
    const users = await User.find({ 
      isBanned: false,
      // Thêm điều kiện cho public profiles nếu có
    })
      .select('_id name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(500);

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

    // Get public groups
    const groups = await Group.find({ 
      isActive: true,
      // Thêm điều kiện cho public groups nếu có
    })
      .select('_id name updatedAt')
      .sort({ updatedAt: -1 })
      .limit(200);

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

    // Get active events
    const events = await Event.find({ 
      isActive: true,
      date: { $gte: new Date() } // Chỉ lấy sự kiện sắp tới
    })
      .select('_id title updatedAt')
      .sort({ date: 1 })
      .limit(100);

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

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
```

### 2. Thêm route vào server chính
Trong `server/src/index.js`, thêm:

```javascript
import sitemapRoutes from './routes/sitemap.js';

// Thêm route
app.use('/api/sitemap', sitemapRoutes);
```

### 3. Cập nhật sitemap.xml tĩnh
Thay thế nội dung `client/public/sitemap.xml` bằng:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://shiku.click/api/sitemap</loc>
    <lastmod>2025-01-28</lastmod>
  </sitemap>
</sitemapindex>
```

## Cách 2: Script tạo sitemap định kỳ

### 1. Tạo script `server/scripts/generate-sitemap.js`:

```javascript
import fs from 'fs';
import path from 'path';
import Post from '../src/models/Post.js';
import User from '../src/models/User.js';
import Group from '../src/models/Group.js';
import Event from '../src/models/Event.js';
import '../src/config/db.js'; // Kết nối database

async function generateSitemap() {
  const baseUrl = 'https://shiku.click';
  const currentDate = new Date().toISOString().split('T')[0];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/login', priority: '0.6', changefreq: 'monthly' },
    { url: '/register', priority: '0.6', changefreq: 'monthly' },
    { url: '/explore', priority: '0.8', changefreq: 'daily' },
    { url: '/groups', priority: '0.7', changefreq: 'daily' },
    { url: '/events', priority: '0.7', changefreq: 'daily' },
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

  // Get dynamic content
  const [posts, users, groups, events] = await Promise.all([
    Post.find({ status: 'published' }).select('_id updatedAt').limit(1000),
    User.find({ isBanned: false }).select('_id updatedAt').limit(500),
    Group.find({ isActive: true }).select('_id updatedAt').limit(200),
    Event.find({ isActive: true, date: { $gte: new Date() } }).select('_id updatedAt').limit(100)
  ]);

  // Add posts
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

  // Add users
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

  // Add groups
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

  // Add events
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

  // Write to file
  const sitemapPath = path.join(process.cwd(), 'client', 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log('Sitemap generated successfully!');
  process.exit(0);
}

generateSitemap().catch(console.error);
```

### 2. Thêm script vào package.json:

```json
{
  "scripts": {
    "generate-sitemap": "node server/scripts/generate-sitemap.js"
  }
}
```

### 3. Chạy script:

```bash
npm run generate-sitemap
```

## Cách 3: Cập nhật thủ công

Khi có nội dung mới quan trọng, bạn có thể thêm thủ công vào `sitemap.xml`:

```xml
<url>
  <loc>https://shiku.click/post/bai-viet-moi</loc>
  <lastmod>2025-01-28</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

## Lưu ý quan trọng

1. **Giới hạn số lượng**: Không nên có quá 50,000 URLs trong một sitemap
2. **Cập nhật thường xuyên**: Chạy script định kỳ (hàng ngày/tuần)
3. **Kiểm tra lỗi**: Đảm bảo tất cả URLs đều accessible
4. **Submit Google**: Sau khi cập nhật, submit lại trong Google Search Console

## Khuyến nghị

- **Cách 1** (API endpoint) là tốt nhất cho production
- **Cách 2** (script) phù hợp cho VPS/server riêng
- **Cách 3** (thủ công) chỉ dùng cho nội dung đặc biệt quan trọng
