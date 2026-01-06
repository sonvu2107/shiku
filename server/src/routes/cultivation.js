import express from "express";
import { authRequired } from "../middleware/auth.js";
import { breakthroughLimiter, cultivationLimiter } from "../middleware/rateLimit.js";
import { getSummary } from "../controllers/cultivation/summaryController.js";
import { getCombatStatsLean } from "../controllers/cultivation/combatStatsController.js";
import { getInventoryPaginated } from "../controllers/cultivation/inventoryPaginatedController.js";

// Import all controllers
import {
  // Core
  getCultivation,
  syncCache,
  getBatch,
  getUserCultivation,
  updateCharacterAppearance,
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
  getTierConfig,
  // Combat
  getCombatStats,
  getUserCombatStats,
  practiceTechnique,
  startPracticeSession,
  claimPracticeSession,
  getPracticeSessionStatus,
  breakthrough,
  fixRealms,
  // Dungeon
  getDungeons,
  enterDungeon,
  getCurrentFloor,
  battleMonster,
  claimRewardsAndExit,
  abandonDungeon,
  getDungeonHistory,
  // Techniques
  listTechniques,
  learnTechnique,
  equipTechnique,
  activateTechnique,
  claimTechnique,
  // World Events - Thiên Hạ Ký
  getWorldEvents,
  // Materials
  getMaterialCatalog,
  getUserMaterials,
  getDropHistory,
  // Crafting
  getCraftableTypes,
  previewCraftResult,
  executeCrafting,
  getCraftHistory,
  // Equipment Management
  getEquipmentDetails,
  repairEquipment,
  repairAllEquipment,
  previewRepairAll,
  getActiveModifiers,
  checkCanEquip
} from "../controllers/cultivation/index.js";


const router = express.Router();

// All routes require authentication
router.use(authRequired);

// ==================== CORE ROUTES ====================
// Lightweight summary endpoint (minimal data)
router.get("/summary", getSummary);
router.get("/inventory-paginated", getInventoryPaginated);  // Paginated inventory

router.get("/", getCultivation);
router.post("/sync-cache", syncCache);
router.post("/batch", getBatch);
router.get("/user/:userId", getUserCultivation);
router.post("/update-character-appearance", updateCharacterAppearance);

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
router.get("/tier-config", getTierConfig);

// ==================== THIÊN HẠ KÝ (WORLD EVENTS) ====================
router.get("/world-events", getWorldEvents);


// ==================== COMBAT & BREAKTHROUGH ====================
router.get("/combat-stats", getCombatStats);
router.get("/combat-stats-lean", getCombatStatsLean);  // New lightweight endpoint
router.get("/combat-stats/:userId", getUserCombatStats);
router.post("/practice-technique", practiceTechnique);
router.post("/breakthrough", breakthroughLimiter, breakthrough);

// ==================== PHIÊN LUYỆN CÔNG PHÁP (NHẬP ĐỊNH 10 PHÚT) ====================
router.get("/practice-session/status", getPracticeSessionStatus);
router.post("/practice-session/start", startPracticeSession);
router.post("/practice-session/claim", claimPracticeSession);

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

// ==================== CÔNG PHÁP (TECHNIQUES) ====================
router.get("/techniques", listTechniques);
router.post("/techniques/learn", learnTechnique);
router.post("/techniques/equip", equipTechnique);
router.post("/techniques/activate", activateTechnique);
router.post("/techniques/claim", claimTechnique);

// ==================== NGUYÊN LIỆU LUYỆN KHÍ (MATERIALS) ====================
router.get("/materials/catalog", getMaterialCatalog);
router.get("/materials/inventory", getUserMaterials);
router.get("/materials/drops/history", getDropHistory);

// ==================== LUYỆN CHẾ TRANG BỊ (CRAFTING) ====================
router.get("/craft/types", getCraftableTypes);
router.post("/craft/preview", previewCraftResult);
router.post("/craft/execute", executeCrafting);
router.get("/craft/history", getCraftHistory);

// ==================== QUẢN LÝ TRANG BỊ (EQUIPMENT) ====================
router.get("/equipment/active-modifiers", getActiveModifiers);
router.get("/equipment/repair-all/preview", previewRepairAll);
router.post("/equipment/repair-all", repairAllEquipment);
router.get("/equipment/:equipmentId", getEquipmentDetails);
router.post("/equipment/:equipmentId/repair", repairEquipment);
router.post("/equipment/:equipmentId/check-equip", checkCanEquip);

export default router;
