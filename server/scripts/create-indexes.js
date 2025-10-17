/**
 * ═══════════════════════════════════════════════════════════════════
 * PHASE 4: CREATE DATABASE INDEXES
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Script này tạo indexes cho tất cả collections để tối ưu query performance
 * Expected improvement: 50-70% latency reduction
 * 
 * Chạy: node scripts/create-indexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';
import Comment from '../src/models/Comment.js';
import Notification from '../src/models/Notification.js';
import Event from '../src/models/Event.js';
import Group from '../src/models/Group.js';

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m',
};

async function createIndexes() {
  try {
    console.log(`\n${COLORS.CYAN}${'═'.repeat(70)}`);
    console.log('🚀 PHASE 4: CREATING DATABASE INDEXES');
    console.log(`${'═'.repeat(70)}${COLORS.RESET}\n`);

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${COLORS.GREEN}✅ Connected to MongoDB${COLORS.RESET}\n`);

    console.log('📊 Creating indexes for all collections...\n');

    // ═══════════════════════════════════════════════════════════════
    // USER INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`${COLORS.YELLOW}👤 User Collection:${COLORS.RESET}`);
    
    try {
      await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
      console.log('   ✅ Index created: { email: 1 } (unique)');
    } catch (e) {
      console.log('   ⏭️  Index exists: { email: 1 }');
    }

    try {
      await User.collection.createIndex({ username: 1 }, { sparse: true, background: true });
      console.log('   ✅ Index created: { username: 1 } (sparse)');
    } catch (e) {
      console.log('   ⏭️  Index exists: { username: 1 }');
    }

    await User.collection.createIndex({ createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { createdAt: -1 }');

    await User.collection.createIndex({ role: 1 }, { background: true });
    console.log('   ✅ Index created: { role: 1 }');

    // ═══════════════════════════════════════════════════════════════
    // POST INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${COLORS.YELLOW}📝 Post Collection:${COLORS.RESET}`);
    
    await Post.collection.createIndex({ createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { createdAt: -1 }');

    await Post.collection.createIndex({ author: 1, createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { author: 1, createdAt: -1 }');

    await Post.collection.createIndex({ 'likes.user': 1 }, { background: true });
    console.log('   ✅ Index created: { "likes.user": 1 }');

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${COLORS.YELLOW}🔔 Notification Collection:${COLORS.RESET}`);
    
    await Notification.collection.createIndex({ recipient: 1, isRead: 1 }, { background: true });
    console.log('   ✅ Index created: { recipient: 1, isRead: 1 }');

    await Notification.collection.createIndex({ recipient: 1, createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { recipient: 1, createdAt: -1 }');

    await Notification.collection.createIndex({ createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { createdAt: -1 }');

    // ═══════════════════════════════════════════════════════════════
    // COMMENT INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${COLORS.YELLOW}💬 Comment Collection:${COLORS.RESET}`);
    
    await Comment.collection.createIndex({ post: 1 }, { background: true });
    console.log('   ✅ Index created: { post: 1 } - For comment count aggregation');

    await Comment.collection.createIndex({ post: 1, createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { post: 1, createdAt: -1 } - For sorted comments');

    await Comment.collection.createIndex({ author: 1, createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { author: 1, createdAt: -1 } - For user comments');

    // ═══════════════════════════════════════════════════════════════
    // EVENT INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${COLORS.YELLOW}📅 Event Collection:${COLORS.RESET}`);
    
    await Event.collection.createIndex({ date: -1 }, { background: true });
    console.log('   ✅ Index created: { date: -1 }');

    await Event.collection.createIndex({ creator: 1, date: -1 }, { background: true });
    console.log('   ✅ Index created: { creator: 1, date: -1 }');

    await Event.collection.createIndex({ 'attendees.user': 1 }, { background: true });
    console.log('   ✅ Index created: { "attendees.user": 1 }');

    // ═══════════════════════════════════════════════════════════════
    // GROUP INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${COLORS.YELLOW}👥 Group Collection:${COLORS.RESET}`);
    
    await Group.collection.createIndex({ createdAt: -1 }, { background: true });
    console.log('   ✅ Index created: { createdAt: -1 }');

    await Group.collection.createIndex({ creator: 1 }, { background: true });
    console.log('   ✅ Index created: { creator: 1 }');

    await Group.collection.createIndex({ 'members.user': 1 }, { background: true });
    console.log('   ✅ Index created: { "members.user": 1 }');

    // ═══════════════════════════════════════════════════════════════
    // VERIFY INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n${COLORS.CYAN}${'═'.repeat(70)}`);
    console.log('📊 VERIFYING INDEXES');
    console.log(`${'═'.repeat(70)}${COLORS.RESET}\n`);

    const models = [
      { name: 'User', model: User },
      { name: 'Post', model: Post },
      { name: 'Comment', model: Comment },
      { name: 'Notification', model: Notification },
      { name: 'Event', model: Event },
      { name: 'Group', model: Group },
    ];

    for (const { name, model } of models) {
      const indexes = await model.collection.getIndexes();
      console.log(`${COLORS.YELLOW}${name}:${COLORS.RESET}`);
      Object.entries(indexes).forEach(([indexName, indexDetails]) => {
        const keys = JSON.stringify(indexDetails.key);
        const unique = indexDetails.unique ? ' (unique)' : '';
        const sparse = indexDetails.sparse ? ' (sparse)' : '';
        console.log(`   • ${indexName}: ${keys}${unique}${sparse}`);
      });
      console.log('');
    }

    console.log(`${COLORS.GREEN}${'═'.repeat(70)}`);
    console.log('✅ ALL INDEXES CREATED SUCCESSFULLY!');
    console.log(`${'═'.repeat(70)}${COLORS.RESET}\n`);

    console.log('📈 Expected Performance Improvements:');
    console.log('   • Query speed: 50-70% faster');
    console.log('   • Average latency: 491ms → ~200ms');
    console.log('   • P95 latency: 1099ms → ~350ms\n');

    console.log('🔄 Next Steps:');
    console.log('   1. Restart server to use new indexes');
    console.log('   2. Run load test: node quick-load-test.js');
    console.log('   3. Compare results with Phase 3 baseline\n');

  } catch (error) {
    console.error(`\n${COLORS.RESET}❌ Error creating indexes:`, error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed\n');
  }
}

createIndexes();
