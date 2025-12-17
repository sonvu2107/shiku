import express from "express";
import { authRequired } from "../middleware/auth.js";
import { breakthroughLimiter, cultivationLimiter } from "../middleware/rateLimit.js";

// Import all controllers
import {
  // Core
  getCultivation,
  syncCache,
  getBatch,
  getUserCultivation,
  // Login/Quest
  processLogin,
  claimQuestReward,
  // Shop
  getShop,
  buyItem,
  // Inventory
  equipItem,
  unequipItem,
  equipEquipment,
  unequipEquipment,
  getEquipmentStats,
  useItem,
  // Exp/Leaderboard
  collectPassiveExp,
  getPassiveExpStatus,
  getLeaderboard,
  getRealms,
  getExpLog,
  addExp,
  getStats,
  // Combat
  getCombatStats,
  getUserCombatStats,
  practiceTechnique,
  breakthrough,
  fixRealms,
  // Dungeon
  getDungeons,
  enterDungeon,
  getCurrentFloor,
  battleMonster,
  claimRewardsAndExit,
  abandonDungeon,
  getDungeonHistory
} from "../controllers/cultivation/index.js";

const router = express.Router();

// All routes require authentication
router.use(authRequired);

// ==================== CORE ROUTES ====================
router.get("/", getCultivation);
router.post("/sync-cache", syncCache);
router.post("/batch", getBatch);
router.get("/user/:userId", getUserCultivation);

// ==================== LOGIN & QUESTS ====================
router.post("/login", processLogin);
router.post("/quest/:questId/claim", claimQuestReward);

// ==================== SHOP ====================
router.get("/shop", getShop);
router.post("/shop/buy/:itemId", buyItem);

// ==================== INVENTORY & EQUIPMENT ====================
router.post("/inventory/:itemId/equip", equipItem);
router.post("/inventory/:itemId/unequip", unequipItem);
router.post("/inventory/:itemId/use", useItem);
router.post("/equipment/:equipmentId/equip", equipEquipment);
router.post("/equipment/:slot/unequip", unequipEquipment);
router.get("/equipment/stats", getEquipmentStats);

// ==================== EXP & LEADERBOARD ====================
router.post("/collect-passive-exp", collectPassiveExp);
router.get("/passive-exp-status", getPassiveExpStatus);
router.get("/leaderboard", getLeaderboard);
router.get("/realms", getRealms);
router.get("/exp-log", getExpLog);
router.post("/add-exp", cultivationLimiter, addExp);
router.get("/stats", getStats);

// ==================== COMBAT & BREAKTHROUGH ====================
router.get("/combat-stats", getCombatStats);
router.get("/combat-stats/:userId", getUserCombatStats);
router.post("/practice-technique", practiceTechnique);
router.post("/breakthrough", breakthroughLimiter, breakthrough);

// ==================== BÍ CẢNH (DUNGEON) ====================
router.get("/dungeons", getDungeons);
router.post("/dungeons/:dungeonId/enter", enterDungeon);
router.get("/dungeons/:dungeonId/current-floor", getCurrentFloor);
router.post("/dungeons/:dungeonId/battle", battleMonster);
router.post("/dungeons/:dungeonId/claim-exit", claimRewardsAndExit);
router.post("/dungeons/:dungeonId/abandon", abandonDungeon);
router.get("/dungeons/history", getDungeonHistory);

// ==================== ADMIN ====================
router.post("/fix-realms", fixRealms);

export default router;
