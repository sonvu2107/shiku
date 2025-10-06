import mongoose from 'mongoose';

/**
 * Group Schema - Schema cho nhóm/group giống Facebook
 * Bao gồm thông tin cơ bản, thành viên, quyền hạn và cài đặt
 */
const groupSchema = new mongoose.Schema({
  // Thông tin cơ bản của nhóm
  name: {
    type: String,
    required: [true, 'Tên nhóm là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên nhóm không được quá 100 ký tự']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả nhóm không được quá 500 ký tự']
  },
  
  // Ảnh đại diện và ảnh bìa
  avatar: {
    type: String,
    default: null
  },
  
  coverImage: {
    type: String,
    default: null
  },
  
  // Chủ sở hữu nhóm
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Danh sách thành viên với vai trò
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    
    // Quyền hạn cụ thể của thành viên
    permissions: {
      canPost: {
        type: Boolean,
        default: true
      },
      canComment: {
        type: Boolean,
        default: true
      },
      canInvite: {
        type: Boolean,
        default: false
      },
      canModerate: {
        type: Boolean,
        default: false
      }
    }
  }],
  
  // Cài đặt nhóm
  settings: {
    // Loại nhóm: public (công khai), private (riêng tư), secret (bí mật)
    type: {
      type: String,
      enum: ['public', 'private', 'secret'],
      default: 'public'
    },
    
    // Ai có thể tham gia nhóm
    joinApproval: {
      type: String,
      enum: ['anyone', 'admin_approval', 'invite_only'],
      default: 'anyone'
    },
    
    // Ai có thể đăng bài
    postPermissions: {
      type: String,
      enum: ['all_members', 'admins_only', 'moderators_and_admins'],
      default: 'all_members'
    },
    
    // Ai có thể bình luận
    commentPermissions: {
      type: String,
      enum: ['all_members', 'members_only', 'admins_only'],
      default: 'all_members'
    },
    
    // Cho phép thành viên mời người khác
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    
    // Hiển thị danh sách thành viên
    showMemberList: {
      type: Boolean,
      default: true
    },
    
    // Cho phép tìm kiếm nhóm
    searchable: {
      type: Boolean,
      default: true
    }
  },
  
  // Thống kê nhóm
  stats: {
    memberCount: {
      type: Number,
      default: 0
    },
    postCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    }
  },
  
  // Danh sách yêu cầu tham gia (cho private groups)
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: [200, 'Tin nhắn yêu cầu không được quá 200 ký tự']
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    }
  }],
  
  // Danh sách người bị cấm
  bannedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Lý do cấm không được quá 200 ký tự']
    },
    bannedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null // null = cấm vĩnh viễn
    }
  }],
  
  // Tags để phân loại nhóm
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag không được quá 20 ký tự']
  }],
  
  // Vị trí địa lý (tùy chọn)
  location: {
    name: {
      type: String,
      trim: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Trạng thái nhóm
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Ngày tạo và cập nhật
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes để tối ưu hóa truy vấn
groupSchema.index({ name: 'text', description: 'text', tags: 'text' });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ 'members.role': 1 });
groupSchema.index({ 'settings.type': 1 });
groupSchema.index({ 'settings.searchable': 1, 'isActive': 1 });
groupSchema.index({ createdAt: -1 });

// Virtual để lấy danh sách admin
groupSchema.virtual('admins').get(function() {
  if (!Array.isArray(this.members)) return [];
  return this.members.filter(member => 
    member.role === 'admin' || member.role === 'moderator'
  );
});

// Virtual để kiểm tra xem user có phải admin không (chỉ admin thật)
groupSchema.methods.isAdmin = function(userId) {
  // Owner luôn có quyền admin
  if (this.owner.toString() === userId.toString()) return true;
  
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'admin';
};

// Virtual để kiểm tra xem user có phải moderator không
groupSchema.methods.isModerator = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'moderator';
};

// Virtual để kiểm tra xem user có quyền quản lý không (admin hoặc moderator)
groupSchema.methods.canManage = function(userId) {
  // Owner luôn có quyền quản lý
  if (this.owner.toString() === userId.toString()) return true;
  
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && (member.role === 'admin' || member.role === 'moderator');
};

// Kiểm tra quyền cụ thể theo hành động
groupSchema.methods.hasPermission = function(userId, action) {
  // Owner có tất cả quyền
  if (this.owner.toString() === userId.toString()) return true;
  
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  
  const role = member.role;
  
  switch (action) {
    // Chỉ owner và admin mới có thể
    case 'delete_group':
    case 'change_settings':
    case 'promote_to_admin':
    case 'demote_admin':
      return role === 'admin';
    
    // Owner, admin và moderator có thể
    case 'remove_member':
    case 'ban_member':
    case 'approve_join_request':
    case 'promote_to_moderator':
    case 'demote_moderator':
    case 'moderate_posts':
      return role === 'admin' || role === 'moderator';
    
    // Tất cả thành viên có thể (tùy thuộc vào cài đặt nhóm)
    case 'post':
      if (this.settings.postPermissions === 'all_members') return true;
      if (this.settings.postPermissions === 'moderators_and_admins') return role === 'admin' || role === 'moderator';
      if (this.settings.postPermissions === 'admins_only') return role === 'admin';
      return false;
    
    case 'comment':
      if (this.settings.commentPermissions === 'all_members') return true;
      if (this.settings.commentPermissions === 'members_only') return true;
      if (this.settings.commentPermissions === 'admins_only') return role === 'admin';
      return false;
    
    case 'invite':
      return this.settings.allowMemberInvites || role === 'admin' || role === 'moderator';
    
    default:
      return false;
  }
};

// Virtual để kiểm tra xem user có phải thành viên không
groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => {
    const memberId = m.user._id?.toString() || m.user.toString();
    return memberId === userId.toString();
  });
};

// Virtual để kiểm tra xem user có bị cấm không
groupSchema.methods.isBanned = function(userId) {
  const bannedUser = this.bannedUsers.find(b => b.user.toString() === userId.toString());
  if (!bannedUser) return false;
  
  // Kiểm tra xem lệnh cấm có hết hạn không
  if (bannedUser.expiresAt && bannedUser.expiresAt < new Date()) {
    return false;
  }
  
  return true;
};

// Virtual để lấy quyền của user trong nhóm
groupSchema.methods.getUserPermissions = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return null;
  
  return member.permissions;
};

// Method để thêm thành viên mới
groupSchema.methods.addMember = function(userId, role = 'member', permissions = {}) {
  // Kiểm tra xem user đã là thành viên chưa
  if (this.isMember(userId)) {
    throw new Error('User đã là thành viên của nhóm');
  }
  
  // Kiểm tra xem user có bị cấm không
  if (this.isBanned(userId)) {
    throw new Error('User đã bị cấm khỏi nhóm');
  }
  
  const defaultPermissions = {
    canPost: true,
    canComment: true,
    canInvite: false,
    canModerate: false,
    ...permissions
  };
  
  this.members.push({
    user: userId,
    role,
    permissions: defaultPermissions,
    joinedAt: new Date()
  });
  
  this.stats.memberCount = this.members.length;
  return this.save();
};

// Method để xóa thành viên
groupSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(m => m.user.toString() === userId.toString());
  if (memberIndex === -1) {
    throw new Error('User không phải là thành viên của nhóm');
  }
  
  // Không cho phép xóa chủ sở hữu
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Không thể xóa chủ sở hữu khỏi nhóm');
  }
  
  this.members.splice(memberIndex, 1);
  this.stats.memberCount = this.members.length;
  return this.save();
};

// Method để cập nhật vai trò thành viên
groupSchema.methods.updateMemberRole = function(userId, newRole, newPermissions = {}) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User không phải là thành viên của nhóm');
  }
  
  member.role = newRole;
  member.permissions = { ...member.permissions, ...newPermissions };
  return this.save();
};

// Method để thêm yêu cầu tham gia
groupSchema.methods.addJoinRequest = function(userId, message = '') {
  // Kiểm tra xem user đã là thành viên chưa
  if (this.isMember(userId)) {
    throw new Error('User đã là thành viên của nhóm');
  }
  
  // Kiểm tra xem user có bị cấm không
  if (this.isBanned(userId)) {
    throw new Error('User đã bị cấm khỏi nhóm');
  }
  
  // Kiểm tra xem đã có yêu cầu pending chưa
  const existingRequest = this.joinRequests.find(req => 
    req.user.toString() === userId.toString() && req.status === 'pending'
  );
  
  if (existingRequest) {
    throw new Error('Đã có yêu cầu tham gia đang chờ duyệt');
  }
  
  this.joinRequests.push({
    user: userId,
    message,
    requestedAt: new Date(),
    status: 'pending'
  });
  
  return this.save();
};

// Method để duyệt yêu cầu tham gia
groupSchema.methods.approveJoinRequest = function(requestId, reviewedBy) {
  const request = this.joinRequests.id(requestId);
  if (!request) {
    throw new Error('Không tìm thấy yêu cầu tham gia');
  }
  
  if (request.status !== 'pending') {
    throw new Error('Yêu cầu đã được xử lý');
  }
  
  request.status = 'approved';
  request.reviewedBy = reviewedBy;
  request.reviewedAt = new Date();
  
  // Tự động thêm user vào nhóm
  return this.addMember(request.user, 'member').then(() => {
    // Xóa yêu cầu đã được duyệt
    this.joinRequests = this.joinRequests.filter(req => req._id.toString() !== requestId);
    return this.save();
  });
};

// Method để từ chối yêu cầu tham gia
groupSchema.methods.rejectJoinRequest = function(requestId, reviewedBy) {
  const request = this.joinRequests.id(requestId);
  if (!request) {
    throw new Error('Không tìm thấy yêu cầu tham gia');
  }
  
  if (request.status !== 'pending') {
    throw new Error('Yêu cầu đã được xử lý');
  }
  
  request.status = 'rejected';
  request.reviewedBy = reviewedBy;
  request.reviewedAt = new Date();
  
  return this.save();
};

// Method để cấm user
groupSchema.methods.banUser = function(userId, bannedBy, reason = '', expiresAt = null) {
  // Kiểm tra xem user có phải chủ sở hữu không
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Không thể cấm chủ sở hữu');
  }
  
  // Xóa user khỏi danh sách thành viên nếu có
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  this.stats.memberCount = this.members.length;
  
  // Thêm vào danh sách bị cấm
  this.bannedUsers.push({
    user: userId,
    bannedBy,
    reason,
    bannedAt: new Date(),
    expiresAt
  });
  
  return this.save();
};

// Method để bỏ cấm user
groupSchema.methods.unbanUser = function(userId) {
  this.bannedUsers = this.bannedUsers.filter(b => b.user.toString() !== userId.toString());
  return this.save();
};

// Pre-save middleware để cập nhật updatedAt
groupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware để cập nhật memberCount
groupSchema.pre('save', function(next) {
  this.stats.memberCount = this.members.length;
  next();
});

export default mongoose.model('Group', groupSchema);

