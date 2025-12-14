/**
 * Groups Routes
 * 
 * Routes xử lý các thao tác liên quan đến nhóm (groups):
 * - Tạo, sửa, xóa nhóm
 * - Quản lý thành viên (thêm, xóa, phân quyền)
 * - Upload avatar/cover cho nhóm
 * - Tìm kiếm nhóm
 * 
 * @module groups
 */

import express from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import { escapeRegex } from '../utils/mongoSecurity.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { authRequired, authOptional } from '../middleware/auth.js';
import { withCache, userCache, invalidateCacheByPrefix } from '../utils/cache.js';
import multer from 'multer';
import { v2 as cloudinaryV2 } from 'cloudinary';
import { responseCache, invalidateByPattern } from '../middleware/responseCache.js';

const router = express.Router();

// Cấu hình multer cho upload ảnh vào memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh'), false);
    }
  }
});

// Cấu hình Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function để upload lên Cloudinary
const uploadToCloudinary = (buffer, folder = 'groups') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryV2.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * @route   GET /api/groups
 * @desc    Lấy danh sách nhóm với phân trang và tìm kiếm
 * @access  Public (chỉ hiển thị public groups) - nhưng cần authOptional để tính userRole
 */
router.get('/', authOptional, responseCache({ ttlSeconds: 60, prefix: 'groups' }), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Xây dựng query
    let query = { isActive: true };

    // Loại bỏ nhóm bí mật khỏi danh sách công khai (chỉ hiển thị public và private)
    query['settings.type'] = { $in: ['public', 'private'] };

    // Lọc theo loại nhóm cụ thể nếu được chỉ định
    if (type !== 'all' && (type === 'public' || type === 'private')) {
      query['settings.type'] = type;
    }

    // Tìm kiếm theo tên, mô tả, tags - escape regex to prevent NoSQL injection
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(safeSearch, 'i')] } }
      ];
    }

    console.log('[INFO][GROUPS] Groups query:', JSON.stringify(query, null, 2));

    // Xây dựng sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // OPTIMIZATION: Use lean() for better performance
    // Thực hiện query với phân trang
    const groups = await Group.find(query)
      .populate('owner', 'name avatarUrl')
      .populate('members.user', 'name avatarUrl')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Thêm userRole cho mỗi group
    groups.forEach(group => {
      if (req.user) {
        const userId = req.user._id.toString();
        // Kiểm tra xem user có phải owner không
        const ownerId = group.owner?._id?.toString() || group.owner?.toString();
        if (ownerId === userId) {
          group.userRole = 'owner';
        } else {
          // Tìm member - xử lý cả trường hợp user đã populate và chưa populate
          const member = group.members?.find(m => {
            const memberUserId = m.user?._id?.toString() || m.user?.toString();
            return memberUserId === userId;
          });
          if (member) {
            group.userRole = member.role;
          } else {
            group.userRole = null;
          }
        }
      } else {
        group.userRole = null;
      }
    });

    // Đếm tổng số nhóm
    const total = await Group.countDocuments(query);



    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error fetching groups:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách nhóm'
    });
  }
});

/**
 * @route   GET /api/groups/my-groups
 * @desc    Lấy danh sách nhóm của user (tham gia hoặc sở hữu)
 * @access  Private
 * OPTIMIZED: Sử dụng aggregation và cache
 */
router.get('/my-groups', authRequired, async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdStr = userId.toString();
    const { page = 1, limit = 10, role = 'all' } = req.query;

    const cacheKey = `my-groups:${userIdStr}:${page}:${limit}:${role}`;

    // Cache for 60 seconds
    const result = await withCache(userCache, cacheKey, async () => {
      // OPTIMIZATION: Use aggregation pipeline instead of find + populate
      const matchStage = { isActive: true };

      if (role !== 'all') {
        matchStage['members'] = {
          $elemMatch: {
            user: userId,
            role: role
          }
        };
      } else {
        matchStage.$or = [
          { owner: userId },
          { 'members.user': userId }
        ];
      }

      const pipeline = [
        { $match: matchStage },
        { $sort: { updatedAt: -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
        // Lookup owner with minimal fields
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner',
            pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
          }
        },
        { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
        // Project only needed fields (skip full members populate for list view)
        {
          $project: {
            name: 1,
            description: 1,
            avatar: 1,
            coverImage: 1,
            owner: 1,
            settings: 1,
            memberCount: { $size: '$members' },
            // Include minimal member info for role detection
            members: {
              $filter: {
                input: '$members',
                as: 'member',
                cond: { $eq: ['$$member.user', userId] }
              }
            },
            createdAt: 1,
            updatedAt: 1
          }
        }
      ];

      const [groups, totalResult] = await Promise.all([
        Group.aggregate(pipeline),
        Group.aggregate([{ $match: matchStage }, { $count: 'total' }])
      ]);

      const total = totalResult[0]?.total || 0;

      // Add userRole to each group
      const groupsWithRole = groups.map(group => {
        const ownerId = group.owner?._id?.toString();
        if (ownerId === userIdStr) {
          return { ...group, userRole: 'owner' };
        }

        const member = group.members?.[0];
        return {
          ...group,
          userRole: member ? member.role : null,
          members: undefined // Remove members array from response
        };
      });

      return {
        groups: groupsWithRole,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      };
    }, 60 * 1000); // 60 seconds cache

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error fetching user groups:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải nhóm của bạn'
    });
  }
});

/**
 * @route   GET /api/groups/:id
 * @desc    Lấy thông tin chi tiết nhóm
 * @access  Public (tùy thuộc vào loại nhóm)
 */
router.get('/:id', authOptional, async (req, res) => {
  try {
    console.log('[INFO][GROUPS] Group ID:', req.params.id);

    const group = await Group.findById(req.params.id)
      .populate('owner', 'name avatarUrl')
      .populate('members.user', 'name avatarUrl')
      .populate('joinRequests.user', 'name avatarUrl')
      .populate('bannedUsers.user', 'name avatarUrl')
      .populate('bannedUsers.bannedBy', 'name avatarUrl');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền truy cập
    const userId = req.user?._id;
    const isOwner = userId && group.owner._id.toString() === userId.toString();
    const isMember = userId && group.isMember(userId);

    let canView = false;
    if (group.settings.type === 'public') {
      canView = true; // Public groups can be viewed by anyone
    } else if (group.settings.type === 'private') {
      canView = isOwner || isMember; // Private groups: only owner and members
    } else if (group.settings.type === 'secret') {
      canView = isOwner || isMember; // Secret groups: only owner and members
    }

    if (!canView) {
      // Cho phép hiển thị thông tin tối thiểu để người dùng có thể gửi yêu cầu tham gia
      const hasPendingJoinRequest = req.user ? group.joinRequests.some(r => r.user.toString() === req.user._id.toString() && r.status === 'pending') : false;
      return res.json({
        success: true,
        data: {
          _id: group._id,
          name: group.name,
          avatar: group.avatar,
          coverImage: group.coverImage,
          owner: { _id: group.owner._id, name: group.owner.name, avatarUrl: group.owner.avatarUrl },
          settings: {
            type: group.settings.type,
            joinApproval: group.settings.joinApproval
          },
          stats: {
            memberCount: group.members?.length || 0,
            postCount: 0
          },
          userRole: null,
          hasPendingJoinRequest
        }
      });
    }

    // Tính cờ pending trước khi có thể ẩn joinRequests
    const hasPendingJoinRequest = req.user ? group.joinRequests?.some(r => r.user.toString() === req.user._id.toString() && r.status === 'pending') : false;

    // Ẩn thông tin nhạy cảm nếu không phải admin/mod
    const canManage = userId && group.canManage(userId);
    if (!canManage) {
      group.joinRequests = [];
      group.bannedUsers = [];
    }

    // Chuyển sang plain object để gán userRole
    let groupObj = group.toObject();
    if (req.user) {
      const userIdStr = req.user._id.toString();
      if (isOwner) {
        groupObj.userRole = 'owner';
      } else if (isMember) {
        // Tìm member - xử lý cả trường hợp user đã populate và chưa populate
        const member = groupObj.members?.find(m => {
          const memberUserId = m.user?._id?.toString() || m.user?.toString();
          return memberUserId === userIdStr;
        });
        groupObj.userRole = member ? member.role : null;
      } else {
        groupObj.userRole = null;
      }
    } else {
      groupObj.userRole = null;
    }

    // Ensure stats are included and up-to-date
    groupObj.stats = {
      ...groupObj.stats,
      memberCount: groupObj.members?.length || 0
    };

    res.json({
      success: true,
      data: { ...groupObj, hasPendingJoinRequest }
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error fetching group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin nhóm'
    });
  }
});

/**
 * @route   POST /api/groups
 * @desc    Tạo nhóm mới
 * @access  Private
 */
router.post('/', authRequired, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'public',
      joinApproval = 'anyone',
      postPermissions = 'all_members',
      commentPermissions = 'all_members',
      allowMemberInvites = true,
      showMemberList = true,
      searchable = true,
      tags = [],
      location
    } = req.body;


    // Tạo nhóm mới
    const group = new Group({
      name,
      description,
      owner: req.user._id,
      settings: {
        type,
        joinApproval,
        postPermissions,
        commentPermissions,
        allowMemberInvites,
        showMemberList,
        searchable
      },
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? JSON.parse(tags) : tags.split(',').map(tag => tag.trim())),
      location: location ? JSON.parse(location) : undefined
    });

    // Xử lý ảnh upload
    if (req.files?.avatar && req.files.avatar[0]) {
      try {
        const avatarResult = await uploadToCloudinary(req.files.avatar[0].buffer, 'groups/avatars');
        group.avatar = avatarResult.secure_url;
      } catch (error) {
        console.error('[ERROR][GROUPS] Error uploading avatar:', error);
      }
    }
    if (req.files?.coverImage && req.files.coverImage[0]) {
      try {
        const coverResult = await uploadToCloudinary(req.files.coverImage[0].buffer, 'groups/covers');
        group.coverImage = coverResult.secure_url;
      } catch (error) {
        console.error('[ERROR][GROUPS] Error uploading cover image:', error);
      }
    }

    // Tự động thêm chủ sở hữu làm admin
    await group.addMember(req.user._id, 'admin', {
      canPost: true,
      canComment: true,
      canInvite: true,
      canModerate: true
    });

    await group.save();
    console.log('[INFO][GROUPS] Group saved with ID:', group._id);

    // Populate thông tin để trả về
    await group.populate('owner', 'name avatarUrl');
    await group.populate('members.user', 'name avatarUrl');


    res.status(201).json({
      success: true,
      message: 'Tạo nhóm thành công',
      data: group
    });

    // Invalidate groups cache
    invalidateByPattern('groups:*').catch(() => { });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo nhóm'
    });
  }
});

/**
 * @route   PUT /api/groups/:id
 * @desc    Cập nhật thông tin nhóm
 * @access  Private (chỉ admin/owner)
 */
router.put('/:id', authRequired, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền chỉnh sửa
    const isOwner = group.owner.toString() === req.user._id.toString();
    const isAdmin = group.isAdmin(req.user._id);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa nhóm này'
      });
    }

    const {
      name,
      description,
      settings,
      tags,
      location
    } = req.body;

    // Cập nhật thông tin cơ bản
    if (name !== undefined && name.trim()) {
      group.name = name.trim();
    }
    if (description !== undefined) {
      group.description = description || '';
    }

    // Xử lý tags
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        group.tags = tags.filter(tag => tag && tag.trim()).map(tag => tag.trim());
      } else if (typeof tags === 'string') {
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        group.tags = tagsArray;
      }
    }

    // Xử lý location
    if (location !== undefined) {
      try {
        if (typeof location === 'string') {
          const parsedLocation = JSON.parse(location);
          group.location = parsedLocation;
        } else if (typeof location === 'object') {
          group.location = location;
        }
      } catch (error) {
        // Nếu parse lỗi, xử lý như string đơn giản
        if (typeof location === 'string' && location.trim()) {
          group.location = { name: location.trim() };
        }
      }
    }

    // Cập nhật cài đặt (chỉ owner mới có thể thay đổi)
    if (settings && isOwner) {
      try {
        const parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
        group.settings = { ...group.settings, ...parsedSettings };
      } catch (error) {
        console.error('[ERROR][GROUPS] Error parsing settings:', error);
        return res.status(400).json({
          success: false,
          message: 'Cài đặt không hợp lệ'
        });
      }
    }

    // Xử lý ảnh upload
    if (req.files?.avatar && req.files.avatar[0]) {
      try {
        const avatarResult = await uploadToCloudinary(req.files.avatar[0].buffer, 'groups/avatars');
        group.avatar = avatarResult.secure_url;
      } catch (error) {
        console.error('[ERROR][GROUPS] Error uploading avatar:', error);
      }
    }
    if (req.files?.coverImage && req.files.coverImage[0]) {
      try {
        const coverResult = await uploadToCloudinary(req.files.coverImage[0].buffer, 'groups/covers');
        group.coverImage = coverResult.secure_url;
      } catch (error) {
        console.error('[ERROR][GROUPS] Error uploading cover image:', error);
      }
    }

    await group.save();

    res.json({
      success: true,
      message: 'Cập nhật nhóm thành công',
      data: group
    });

    // Invalidate groups cache
    invalidateByPattern('groups:*').catch(() => { });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error updating group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật nhóm'
    });
  }
});

/**
 * @route   DELETE /api/groups/:id
 * @desc    Xóa nhóm (chỉ owner)
 * @access  Private
 */
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Chỉ owner mới có thể xóa nhóm
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa nhóm này'
      });
    }

    // Đánh dấu nhóm là không hoạt động thay vì xóa thật
    group.isActive = false;
    await group.save();

    res.json({
      success: true,
      message: 'Xóa nhóm thành công'
    });

    // Invalidate groups cache
    invalidateByPattern('groups:*').catch(() => { });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error deleting group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa nhóm'
    });
  }
});

/**
 * @route   POST /api/groups/:id/join
 * @desc    Tham gia nhóm
 * @access  Private
 */
router.post('/:id/join', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    const userId = req.user._id;

    // Kiểm tra xem user đã là thành viên chưa
    if (group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã là thành viên của nhóm này'
      });
    }

    // Kiểm tra xem user có bị cấm không
    if (group.isBanned(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn đã bị cấm khỏi nhóm này'
      });
    }

    // Xử lý theo loại nhóm
    if (group.settings.type === 'public' && group.settings.joinApproval === 'anyone') {
      // Tự động tham gia
      await group.addMember(userId, 'member');

      res.json({
        success: true,
        message: 'Tham gia nhóm thành công',
        joined: true,
        pending: false
      });
    } else {
      // Cần yêu cầu tham gia: idempotent - nếu đã có pending thì trả về success
      const alreadyPending = group.joinRequests?.some(r => r.user.toString() === userId.toString() && r.status === 'pending');
      if (alreadyPending) {
        return res.json({ success: true, message: 'Yêu cầu tham gia đang chờ duyệt', alreadyPending: true, pending: true, joined: false });
      }
      const { message = '' } = req.body;
      await group.addJoinRequest(userId, message);
      return res.json({ success: true, message: 'Đã gửi yêu cầu tham gia nhóm', pending: true, joined: false });
    }
  } catch (error) {
    console.error('[ERROR][GROUPS] Error joining group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tham gia nhóm'
    });
  }
});

/**
 * @route   POST /api/groups/:id/join-requests/cancel
 * @desc    Hủy yêu cầu tham gia của chính mình
 * @access  Private
 */
router.post('/:id/join-requests/cancel', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm' });
    }
    const userId = req.user._id.toString();
    const before = group.joinRequests.length;
    group.joinRequests = group.joinRequests.filter(r => !(r.user.toString() === userId && r.status === 'pending'));
    const after = group.joinRequests.length;
    await group.save();
    return res.json({ success: true, removed: before - after });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error cancel join request:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi hủy yêu cầu tham gia' });
  }
});

/**
 * @route   POST /api/groups/:id/leave
 * @desc    Rời khỏi nhóm
 * @access  Private
 */
router.post('/:id/leave', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    const userId = req.user._id;

    // Không cho phép owner rời khỏi nhóm
    if (group.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Chủ sở hữu không thể rời khỏi nhóm'
      });
    }

    // Kiểm tra xem user có phải thành viên không
    if (!group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không phải là thành viên của nhóm này'
      });
    }

    await group.removeMember(userId);

    res.json({
      success: true,
      message: 'Rời khỏi nhóm thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error leaving group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi rời khỏi nhóm'
    });
  }
});

/**
 * @route   GET /api/groups/:id/join-requests
 * @desc    Lấy danh sách yêu cầu tham gia
 * @access  Private (chỉ admin)
 */
router.get('/:id/join-requests', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('joinRequests.user', 'name avatarUrl');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền quản lý (admin hoặc moderator)
    if (!group.canManage(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem yêu cầu tham gia'
      });
    }

    // Chỉ trả về pending để tránh rác
    const pending = (group.joinRequests || []).filter(r => r.status === 'pending');
    res.json({ success: true, data: pending });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error fetching join requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải yêu cầu tham gia'
    });
  }
});

/**
 * @route   POST /api/groups/:id/join-requests/:requestId/approve
 * @desc    Duyệt yêu cầu tham gia
 * @access  Private (chỉ admin)
 */
router.post('/:id/join-requests/:requestId/approve', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền quản lý (admin hoặc moderator)
    if (!group.canManage(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền duyệt yêu cầu tham gia'
      });
    }

    await group.approveJoinRequest(req.params.requestId, req.user._id);

    res.json({
      success: true,
      message: 'Duyệt yêu cầu tham gia thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error approving join request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt yêu cầu tham gia'
    });
  }
});

/**
 * @route   POST /api/groups/:id/join-requests/:requestId/reject
 * @desc    Từ chối yêu cầu tham gia
 * @access  Private (chỉ admin)
 */
router.post('/:id/join-requests/:requestId/reject', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền quản lý (admin hoặc moderator)
    if (!group.canManage(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền từ chối yêu cầu tham gia'
      });
    }

    await group.rejectJoinRequest(req.params.requestId, req.user._id);

    res.json({
      success: true,
      message: 'Từ chối yêu cầu tham gia thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error rejecting join request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối yêu cầu tham gia'
    });
  }
});

/**
 * @route   POST /api/groups/:id/ban
 * @desc    Cấm user khỏi nhóm
 * @access  Private (chỉ admin)
 */
router.post('/:id/ban', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền quản lý (admin hoặc moderator)
    if (!group.canManage(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cấm thành viên'
      });
    }

    const { userId, reason = '', expiresAt = null } = req.body;

    await group.banUser(userId, req.user._id, reason, expiresAt);

    res.json({
      success: true,
      message: 'Cấm thành viên thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error banning user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cấm thành viên'
    });
  }
});

/**
 * @route   POST /api/groups/:id/unban
 * @desc    Bỏ cấm user khỏi nhóm
 * @access  Private (chỉ admin)
 */
router.post('/:id/unban', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền quản lý (admin hoặc moderator)
    if (!group.canManage(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền bỏ cấm thành viên'
      });
    }

    const { userId } = req.body;

    await group.unbanUser(userId);

    res.json({
      success: true,
      message: 'Bỏ cấm thành viên thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error unbanning user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi bỏ cấm thành viên'
    });
  }
});

/**
 * @route   DELETE /api/groups/:id/members/:userId
 * @desc    Xóa thành viên khỏi nhóm
 * @access  Private (chỉ admin)
 */
router.delete('/:id/members/:userId', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền quản lý (admin hoặc moderator)
    if (!group.canManage(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa thành viên'
      });
    }

    // Không cho phép xóa owner
    if (group.owner.toString() === req.params.userId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa chủ sở hữu nhóm'
      });
    }

    await group.removeMember(req.params.userId);

    res.json({
      success: true,
      message: 'Xóa thành viên thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thành viên'
    });
  }
});

/**
 * @route   PUT /api/groups/:id/members/:userId/role
 * @desc    Cập nhật vai trò thành viên
 * @access  Private (chỉ admin)
 */
router.put('/:id/members/:userId/role', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    const { role, permissions = {} } = req.body;
    const targetUserId = req.params.userId;

    // Kiểm tra quyền thay đổi vai trò dựa trên vai trò hiện tại và vai trò mới
    const currentUser = req.user._id;
    const isOwner = group.owner.toString() === currentUser.toString();
    const isAdmin = group.isAdmin(currentUser);
    const isModerator = group.isModerator(currentUser);

    // Lấy vai trò hiện tại của người bị thay đổi
    const targetMember = group.members.find(m => m.user.toString() === targetUserId);
    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên'
      });
    }

    const currentRole = targetMember.role;

    // Quy tắc phân quyền:
    // - Owner có thể thay đổi bất kỳ ai thành bất kỳ role nào
    // - Admin có thể thăng/hạ moderator và member, nhưng không thể động đến admin khác
    // - Moderator không thể thay đổi vai trò của ai

    if (!isOwner) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thay đổi vai trò thành viên'
        });
      }

      // Admin không thể thay đổi vai trò của admin khác
      if (currentRole === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Chỉ chủ sở hữu mới có thể thay đổi vai trò của quản trị viên'
        });
      }

      // Admin không thể thăng ai lên admin
      if (role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Chỉ chủ sở hữu mới có thể bổ nhiệm quản trị viên'
        });
      }
    }

    await group.updateMemberRole(targetUserId, role, permissions);

    res.json({
      success: true,
      message: 'Cập nhật vai trò thành viên thành công'
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error updating member role:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật vai trò thành viên'
    });
  }
});

/**
 * @route   GET /api/groups/:id/analytics
 * @desc    Lấy thống kê chi tiết của nhóm (chỉ admin và moderator)
 * @access  Private
 */
router.get('/:id/analytics', authRequired, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền xem analytics
    if (!group.hasPermission(req.user._id, 'view_analytics')) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thống kê nhóm này'
      });
    }

    const { period = '30d' } = req.query;

    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setDate(startDate.getDate() - 365);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Import Post model
    const Post = (await import('../models/Post.js')).default;
    const Comment = (await import('../models/Comment.js')).default;

    // Get all group posts
    const allPosts = await Post.find({ group: group._id })
      .select('title slug views createdAt status author')
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: -1 });

    // Get posts from the specified period
    const recentPosts = allPosts.filter(post =>
      new Date(post.createdAt) >= startDate
    );

    // Calculate total views
    const totalViews = allPosts.reduce((sum, post) => sum + (post.views || 0), 0);

    // Get top posts (by views)
    const topPosts = allPosts
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(post => ({
        _id: post._id,
        title: post.title,
        slug: post.slug,
        views: post.views || 0,
        createdAt: post.createdAt,
        status: post.status,
        author: post.author
      }));

    // Get comments count
    const totalComments = await Comment.countDocuments({
      post: { $in: allPosts.map(p => p._id) }
    });

    // Get recent comments count
    const recentComments = await Comment.countDocuments({
      post: { $in: recentPosts.map(p => p._id) },
      createdAt: { $gte: startDate }
    });

    // Calculate member growth
    const totalMembers = group.members?.length || 0;
    const recentMembers = group.members?.filter(m =>
      new Date(m.joinedAt) >= startDate
    ).length || 0;

    // Calculate growth metrics
    const totalPosts = allPosts.length;
    const publishedPosts = allPosts.filter(p => p.status === 'published').length;
    const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

    // Calculate posts by day for the period using aggregation (avoid per-day loop)
    const vietnamTimezone = "Asia/Ho_Chi_Minh";
    const postsByDayAgg = await Post.aggregate([
      {
        $match: {
          group: group._id,
          createdAt: { $gte: startDate, $lte: new Date() }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: vietnamTimezone } },
          count: { $sum: 1 }
        }
      }
    ]);

    const postsByDay = postsByDayAgg.reduce((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: {
        totalViews,
        totalPosts,
        totalComments,
        totalMembers,
        publishedPosts,
        avgViewsPerPost,
        recentPosts: recentPosts.length,
        recentComments,
        recentMembers,
        topPosts,
        recentPostsList: recentPosts.slice(0, 10).map(post => ({
          _id: post._id,
          title: post.title,
          slug: post.slug,
          views: post.views || 0,
          createdAt: post.createdAt,
          status: post.status,
          author: post.author
        })),
        postsByDay,
        period
      }
    });
  } catch (error) {
    console.error('[ERROR][GROUPS] Error fetching group analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê nhóm'
    });
  }
});

export default router;

