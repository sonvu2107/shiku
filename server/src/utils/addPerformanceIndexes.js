/**
 * Add Performance Indexes Utility
 * 
 * Run this script once to add indexes that optimize the slow endpoints:
 * - User.savedPosts: Faster saved posts lookup
 * - User.friends: Faster friends list lookup
 * 
 * Usage: node -e "import('./addPerformanceIndexes.js').then(m => m.default())"
 * Or import and call from another script
 */

import mongoose from 'mongoose';

export default async function addPerformanceIndexes() {
    try {
        const db = mongoose.connection.db;

        if (!db) {
            console.error('MongoDB not connected. Call this after mongoose.connect()');
            return false;
        }

        console.log('\nAdding performance indexes...\n');

        // Index 1: User.savedPosts for efficient saved posts lookup
        console.log('  → Creating index: users.savedPosts');
        try {
            await db.collection('users').createIndex(
                { savedPosts: 1 },
                { name: 'savedPosts_1', background: true }
            );
            console.log('     users.savedPosts index created');
        } catch (err) {
            if (err.code === 85) {
                console.log('    ⏭  users.savedPosts index already exists');
            } else {
                console.error('     Error:', err.message);
            }
        }

        // Index 2: User.friends for efficient friends lookup
        console.log('  → Creating index: users.friends');
        try {
            await db.collection('users').createIndex(
                { friends: 1 },
                { name: 'friends_1', background: true }
            );
            console.log('     users.friends index created');
        } catch (err) {
            if (err.code === 85) {
                console.log('    ⏭  users.friends index already exists');
            } else {
                console.error('     Error:', err.message);
            }
        }

        console.log('\n Index creation complete!');
        return true;

    } catch (error) {
        console.error(' Error adding indexes:', error);
        return false;
    }
}
