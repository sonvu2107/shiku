import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio', 'document']
  },
  size: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ type: 1 });
mediaSchema.index({ isActive: 1 });
mediaSchema.index({ title: 'text', description: 'text', originalName: 'text' });
mediaSchema.index({ uploadedAt: -1 });

// Virtual for formatted size
mediaSchema.virtual('formattedSize').get(function() {
  if (this.size === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.size;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
});

// Virtual for uploadedAt (alias for createdAt)
mediaSchema.virtual('uploadedAt').get(function() {
  return this.createdAt;
});

// Methods
mediaSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Ensure virtual fields are serialized
mediaSchema.set('toJSON', { virtuals: true });
mediaSchema.set('toObject', { virtuals: true });

export default mongoose.model('Media', mediaSchema);
