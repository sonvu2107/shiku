import mongoose from 'mongoose';
import Role from '../src/models/Role.js';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const oldRoles = [
  {
    name: 'sololeveling',
    displayName: 'Solo Leveling',
    description: 'Fan Solo Leveling',
    iconUrl: '/assets/Sung-tick.png',
    color: '#FFD700'
  },
  {
    name: 'sybau',
    displayName: 'Ahh Sybau',
    description: 'Sybau member',
    iconUrl: '/assets/Sybau-tick.png',
    color: '#FF69B4'
  },
  {
    name: 'moxumxue',
    displayName: 'Fan anh Ộ I I',
    description: 'Moxumxue fan',
    iconUrl: '/assets/moxumxue.png',
    color: '#8B4513'
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description: 'Administrator',
    iconUrl: '/assets/admin.jpg',
    color: '#DC2626',
    isDefault: true,
    permissions: {
      canCreatePosts: true,
      canCreateGroups: true,
      canCreateEvents: true,
      canModerateContent: true,
      canBanUsers: true,
      canManageRoles: true,
      canAccessAdmin: true
    }
  },
  {
    name: 'gay',
    displayName: 'Thành viên LGBTQ+',
    description: 'Cộng đồng LGBTQ+',
    iconUrl: '/assets/gay.png',
    color: '#FF0080'
  },
  {
    name: 'special',
    displayName: 'Người dùng đặc biệt',
    description: 'Special user',
    iconUrl: '/assets/special-user.jpg',
    color: '#9333EA'
  },
  {
    name: 'user',
    displayName: 'User',
    description: 'Người dùng thông thường',
    iconUrl: '',
    color: '#6B7280',
    isDefault: true,
    permissions: {
      canCreatePosts: true,
      canCreateGroups: true,
      canCreateEvents: true,
      canModerateContent: false,
      canBanUsers: false,
      canManageRoles: false,
      canAccessAdmin: false
    }
  }
];

async function migrateRoles() {
  try {
    console.log('🚀 Starting role migration...\n');

    // Use MONGODB_URI (same as in env.js)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in environment variables');
      console.error('Please set MONGODB_URI or MONGO_URI in your .env file');
      console.error('\nCurrent .env path:', path.join(__dirname, '../../.env'));
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get admin user to set as creator
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please create admin user first.');
      console.log('\nYou can create admin user by:');
      console.log('1. Register a new account');
      console.log('2. Manually set role to "admin" in database');
      process.exit(1);
    }

    console.log(`👤 Found admin user: ${adminUser.name} (${adminUser.email})\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const roleData of oldRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });

      if (existingRole) {
        // Check if update needed
        const needsUpdate =
          existingRole.iconUrl !== roleData.iconUrl ||
          existingRole.displayName !== roleData.displayName ||
          existingRole.description !== roleData.description;

        if (needsUpdate) {
          console.log(`📝 Updating role: ${roleData.name}`);

          await Role.findOneAndUpdate(
            { name: roleData.name },
            {
              displayName: roleData.displayName,
              description: roleData.description,
              iconUrl: roleData.iconUrl,
              color: roleData.color,
              isDefault: roleData.isDefault || false,
              permissions: roleData.permissions || existingRole.permissions
            }
          );

          console.log(`   ✓ Updated: ${roleData.displayName}`);
          console.log(`   └─ Icon: ${roleData.iconUrl}\n`);
          updated++;
        } else {
          console.log(`⏭️  Skipping role: ${roleData.name} (no changes needed)\n`);
          skipped++;
        }
      } else {
        console.log(`🆕 Creating role: ${roleData.name}`);

        const newRole = new Role({
          ...roleData,
          createdBy: adminUser._id,
          isActive: true
        });

        await newRole.save();
        console.log(`   ✓ Created: ${roleData.displayName}`);
        console.log(`   └─ Icon: ${roleData.iconUrl}\n`);
        created++;
      }
    }

    console.log('─'.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   • Created: ${created} role(s)`);
    console.log(`   • Updated: ${updated} role(s)`);
    console.log(`   • Skipped: ${skipped} role(s)`);
    console.log('─'.repeat(50));
    console.log('\n✅ Migration completed successfully!\n');

    console.log('📝 Next Steps:');
    console.log('   1. Go to Admin Dashboard → Roles tab');
    console.log('   2. Click Edit button on any role');
    console.log('   3. Upload new logo or change icon URL');
    console.log('   4. Save and verify changes\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateRoles();
