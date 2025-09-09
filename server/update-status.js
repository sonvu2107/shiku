import mongoose from 'mongoose';

async function updatePosts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/myblog');
    console.log('Connected to MongoDB');
    
    // Update all draft posts to private
    const result = await mongoose.connection.db.collection('posts').updateMany(
      { status: 'draft' },
      { $set: { status: 'private' } }
    );
    
    console.log('Updated posts:', result.modifiedCount);
    
    // Check current posts
    const posts = await mongoose.connection.db.collection('posts').find({}).toArray();
    console.log('Current posts status:');
    posts.forEach(post => {
      console.log(`- ${post.title}: ${post.status}`);
    });
    
    await mongoose.disconnect();
    console.log('Database update completed');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

updatePosts();
