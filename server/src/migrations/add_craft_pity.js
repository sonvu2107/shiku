/**
 * Migration: Add craftPity to existing Cultivation documents
 * Run: node server/src/migrations/add_craft_pity.js
 */

import mongoose from 'mongoose';
import Cultivation from '../models/Cultivation.js';
import { connectDB } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    try {
        console.log('[Migration] Connecting to database...');
        await connectDB(process.env.MONGODB_URI);

        console.log('[Migration] Adding craftPity field to existing Cultivation documents...');
        
        const result = await Cultivation.updateMany(
            { craftPity: { $exists: false } },
            { 
                $set: { 
                    craftPity: { 
                        epic: 0, 
                        legendary: 0 
                    } 
                } 
            }
        );

        console.log(`[Migration] ✓ Updated ${result.modifiedCount} documents`);
        console.log('[Migration] Complete!');
        
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Error:', error);
        process.exit(1);
    }
}

migrate();
