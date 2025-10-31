import express from "express";
import { authRequired } from "../middleware/auth.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import { uploadSingle } from "../middleware/fileUpload.js";
import { staleWhileRevalidate } from "../middleware/cacheHeaders.js";

const router = express.Router();

/**
 * Middleware kiểm tra quyền admin
 * Chỉ cho phép users có role "admin" truy cập
 */
const adminRequired = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
};

/**
 * @route   GET /api/admin/roles/public
 * @desc    Lấy thông tin roles cho hiển thị badges (public access)
 * @access  Private (Authenticated users)
 * @cache   10 minutes with revalidation
 */
router.get("/public", authRequired, staleWhileRevalidate(600, 1200), async (req, res, next) => {
  try {
    const roles = await Role.getActiveRoles();
    
    // Chỉ trả về thông tin cần thiết cho badges
    const publicRoles = roles.map(role => ({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      iconUrl: role.iconUrl,
      color: role.color
    }));

    res.json({ 
      success: true, 
      roles: publicRoles,
      message: "Lấy thông tin roles thành công" 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/roles
 * @desc    Lấy danh sách tất cả roles
 * @access  Private (Admin only)
 * @cache   5 minutes with revalidation
 */
router.get("/", authRequired, adminRequired, staleWhileRevalidate(300, 600), async (req, res, next) => {
  try {
    const roles = await Role.getActiveRoles();

    // Cập nhật user count cho mỗi role (có thể optimize bằng aggregation)
    const roleNames = roles.map(r => r.name);
    const userCounts = await User.aggregate([
      { $match: { role: { $in: roleNames } } },
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const userCountMap = new Map();
    userCounts.forEach(item => {
      userCountMap.set(item._id, item.count);
    });

    const rolesWithCount = roles.map(role => ({
      ...role.toObject(),
      userCount: userCountMap.get(role.name) || 0
    }));

    res.json({
      success: true,
      roles: rolesWithCount
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    next(error);
  }
});

/**
 * @route   GET /api/admin/roles/:id
 * @desc    Lấy thông tin chi tiết một role
 * @access  Private (Admin only)
 */
router.get("/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy role"
      });
    }
    
    res.json({
      success: true,
      role: role
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    next(error);
  }
});

/**
 * @route   POST /api/admin/roles
 * @desc    Tạo role mới
 * @access  Private (Admin only)
 */
router.post("/", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { name, displayName, description, iconUrl, color, permissions } = req.body;
    
    // Validation
    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        error: "Tên role và tên hiển thị không được để trống"
      });
    }
    
    // Kiểm tra role đã tồn tại
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        error: "Role này đã tồn tại"
      });
    }
    
    // Tạo role mới
    const newRole = new Role({
      name: name.toLowerCase(),
      displayName,
      description: description || "",
      iconUrl: iconUrl || "",
      color: color || "#3B82F6",
      permissions: permissions || {},
      createdBy: req.user._id
    });
    
    await newRole.save();
    
    res.status(201).json({
      success: true,
      message: "Tạo role thành công",
      role: newRole
    });
  } catch (error) {
    console.error("Error creating role:", error);
    next(error);
  }
});

/**
 * @route   PUT /api/admin/roles/:id
 * @desc    Cập nhật role
 * @access  Private (Admin only)
 */
router.put("/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { displayName, description, iconUrl, color, permissions } = req.body;
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy role"
      });
    }
    
    // Cho phép chỉnh sửa hiển thị của role mặc định (icon, màu, mô tả)
    // Nhưng không cho đổi tên và permissions quan trọng
    if (role.isDefault) {
      // Chỉ cho phép cập nhật displayName, description, iconUrl, color
      if (displayName) role.displayName = displayName;
      if (description !== undefined) role.description = description;
      if (iconUrl !== undefined) role.iconUrl = iconUrl;
      if (color) role.color = color;
      // Không cho đổi permissions của role mặc định
    } else {
      // Role tùy chỉnh có thể đổi tất cả
      if (displayName) role.displayName = displayName;
      if (description !== undefined) role.description = description;
      if (iconUrl !== undefined) role.iconUrl = iconUrl;
      if (color) role.color = color;
      if (permissions) role.permissions = { ...role.permissions, ...permissions };
    }
    
    await role.save();
    
    res.json({
      success: true,
      message: "Cập nhật role thành công",
      role: role
    });
  } catch (error) {
    console.error("Error updating role:", error);
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/roles/:id
 * @desc    Xóa role
 * @access  Private (Admin only)
 */
router.delete("/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    console.log(`🗑️ DELETE role request for ID: ${req.params.id}`);
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      console.log(`❌ Role not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy role"
      });
    }
    
    console.log(`📋 Found role: ${role.name} (isDefault: ${role.isDefault})`);
    
    // Không cho phép xóa role mặc định
    if (role.isDefault) {
      console.log(`❌ Cannot delete default role: ${role.name}`);
      return res.status(400).json({
        success: false,
        error: "Không thể xóa role mặc định"
      });
    }
    
    // Kiểm tra có user nào đang sử dụng role này không
    const usersWithRole = await User.countDocuments({ role: role.name });
    console.log(`👥 Users with role ${role.name}: ${usersWithRole}`);
    
    if (usersWithRole > 0) {
      console.log(`❌ Cannot delete role ${role.name} - still in use by ${usersWithRole} users`);
      return res.status(400).json({
        success: false,
        error: `Không thể xóa role này vì có ${usersWithRole} người dùng đang sử dụng`
      });
    }
    
    // Xóa role (soft delete)
    role.isActive = false;
    await role.save();
    console.log(`✅ Successfully soft-deleted role: ${role.name}`);
    
    // Invalidate cache by calling next with cache invalidation
    req.cacheInvalidate = true;
    
    res.json({
      success: true,
      message: "Xóa role thành công"
    });
  } catch (error) {
    console.error("❌ Error deleting role:", error);
    next(error);
  }
});

/**
 * @route   POST /api/admin/roles/:id/upload-icon
 * @desc    Upload icon cho role
 * @access  Private (Admin only)
 */
router.post("/:id/upload-icon", authRequired, adminRequired, ...uploadSingle('image'), async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy role"
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Không có file được upload"
      });
    }
    
    // Cập nhật iconUrl
    role.iconUrl = req.file.path;
    await role.save();
    
    res.json({
      success: true,
      message: "Upload icon thành công",
      iconUrl: role.iconUrl
    });
  } catch (error) {
    console.error("Error uploading icon:", error);
    next(error);
  }
});

/**
 * @route   PUT /api/admin/roles/:id/sort
 * @desc    Cập nhật thứ tự sắp xếp role
 * @access  Private (Admin only)
 */
router.put("/:id/sort", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { sortOrder } = req.body;
    
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy role"
      });
    }
    
    role.sortOrder = sortOrder || 0;
    await role.save();
    
    res.json({
      success: true,
      message: "Cập nhật thứ tự thành công"
    });
  } catch (error) {
    console.error("Error updating sort order:", error);
    next(error);
  }
});

/**
 * @route   GET /api/admin/roles/:id/users
 * @desc    Lấy danh sách user có role này
 * @access  Private (Admin only)
 */
router.get("/:id/users", authRequired, adminRequired, async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy role"
      });
    }
    
    const users = await User.find({ role: role.name })
      .select('name email avatarUrl createdAt')
      .sort({ createdAt: -1 })
      .limit(50); // Giới hạn 50 user để tránh quá tải
    
    res.json({
      success: true,
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error("Error fetching role users:", error);
    next(error);
  }
});

export default router;
