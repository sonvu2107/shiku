/**
 * Script to run MongoDB explain() for /feed query optimization
 * Usage: node explain-feed.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
}

async function runExplain() {
    try {
        await mongoose.connect(MONGODB_URI, {
            dbName: process.env.DB_NAME || undefined
        });

        const db = mongoose.connection.db;
        const postsCollection = db.collection('posts');
        const usersCollection = db.collection('users');
        const sampleUser = await usersCollection.findOne({});
        const realUserId = sampleUser ? sampleUser._id : new mongoose.Types.ObjectId();

        const results = {};

        // CASE 1: Guest Feed
        const guestFilter = {
            $and: [
                { group: null },
                { $or: [{ status: 'published', author: { $nin: [] } }] }
            ]
        };

        const guestExplain = await postsCollection
            .find(guestFilter)
            .sort({ createdAt: -1 })
            .limit(20)
            .explain('executionStats');

        results.case1_guest = {
            filter: guestFilter,
            nReturned: guestExplain.executionStats.nReturned,
            totalDocsExamined: guestExplain.executionStats.totalDocsExamined,
            totalKeysExamined: guestExplain.executionStats.totalKeysExamined,
            executionTimeMillis: guestExplain.executionStats.executionTimeMillis,
            winningPlan: guestExplain.queryPlanner.winningPlan
        };

        // CASE 2: Logged-in Feed
        const loggedInFilter = {
            $and: [
                { group: null },
                {
                    $or: [
                        { status: 'published', author: { $nin: [] } },
                        { status: 'private', author: realUserId }
                    ]
                }
            ]
        };

        const loggedInExplain = await postsCollection
            .find(loggedInFilter)
            .sort({ createdAt: -1 })
            .limit(20)
            .explain('executionStats');

        results.case2_loggedIn = {
            userId: realUserId.toString(),
            filter: loggedInFilter,
            nReturned: loggedInExplain.executionStats.nReturned,
            totalDocsExamined: loggedInExplain.executionStats.totalDocsExamined,
            totalKeysExamined: loggedInExplain.executionStats.totalKeysExamined,
            executionTimeMillis: loggedInExplain.executionStats.executionTimeMillis,
            winningPlan: loggedInExplain.queryPlanner.winningPlan
        };

        // BONUS: Simple query
        const simpleFilter = { status: 'published', group: null };

        const simpleExplain = await postsCollection
            .find(simpleFilter)
            .sort({ createdAt: -1 })
            .limit(20)
            .explain('executionStats');

        results.bonus_simple = {
            filter: simpleFilter,
            nReturned: simpleExplain.executionStats.nReturned,
            totalDocsExamined: simpleExplain.executionStats.totalDocsExamined,
            totalKeysExamined: simpleExplain.executionStats.totalKeysExamined,
            executionTimeMillis: simpleExplain.executionStats.executionTimeMillis,
            winningPlan: simpleExplain.queryPlanner.winningPlan
        };

        // Indexes
        results.indexes = await postsCollection.indexes();

        // Write to file
        fs.writeFileSync('explain-results.json', JSON.stringify(results, null, 2));
        console.log('Results written to explain-results.json');

        await mongoose.disconnect();

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

runExplain();
