import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "../src/models/Role.js";
import User from "../src/models/User.js";

// Load environment variables
dotenv.config();

/**
 * Script để khởi tạo các role mặc định trong hệ thống
 * Chạy script này khi deploy lần đầu hoặc khi cần reset roles
 */

const defaultRoles = [
  {
    name: "user",
    displayName: "Người dùng",
    description: "Người dùng của Shiku",
    color: "#6B7280",
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
  },
  {
    name: "admin",
    displayName: "Quản trị viên",
    description: "Quản lý hệ thống",
    iconUrl: "/assets/admin.jpg",
    color: "#DC2626",
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
    name: "sololeveling",
    displayName: "Solo Leveling",
    description: "Fan của Solo Leveling",
    iconUrl: "/assets/Sung-tick.png",
    color: "#F59E0B",
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
  },
  {
    name: "sybau",
    displayName: "Ahh Sybau",
    description: "Sybau",
    iconUrl: "/assets/Sybau-tick.png",
    color: "#8B5CF6",
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
  },
  {
    name: "moxumxue",
    displayName: "Fan anh Ộ I I",
    description: "Fan của Moxumxue",
    iconUrl: "/assets/moxumxue.png",
    color: "#EC4899",
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
  },
  {
    name: "gay",
    displayName: "LGBTQ+",
    description: "Thành viên cộng đồng LGBTQ+",
    iconUrl: "/assets/gay.png",
    color: "#10B981",
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
  },
  {
    name: "special",
    displayName: "Người dùng đặc biệt",
    description: "Thành viên có đóng góp đặc biệt",
    iconUrl: "/assets/special-user.jpg",
    color: "#F97316",
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

async function initRoles() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Xóa tất cả role hiện có (chỉ trong development)
    if (process.env.NODE_ENV === "development") {
      await Role.deleteMany({});
      console.log("Cleared existing roles");
    }

    // Tạo các role mặc định
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        console.log(`Role '${roleData.name}' already exists, skipping...`);
        continue;
      }

      // Tìm admin user để làm createdBy
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        console.log("No admin user found, using system as creator");
      }

      const role = new Role({
        ...roleData,
        createdBy: adminUser?._id || new mongoose.Types.ObjectId(),
        sortOrder: Date.now()
      });

      await role.save();
      console.log(`Created role: ${role.displayName} (${role.name})`);
    }

    console.log("Role initialization completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing roles:", error);
    process.exit(1);
  }
}

// Chạy script
initRoles();
