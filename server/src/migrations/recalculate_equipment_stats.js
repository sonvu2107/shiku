import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Import models
import Cultivation from '../models/Cultivation.js';
import { generateEquipmentStats } from '../services/craftService.js';

/**
 * Migration: Recalculate tất cả equipment stats với công thức mới
 * - Exponential tier scaling: 2^(tier-1) × 0.05
 * - Tất cả equipment có ATK, HP, DEF (không còn 0)
 * 
 * Chạy: node src/migrations/recalculate_equipment_stats.js
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shiku';

async function recalculateEquipmentStats() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all cultivations với equipment
        const cultivations = await Cultivation.find({
            $or: [
                { 'equipment.weapon': { $exists: true, $ne: null } },
                { 'equipment.helmet': { $exists: true, $ne: null } },
                { 'equipment.chest': { $exists: true, $ne: null } },
                { 'equipment.shoulder': { $exists: true, $ne: null } },
                { 'equipment.gloves': { $exists: true, $ne: null } },
                { 'equipment.boots': { $exists: true, $ne: null } },
                { 'equipment.belt': { $exists: true, $ne: null } },
                { 'equipment.ring': { $exists: true, $ne: null } },
                { 'equipment.necklace': { $exists: true, $ne: null } },
                { 'equipment.earring': { $exists: true, $ne: null } },
                { 'equipment.bracelet': { $exists: true, $ne: null } }
            ]
        });

        console.log(`\n📦 Found ${cultivations.length} cultivations với equipment`);

        let totalUpdated = 0;
        let totalEquipment = 0;

        for (const cultivation of cultivations) {
            let hasChanges = false;
            const equipment = cultivation.equipment || {};

            // All equipment slots
            const slots = [
                'weapon', 'helmet', 'chest', 'shoulder', 
                'gloves', 'boots', 'belt', 
                'ring', 'necklace', 'earring', 'bracelet'
            ];

            for (const slot of slots) {
                const item = equipment[slot];
                if (!item) continue;

                totalEquipment++;

                // Extract thông tin cần thiết
                const { type, subtype, rarity, tier, element } = item;
                
                if (!type || !rarity || !tier) {
                    console.log(`⚠️  Skip ${slot}: thiếu thông tin (${cultivation.userId})`);
                    continue;
                }

                // Recalculate stats với công thức mới
                const newStats = generateEquipmentStats(type, rarity, tier, element, subtype);

                // So sánh stats cũ vs mới
                const oldStats = item.stats || {};
                const statsChanged = 
                    oldStats.attack !== newStats.attack ||
                    oldStats.defense !== newStats.defense ||
                    oldStats.qiBlood !== newStats.qiBlood ||
                    !oldStats.qiBlood || // Missing HP
                    !oldStats.defense;   // Missing DEF

                if (statsChanged) {
                    console.log(`\n🔄 Update ${slot} (${rarity} tier ${tier}):`);
                    console.log(`   OLD: ATK=${oldStats.attack || 0}, HP=${oldStats.qiBlood || 0}, DEF=${oldStats.defense || 0}`);
                    console.log(`   NEW: ATK=${newStats.attack}, HP=${newStats.qiBlood}, DEF=${newStats.defense}`);

                    // Update stats
                    equipment[slot].stats = newStats;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                cultivation.markModified('equipment');
                await cultivation.save();
                totalUpdated++;
                console.log(`✅ Updated cultivation ${cultivation.userId}`);
            }
        }

        console.log(`\n=== MIGRATION COMPLETE ===`);
        console.log(`📦 Total equipment checked: ${totalEquipment}`);
        console.log(`✅ Cultivations updated: ${totalUpdated}`);
        console.log(`🔄 Equipment recalculated with new formula:
   - Exponential scaling: 2^(tier-1) × 0.05
   - All equipment now have ATK + HP + DEF
   - Equipment = 40-120% realm base stats
   - With buffs: equipment = 15-35% total stats`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
recalculateEquipmentStats();
