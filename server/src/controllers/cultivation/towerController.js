/**
 * Tower 100 Controller
 * API endpoints for Tower climbing, sweeping, and weekly chest
 */

import Cultivation from '../../models/Cultivation.js';
import {
    getTowerStatus as getStatus, buildTowerMonster, climbNextFloor,
    sweepFloor,
    claimWeeklyChest,
    ensureTowerResets
} from '../../services/towerService.js';
import { getTowerMaterials } from '../../services/towerMaterialService.js';
import { TOWER_CONFIG } from '../../config/Tower100.js';
import { saveWithRetry } from '../../utils/dbUtils.js';

// ==================== GET STATUS ====================

/**
 * GET /api/cultivation/tower/status
 * Get current tower progress, attempts, materials
 */
export const getTowerStatus = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.user._id });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: 'Cultivation not found' });
        }

        const changed = ensureTowerResets(cultivation);
        if (changed) {
            await saveWithRetry(cultivation);
        }

        const status = getStatus(cultivation);
        let nextMonsterPreview = null;
        try {
            const monster = await buildTowerMonster(status.nextFloor, cultivation);
            nextMonsterPreview = {
                floor: monster.floor,
                isBoss: monster.isBoss,
                difficulty: monster.difficulty,
                stats: monster.stats
            };
        } catch (previewError) {
            console.error('[TOWER] Preview monster error:', previewError.message);
        }

        status.nextMonsterPreview = nextMonsterPreview;


        // Add player realm info
        status.playerRealm = cultivation.realmLevel;
        status.playerRealmName = cultivation.realmName;
        status.canEnterNextFloor = cultivation.realmLevel >= TOWER_CONFIG.getRequiredRealm(status.nextFloor);

        return res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
};

// ==================== CLIMB ====================

/**
 * POST /api/cultivation/tower/climb
 * Challenge the next floor (uses 1 daily attempt)
 */
export const postTowerClimb = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.user._id });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: 'Cultivation not found' });
        }

        const result = await climbNextFloor(cultivation);

        if (result.status === 'error') {
            return res.status(400).json({
                success: false,
                code: result.code,
                message: result.message,
                ...result
            });
        }

        await saveWithRetry(cultivation);

        // Mark materials as modified for Mongoose
        cultivation.markModified('materials');
        cultivation.markModified('towerProgress');

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// ==================== SWEEP ====================

/**
 * POST /api/cultivation/tower/sweep
 * Sweep a cleared floor for materials (uses 1 daily attempt)
 * Body: { floor?: number } - optional, defaults to highest non-boss
 */
export const postTowerSweep = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.user._id });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: 'Cultivation not found' });
        }

        const floor = req.body?.floor;
        const result = await sweepFloor(cultivation, floor);

        if (result.status === 'error') {
            return res.status(400).json({
                success: false,
                code: result.code,
                message: result.message,
                ...result
            });
        }

        await saveWithRetry(cultivation);
        cultivation.markModified('materials');
        cultivation.markModified('towerProgress');

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// ==================== CLAIM WEEKLY CHEST ====================

/**
 * POST /api/cultivation/tower/claim-chest
 * Claim weekly chest (1 contract/week, requires boss 60 cleared)
 */
export const postTowerClaimChest = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.user._id });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: 'Cultivation not found' });
        }

        const result = claimWeeklyChest(cultivation);

        if (result.status === 'error') {
            return res.status(400).json({
                success: false,
                code: result.code,
                message: result.message
            });
        }

        await saveWithRetry(cultivation);
        cultivation.markModified('materials');
        cultivation.markModified('towerProgress');

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// ==================== FLOOR INFO ====================

/**
 * GET /api/cultivation/tower/floor/:floor
 * Get info about a specific floor (monster, rewards, requirement)
 */
export const getFloorInfo = async (req, res, next) => {
    try {
        const floor = parseInt(req.params.floor);

        if (isNaN(floor) || floor < 1 || floor > TOWER_CONFIG.TOTAL_FLOORS) {
            return res.status(400).json({
                success: false,
                message: `Tầng phải từ 1 đến ${TOWER_CONFIG.TOTAL_FLOORS}`
            });
        }

        const gate = TOWER_CONFIG.getRealmGate(floor);
        const isBoss = TOWER_CONFIG.isBossFloor(floor);
        const difficulty = TOWER_CONFIG.getDifficulty(floor);

        return res.json({
            success: true,
            data: {
                floor,
                isBoss,
                difficulty,
                requiredRealm: gate.realmId,
                requiredRealmName: gate.realmName,
                isWeeklyChestFloor: floor === TOWER_CONFIG.WEEKLY_CHEST_FLOOR
            }
        });
    } catch (error) {
        next(error);
    }
};

// ==================== LEADERBOARD ====================

/**
 * GET /api/cultivation/tower/leaderboard
 * Get top 100 players by highest floor ever
 */
export const getTowerLeaderboard = async (req, res, next) => {
    try {
        const topPlayers = await Cultivation.find({
            'towerProgress.highestFloorEver': { $gt: 0 }
        })
            .sort({ 'towerProgress.highestFloorEver': -1 })
            .limit(100)
            .select('user towerProgress.highestFloorEver towerProgress.totalClimbs realmLevel realmName')
            .populate('user', 'username avatar');

        const leaderboard = topPlayers.map((c, index) => ({
            rank: index + 1,
            userId: c.user?._id,
            username: c.user?.username || 'Unknown',
            avatar: c.user?.avatar,
            highestFloor: c.towerProgress?.highestFloorEver || 0,
            totalClimbs: c.towerProgress?.totalClimbs || 0,
            realmLevel: c.realmLevel,
            realmName: c.realmName
        }));

        return res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        next(error);
    }
};

// ==================== MULTI-SWEEP ====================

/**
 * POST /api/cultivation/tower/sweep-all
 * Use all remaining attempts to sweep a floor
 * Body: { floor?: number } - optional
 */
export const postTowerSweepAll = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.user._id });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: 'Cultivation not found' });
        }

        ensureTowerResets(cultivation);
        const tp = cultivation.towerProgress;
        const attemptsLeft = TOWER_CONFIG.DAILY_ATTEMPTS - (tp.dailyAttemptsUsed || 0);

        if (attemptsLeft <= 0) {
            return res.status(400).json({
                success: false,
                code: 'NO_ATTEMPTS',
                message: 'Hết lượt hôm nay'
            });
        }

        const floor = req.body?.floor;
        const results = [];
        let totalRewards = {
            mat_root_crystal: 0,
            mat_heaven_shard: 0,
            spiritStones: 0,
            exp: 0
        };

        // Sweep all remaining attempts
        for (let i = 0; i < attemptsLeft; i++) {
            const result = await sweepFloor(cultivation, floor);

            if (result.status === 'error') {
                // Nếu chưa sweep được lần nào, trả về lỗi
                if (results.length === 0) {
                    return res.status(400).json({
                        success: false,
                        code: result.code,
                        message: result.message
                    });
                }
                break; // Stop on error, nhưng đã có kết quả
            }

            results.push(result);
            totalRewards.mat_root_crystal += result.rewards.mat_root_crystal;
            totalRewards.mat_heaven_shard += result.rewards.mat_heaven_shard;
            totalRewards.spiritStones += result.rewards.spiritStones;
            totalRewards.exp += result.rewards.exp;
        }

        await saveWithRetry(cultivation);
        cultivation.markModified('materials');
        cultivation.markModified('towerProgress');

        return res.json({
            success: true,
            data: {
                sweepCount: results.length,
                totalRewards,
                attemptsLeft: TOWER_CONFIG.DAILY_ATTEMPTS - (tp.dailyAttemptsUsed || 0),
                message: `Quét đãng ${results.length} tầng hoàn tất! Thu hoạch ${totalRewards.mat_heaven_shard} Thiên Đạo Mảnh, ${totalRewards.mat_root_crystal} Linh Căn Tinh Thạch.`
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getTowerStatus,
    postTowerClimb,
    postTowerSweep,
    postTowerClaimChest,
    getFloorInfo,
    getTowerLeaderboard,
    postTowerSweepAll
};
