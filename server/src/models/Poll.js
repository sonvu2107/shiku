import mongoose from "mongoose";

/**
 * Vote Schema - Lưu trữ thông tin vote của user
 */
const VoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  optionIndex: { type: Number, required: true }, // Index của option được vote
  votedAt: { type: Date, default: Date.now }
}, { _id: false });

/**
 * Poll Option Schema - Định nghĩa từng lựa chọn trong poll
 */
const PollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 200 },
  votes: [VoteSchema] // Danh sách users đã vote cho option này
}, { _id: false });

/**
 * Poll Schema - Định nghĩa cấu trúc cho bình chọn/surveys
 */
const PollSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true }, // Bài viết chứa poll
  question: { type: String, required: true, trim: true, maxlength: 500 }, // Câu hỏi poll
  options: {
    type: [PollOptionSchema],
    required: true,
    validate: {
      validator: function(options) {
        return options.length >= 2 && options.length <= 10; // Tối thiểu 2, tối đa 10 options
      },
      message: "Poll phải có từ 2 đến 10 lựa chọn"
    }
  },

  // ==================== CÀI ĐẶT ====================
  allowMultipleVotes: { type: Boolean, default: false }, // Cho phép vote nhiều options
  isPublic: { type: Boolean, default: true }, // Hiển thị ai đã vote gì
  expiresAt: { type: Date, default: null }, // Thời gian hết hạn poll (null = không giới hạn)

  // ==================== METADATA ====================
  totalVotes: { type: Number, default: 0 }, // Tổng số lượt vote (cached)
  isActive: { type: Boolean, default: true } // Poll còn active hay đã đóng
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ==================== INDEXES ====================
PollSchema.index({ post: 1 }); // Index for quick poll lookup by post
PollSchema.index({ expiresAt: 1 }); // Index for expiry checks
PollSchema.index({ "options.votes.user": 1 }); // Index for checking if user voted

// ==================== MIDDLEWARE/HOOKS ====================

/**
 * Pre-save hook: Tính lại tổng số votes và kiểm tra expiry
 */
PollSchema.pre("save", function(next) {
  // Tính tổng số votes từ tất cả options
  this.totalVotes = this.options.reduce((total, option) => {
    return total + (option.votes ? option.votes.length : 0);
  }, 0);

  // Kiểm tra xem poll đã hết hạn chưa
  if (this.expiresAt && new Date() >= this.expiresAt) {
    this.isActive = false;
  }

  next();
});

// ==================== METHODS ====================

/**
 * Kiểm tra user đã vote chưa
 * @param {ObjectId} userId - ID của user
 * @returns {Object|null} Vote info nếu đã vote, null nếu chưa
 */
PollSchema.methods.hasUserVoted = function(userId) {
  for (let i = 0; i < this.options.length; i++) {
    const vote = this.options[i].votes.find(v => v.user.toString() === userId.toString());
    if (vote) {
      return { optionIndex: i, votedAt: vote.votedAt };
    }
  }
  return null;
};

/**
 * Thêm vote mới
 * @param {ObjectId} userId - ID của user
 * @param {Number} optionIndex - Index của option được vote
 * @returns {Boolean} Success status
 */
PollSchema.methods.addVote = function(userId, optionIndex) {
  // Validate optionIndex
  if (optionIndex < 0 || optionIndex >= this.options.length) {
    throw new Error("Option index không hợp lệ");
  }

  // Kiểm tra poll còn active không
  if (!this.isActive) {
    throw new Error("Poll đã đóng");
  }

  // Kiểm tra poll đã hết hạn chưa
  if (this.expiresAt && new Date() >= this.expiresAt) {
    this.isActive = false;
    throw new Error("Poll đã hết hạn");
  }

  // Nếu không cho phép multiple votes, xóa vote cũ
  if (!this.allowMultipleVotes) {
    this.removeVote(userId);
  }

  // Kiểm tra user đã vote option này chưa
  const alreadyVoted = this.options[optionIndex].votes.some(
    v => v.user.toString() === userId.toString()
  );

  if (alreadyVoted) {
    // Nếu đã vote, remove vote (toggle)
    this.options[optionIndex].votes = this.options[optionIndex].votes.filter(
      v => v.user.toString() !== userId.toString()
    );
    return false; // Removed vote
  } else {
    // Thêm vote mới
    this.options[optionIndex].votes.push({
      user: userId,
      optionIndex: optionIndex,
      votedAt: new Date()
    });
    return true; // Added vote
  }
};

/**
 * Xóa tất cả votes của user
 * @param {ObjectId} userId - ID của user
 */
PollSchema.methods.removeVote = function(userId) {
  this.options.forEach(option => {
    option.votes = option.votes.filter(v => v.user.toString() !== userId.toString());
  });
};

/**
 * Lấy kết quả poll
 * @param {Boolean} includeVoters - Có include danh sách voters không
 * @returns {Object} Poll results
 */
PollSchema.methods.getResults = function(includeVoters = false) {
  const results = this.options.map((option, index) => {
    const voteCount = option.votes ? option.votes.length : 0;
    const percentage = this.totalVotes > 0
      ? Math.round((voteCount / this.totalVotes) * 100)
      : 0;

    const result = {
      index,
      text: option.text,
      voteCount,
      percentage
    };

    // Nếu poll là public và yêu cầu include voters
    if (includeVoters && this.isPublic) {
      result.voters = option.votes.map(v => ({
        user: v.user,
        votedAt: v.votedAt
      }));
    }

    return result;
  });

  return {
    question: this.question,
    totalVotes: this.totalVotes,
    isActive: this.isActive,
    expiresAt: this.expiresAt,
    allowMultipleVotes: this.allowMultipleVotes,
    isPublic: this.isPublic,
    results
  };
};

export default mongoose.model("Poll", PollSchema);
