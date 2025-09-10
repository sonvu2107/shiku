import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin", "solo", "sybau", "keeper"], default: "user" },
  bio: { type: String, default: "" },
  avatarUrl: {
    type: String,
    default: function () {
      return `https://ui-avatars.com/api/?name=User&background=3b82f6&color=ffffff`;
    }
  },
  birthday: { type: String, default: "" },
  gender: { type: String, default: "" },
  hobbies: { type: String, default: "" },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentConversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  isOnline: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: "" },
  bannedAt: { type: Date },
  banExpiresAt: { type: Date },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

// Method to check if user is currently banned
UserSchema.methods.isCurrentlyBanned = function () {
  if (!this.isBanned) return false;
  if (!this.banExpiresAt) return true;
  return new Date() < this.banExpiresAt;
};

// Method to get remaining ban time in minutes
UserSchema.methods.getRemainingBanTime = function () {
  if (!this.isCurrentlyBanned()) return 0;
  if (!this.banExpiresAt) return -1; // Permanent ban
  return Math.max(0, Math.ceil((this.banExpiresAt - new Date()) / (1000 * 60)));
};

export default mongoose.model("User", UserSchema);
