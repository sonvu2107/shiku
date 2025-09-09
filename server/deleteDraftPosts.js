const mongoose = require('mongoose');

async function deleteDraftPosts() {
  try {
    // Kết nối đến MongoDB
    await mongoose.connect('mongodb://localhost:27017/myblog');
    console.log('Đã kết nối MongoDB');

    // Xóa tất cả bài viết có status "draft"
    const result = await mongoose.connection.db.collection('posts').deleteMany({ 
      status: 'draft' 
    });
    
    console.log(`Đã xóa ${result.deletedCount} bài viết draft`);
    
    // Đóng kết nối
    await mongoose.disconnect();
    console.log('Hoàn thành!');
  } catch (error) {
    console.error('Lỗi:', error);
    await mongoose.disconnect();
  }
}

deleteDraftPosts();
