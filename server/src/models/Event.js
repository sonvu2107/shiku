import mongoose from 'mongoose';

/**
 * Event Schema
 * Lưu thông tin sự kiện do người dùng tạo
 * Trường chính: tiêu đề, mô tả, ngày giờ, vị trí, người tạo và danh sách tham dự
 */
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  coverImage: {
    type: String,
    default: null
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  interested: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  declined: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxAttendees: {
    type: Number,
    min: 1
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes phục vụ truy vấn theo ngày, người tạo, trạng thái
eventSchema.index({ date: 1 });
eventSchema.index({ creator: 1 });
eventSchema.index({ isActive: 1 });
eventSchema.index({ title: 'text', description: 'text', location: 'text' });

// Virtuals: tiện ích cho việc đọc dữ liệu mà không lưu vào DB
eventSchema.virtual('attendeeCount').get(function() {
  return this.attendees.length;
});

eventSchema.virtual('interestedCount').get(function() {
  return this.interested.length;
});

eventSchema.virtual('declinedCount').get(function() {
  return this.declined.length;
});

eventSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date();
});

eventSchema.virtual('isPast').get(function() {
  return this.date < new Date();
});

eventSchema.virtual('isFull').get(function() {
  return this.maxAttendees && this.attendees.length >= this.maxAttendees;
});

// Methods: helper để kiểm tra / cập nhật trạng thái người dùng với sự kiện
eventSchema.methods.isAttendee = function(userId) {
  return this.attendees.some(attendee => attendee.toString() === userId.toString());
};

eventSchema.methods.isInterested = function(userId) {
  return this.interested.some(user => user.toString() === userId.toString());
};

eventSchema.methods.isDeclined = function(userId) {
  return this.declined.some(user => user.toString() === userId.toString());
};

eventSchema.methods.addAttendee = function(userId) {
  if (!this.isAttendee(userId)) {
    this.attendees.push(userId);
    // Xóa khỏi danh sách quan tâm và từ chối nếu có
    this.interested = this.interested.filter(id => id.toString() !== userId.toString());
    this.declined = this.declined.filter(id => id.toString() !== userId.toString());
  }
  return this.save();
};

eventSchema.methods.removeAttendee = function(userId) {
  this.attendees = this.attendees.filter(attendee => attendee.toString() !== userId.toString());
  return this.save();
};

eventSchema.methods.addInterested = function(userId) {
  if (!this.isInterested(userId) && !this.isAttendee(userId)) {
    this.interested.push(userId);
    // Xóa khỏi danh sách từ chối
    this.declined = this.declined.filter(id => id.toString() !== userId.toString());
  }
  return this.save();
};

eventSchema.methods.removeInterested = function(userId) {
  this.interested = this.interested.filter(id => id.toString() !== userId.toString());
  return this.save();
};

eventSchema.methods.addDeclined = function(userId) {
  if (!this.isDeclined(userId) && !this.isAttendee(userId)) {
    this.declined.push(userId);
    // Xóa khỏi danh sách quan tâm
    this.interested = this.interested.filter(id => id.toString() !== userId.toString());
  }
  return this.save();
};

eventSchema.methods.removeDeclined = function(userId) {
  this.declined = this.declined.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Đảm bảo virtuals được serialize khi trả về JSON
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

export default mongoose.model('Event', eventSchema);
