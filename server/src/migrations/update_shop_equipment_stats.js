import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

import Equipment from '../models/Equipment.js';

/**
 * Migration: Update shop equipment stats để có đầy đủ ATK, HP, DEF
 * 
 * Background: Shop equipment hiện tại có stats cố định (thường tier 1 tương đương)
 * Cần update để:
 * - Weapons có HP/DEF (không còn 0)
 * - Armors có ATK (không còn 0)
 * - Balanced cho early game players
 * 
 * Chạy: node src/migrations/update_shop_equipment_stats.js
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shiku';

// Base stats cho Tier 1 equipment (matching craftService.js)
const SHOP_EQUIPMENT_STATS = {
    // === VŨ KHÍ (Tier 1) ===
    sword: { attack: 50, defense: 5, hp: 30, crit_rate: 0.03, crit_damage: 0.12, speed: 5 },
    saber: { attack: 65, defense: 8, hp: 25, crit_rate: 0.02, crit_damage: 0.15, speed: 3 },
    spear: { attack: 55, defense: 10, hp: 35, crit_rate: 0.02, crit_damage: 0.10, speed: 6 },
    bow: { attack: 45, defense: 5, hp: 20, crit_rate: 0.06, crit_damage: 0.20, speed: 4 },
    fan: { attack: 35, defense: 10, hp: 50, crit_rate: 0.04, crit_damage: 0.15, speed: 7 },
    flute: { attack: 30, defense: 5, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 8 },
    brush: { attack: 40, defense: 15, hp: 60, crit_rate: 0.04, crit_damage: 0.18, speed: 5 },
    dual_sword: { attack: 70, defense: 12, hp: 40, crit_rate: 0.05, crit_damage: 0.18, speed: 8 },
    flying_sword: { attack: 60, defense: 10, hp: 35, crit_rate: 0.04, crit_damage: 0.15, speed: 10 },

    // === GIÁP (Tier 1) ===
    helmet: { attack: 5, defense: 25, hp: 150, crit_rate: 0, crit_damage: 0, speed: 0 },
    chest: { attack: 10, defense: 60, hp: 250, crit_rate: 0, crit_damage: 0, speed: 0 },
    shoulder: { attack: 5, defense: 35, hp: 100, crit_rate: 0, crit_damage: 0, speed: 2 },
    gloves: { attack: 10, defense: 20, hp: 50, crit_rate: 0.02, crit_damage: 0.08, speed: 3 },
    boots: { attack: 8, defense: 30, hp: 80, crit_rate: 0, crit_damage: 0, speed: 8 },
    belt: { attack: 5, defense: 25, hp: 120, crit_rate: 0.01, crit_damage: 0.05, speed: 2 },

    // === TRANG SỨC (Tier 1) ===
    ring: { attack: 20, defense: 5, hp: 30, crit_rate: 0.04, crit_damage: 0.15, speed: 2 },
    necklace: { attack: 15, defense: 15, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 3 },
    earring: { attack: 10, defense: 10, hp: 40, crit_rate: 0.06, crit_damage: 0.25, speed: 4 },
    bracelet: { attack: 15, defense: 20, hp: 60, crit_rate: 0.02, crit_damage: 0.10, speed: 5 }
};

async function updateShopEquipmentStats() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all active shop equipment
        const equipment = await Equipment.find({ is_active: true });
        
        console.log(`\n📦 Found ${equipment.length} shop equipment items`);

        let totalUpdated = 0;

        for (const item of equipment) {
            const { subtype, stats } = item;
            
            if (!subtype || !SHOP_EQUIPMENT_STATS[subtype]) {
                console.log(`⚠️  Skip ${item.name}: không có subtype hoặc không trong danh sách`);
                continue;
            }

            const newBaseStats = SHOP_EQUIPMENT_STATS[subtype];
            
            // Check xem cần update không
            const needsUpdate = 
                !stats.hp || stats.hp === 0 || 
                !stats.defense || stats.defense === 0 ||
                !stats.attack || stats.attack === 0 ||
                stats.attack !== newBaseStats.attack;

            if (needsUpdate) {
                console.log(`\n🔄 Update ${item.name} (${subtype}):`);
                console.log(`   OLD: ATK=${stats.attack || 0}, HP=${stats.hp || 0}, DEF=${stats.defense || 0}`);
                
                // Update với stats mới
                item.stats = {
                    ...stats,
                    attack: newBaseStats.attack,
                    defense: newBaseStats.defense,
                    hp: newBaseStats.hp,
                    crit_rate: newBaseStats.crit_rate,
                    crit_damage: newBaseStats.crit_damage,
                    speed: newBaseStats.speed,
                    // Keep existing percentage stats
                    qiBlood: newBaseStats.hp,
                    criticalRate: newBaseStats.crit_rate * 100,
                    criticalDamage: newBaseStats.crit_damage * 100
                };

                await item.save();
                totalUpdated++;
                
                console.log(`   NEW: ATK=${item.stats.attack}, HP=${item.stats.hp}, DEF=${item.stats.defense}`);
                console.log(`✅ Updated ${item.name}`);
            }
        }

        console.log(`\n=== MIGRATION COMPLETE ===`);
        console.log(`📦 Total equipment checked: ${equipment.length}`);
        console.log(`✅ Items updated: ${totalUpdated}`);
        console.log(`\n💡 Note: Shop equipment là Tier 1 base stats (cho early game)`);
        console.log(`   Players nên craft equipment cao hơn để có stats mạnh hơn!`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
updateShopEquipmentStats();
