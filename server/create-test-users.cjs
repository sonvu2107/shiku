/**
 * ═══════════════════════════════════════════════════════════════════
 * CREATE TEST USERS FOR LOAD TESTING
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Script này tạo test users để dùng cho load testing
 * Chạy từ server folder: node create-test-users.cjs
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const TEST_USERS = [
  { email: 'test1@example.com', password: 'Test123456', username: 'testuser1', name: 'Test User 1' },
  { email: 'test2@example.com', password: 'Test123456', username: 'testuser2', name: 'Test User 2' },
  { email: 'test3@example.com', password: 'Test123456', username: 'testuser3', name: 'Test User 3' },
  { email: 'test4@example.com', password: 'Test123456', username: 'testuser4', name: 'Test User 4' },
  { email: 'test5@example.com', password: 'Test123456', username: 'testuser5', name: 'Test User 5' },
  { email: 'test6@example.com', password: 'Test123456', username: 'testuser6', name: 'Test User 6' },
  { email: 'test7@example.com', password: 'Test123456', username: 'testuser7', name: 'Test User 7' },
  { email: 'test8@example.com', password: 'Test123456', username: 'testuser8', name: 'Test User 8' },
  { email: 'test9@example.com', password: 'Test123456', username: 'testuser9', name: 'Test User 9' },
  { email: 'test10@example.com', password: 'Test123456', username: 'testuser10', name: 'Test User 10' },
];

async function createTestUsers() {
  let User, Role;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/myblog';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Dynamic import models (ES modules)
    const RoleModule = await import('./src/models/Role.js');
    Role = RoleModule.default;
    
    const UserModule = await import('./src/models/User.js');
    User = UserModule.default;

    console.log('👥 Creating test users...\n');

    for (const userData of TEST_USERS) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = new User({
        email: userData.email,
        password: hashedPassword,
        username: userData.username,
        name: userData.name,
        role: 'user',
        isVerified: true, // Auto-verify test users
      });

      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\nCredentials for all test users:');
    console.log('Password: Test123456\n');
    
    TEST_USERS.forEach(user => {
      console.log(`   Email: ${user.email}`);
    });

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

createTestUsers();
