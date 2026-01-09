// routes/sects.js
import express from "express";
import mongoose from "mongoose";
import Sect from "../models/Sect.js";
import SectMember from "../models/SectMember.js";
import SectContribution from "../models/SectContribution.js";
import SectRaidLog from "../models/SectRaidLog.js";
import Cultivation from "../models/Cultivation.js";
import { SECT_BUILDINGS } from "../data/sectBuildings.js";
import { SECT_RAIDS } from "../data/sectRaids.js";
import { RAID_ATTACKS, calculateRaidDamage, getCooldownRemaining } from "../data/sectRaidConfig.js";
import { SECT_TECHNIQUES, getTechniquesForLibraryLevel } from "../data/sectTechniques.js";
import { toWeekKeyUTC } from "../services/sectTime.js";
import { applySectContribution } from "../services/sectContributionService.js";
import { authRequired, authOptional } from "../middleware/jwtSecurity.js";
import { invalidateCultivationCache } from "../controllers/cultivation/index.js";

const router = express.Router();

/**
 * Helper: Tạo random ID cho raid
 */
function randomId(prefix = "raid") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ==================== PUBLIC ROUTES ====================

/**
 * GET /api/sects
 * Danh sách tông môn công khai
 */
router.get("/", authOptional, async (req, res) => {
    try {
        const { q, limit = 50 } = req.query;
        const filter = { isActive: true, "settings.isPublic": true };

        if (q && String(q).trim()) {
            filter.$text = { $search: String(q).trim() };
        }

        const sects = await Sect.find(filter)
            .select("name description avatar banner owner level spiritEnergy memberCount settings createdAt")
            .populate("owner", "name avatarUrl")
            .sort({ level: -1, spiritEnergy: -1 })
            .limit(Math.min(Number(limit), 100));

        res.json({ success: true, data: sects });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching sects:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải danh sách tông môn" });
    }
});

/**
 * GET /api/sects/my-sect
 * Tông môn của user hiện tại - PHẢI đặt trước /:id
 */
router.get("/my-sect", authRequired, async (req, res) => {
    try {
        const userId = req.user._id;

        const member = await SectMember.findOne({ user: userId, isActive: true });
        if (!member) {
            return res.json({ success: true, data: null });
        }

        const sect = await Sect.findById(member.sect)
            .populate("owner", "name avatarUrl");

        if (!sect) {
            return res.json({ success: true, data: null });
        }

        // Lay contribution cua user
        const contribution = await SectContribution.findOne({
            sect: member.sect,
            user: userId
        });

        // Lay top damage tuan nay
        const weekKey = toWeekKeyUTC(new Date());
        const raidTopDamage = await SectRaidLog.find({ sect: member.sect, weekKey, damage: { $gt: 0 } })
            .sort({ damage: -1 })
            .limit(5)
            .populate("user", "name avatarUrl");

        // Lay thong tin cultivation chung (optional fallback)
        const cultivation = await Cultivation.findOne({ user: userId }).select("dailyProgress activePracticeSession");

        // Lay thong tin dong gop trong ngay hien tai (checkin, bai viet da dang cho tong mon...)
        const { toDateKeyUTC } = await import("../services/sectTime.js");
        const SectDailyStat = (await import("../models/SectDailyStat.js")).default;

        const dateKey = toDateKeyUTC(new Date());
        let dailyStat = await SectDailyStat.findOne({ sect: member.sect, user: userId, dateKey });

        // Neu chua co record ngay hom nay, tra ve default object (chua checkin, 0 contributions)
        if (!dailyStat) {
            dailyStat = {
                checkinDone: false,
                posts: 0,
                comments: 0,
                upvotesReceived: 0
            };
        }

        res.json({
            success: true,
            data: {
                sect: {
                    ...sect.toObject(),
                    raidTopDamage,
                    // Ẩn currentRaid nếu là tuần cũ
                    currentRaid: sect.currentRaid?.weekKey === weekKey ? sect.currentRaid : null
                },
                membership: { role: member.role, joinedAt: member.joinedAt },
                contribution: contribution ? {
                    totalEnergy: contribution.totalEnergy,
                    weeklyEnergy: contribution.weekly?.energy || 0,
                    weekKey: contribution.weekly?.weekKey
                } : null,
                dailyProgress: cultivation ? cultivation.dailyProgress : null,
                sectDailyProgress: {
                    checkinDone: dailyStat.checkinDone,
                    posts: dailyStat.posts || 0,
                    comments: dailyStat.comments || 0,
                    upvotesReceived: dailyStat.upvotesReceived || 0
                }
            }
        });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching my sect:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải tông môn của bạn" });
    }
});

/**
 * GET /api/sects/:id
 * Chi tiết tông môn
 */
router.get("/:id", authOptional, async (req, res) => {
    try {
        const sect = await Sect.findById(req.params.id)
            .populate("owner", "name avatarUrl");

        if (!sect || !sect.isActive) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        }

        // Thêm thông tin membership nếu user đã đăng nhập
        let membership = null;
        if (req.user) {
            const member = await SectMember.findOne({
                sect: sect._id,
                user: req.user._id,
                isActive: true
            });
            if (member) {
                membership = { role: member.role, joinedAt: member.joinedAt };
            }
        }

        // Ẩn currentRaid nếu là tuần cũ
        const weekKey = toWeekKeyUTC(new Date());
        const sectData = {
            ...sect.toObject(),
            membership,
            currentRaid: sect.currentRaid?.weekKey === weekKey ? sect.currentRaid : null
        };

        res.json({ success: true, data: sectData });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching sect:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải thông tin tông môn" });
    }
});

// ==================== AUTHENTICATED ROUTES ====================

/**
 * POST /api/sects
 * Tạo tông môn mới
 */
router.post("/", authRequired, async (req, res) => {
    const userId = req.user._id;
    const { name, description, avatar, banner, settings } = req.body || {};

    if (!name || String(name).trim().length < 3) {
        return res.status(400).json({ success: false, message: "Tên tông môn phải có ít nhất 3 ký tự" });
    }

    const session = await mongoose.startSession();
    try {
        let created = null;

        await session.withTransaction(async () => {
            // Kiểm tra user đã có sect chưa
            const existing = await SectMember.findOne({ user: userId, isActive: true }).session(session);
            if (existing) {
                throw new Error("USER_ALREADY_IN_SECT");
            }

            // Tạo sect
            const sect = await Sect.create(
                [{
                    name: String(name).trim(),
                    description: description ? String(description).trim() : "",
                    avatar,
                    banner,
                    owner: userId,
                    memberCount: 1,
                    settings: settings || undefined,
                    buildings: [],
                    currentRaid: null,
                }],
                { session }
            );

            const sectId = sect[0]._id;

            // Tạo membership cho owner
            await SectMember.create(
                [{
                    sect: sectId,
                    user: userId,
                    role: "owner",
                    isActive: true,
                }],
                { session }
            );

            // Tạo contribution record
            await SectContribution.create([{ sect: sectId, user: userId }], { session });

            created = sect[0];
        });

        res.status(201).json({ success: true, message: "Tạo tông môn thành công", data: created });
    } catch (e) {
        if (String(e?.message) === "USER_ALREADY_IN_SECT") {
            return res.status(409).json({ success: false, message: "Bạn đã là thành viên của một tông môn khác" });
        }
        console.error("[ERROR][SECTS] Error creating sect:", e);
        return res.status(500).json({ success: false, message: "Lỗi khi tạo tông môn" });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/sects/:id/join
 * Xin gia nhập tông môn
 */
router.post("/:id/join", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const session = await mongoose.startSession();

    try {
        let requiresApproval = false;

        await session.withTransaction(async () => {
            const sect = await Sect.findOne({ _id: sectId, isActive: true }).session(session);
            if (!sect) throw new Error("SECT_NOT_FOUND");

            if (!sect.settings?.isPublic) throw new Error("SECT_PRIVATE");

            // Kiểm tra đã là thành viên active của tông môn khác
            const existingActive = await SectMember.findOne({ user: userId, isActive: true }).session(session);
            if (existingActive) throw new Error("USER_ALREADY_IN_SECT");

            // Kiểm tra đã có đơn pending ở tông môn này
            const existingPending = await SectMember.findOne({
                sect: sectId,
                user: userId,
                status: "pending"
            }).session(session);
            if (existingPending) throw new Error("ALREADY_PENDING");

            // Kiểm tra cần duyệt không
            requiresApproval = sect.settings?.joinApproval === "approval";

            if (requiresApproval) {
                // Tạo đơn xin gia nhập (pending)
                await SectMember.create([{
                    sect: sectId,
                    user: userId,
                    role: "disciple",
                    status: "pending",
                    isActive: false
                }], { session });
            } else {
                // Gia nhập ngay (active)
                await SectMember.create([{
                    sect: sectId,
                    user: userId,
                    role: "disciple",
                    status: "active",
                    isActive: true
                }], { session });

                await SectContribution.findOneAndUpdate(
                    { sect: sectId, user: userId },
                    { $setOnInsert: { sect: sectId, user: userId } },
                    { upsert: true, session }
                );

                await Sect.updateOne({ _id: sectId }, { $inc: { memberCount: 1 } }).session(session);
            }
        });

        if (requiresApproval) {
            res.json({ success: true, message: "Đã gửi đơn xin gia nhập, vui lòng chờ duyệt", pending: true });
        } else {
            res.json({ success: true, message: "Gia nhập tông môn thành công" });
        }
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "SECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        if (msg === "SECT_PRIVATE") return res.status(403).json({ success: false, message: "Tông môn này không công khai" });
        if (msg === "USER_ALREADY_IN_SECT") return res.status(409).json({ success: false, message: "Bạn đã là thành viên của một tông môn khác" });
        if (msg === "ALREADY_PENDING") return res.status(409).json({ success: false, message: "Bạn đã gửi đơn xin gia nhập tông môn này" });
        console.error("[ERROR][SECTS] Error joining sect:", e);
        return res.status(500).json({ success: false, message: "Lỗi khi gia nhập tông môn" });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/sects/:id/leave
 * Rời khỏi tông môn
 */
router.post("/:id/leave", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true }).session(session);
            if (!member) throw new Error("NOT_MEMBER");

            // If owner, check if they're the only member
            if (member.role === "owner") {
                // Count other active members (excluding owner)
                const otherMembersCount = await SectMember.countDocuments({
                    sect: sectId,
                    isActive: true,
                    user: { $ne: userId }
                }).session(session);

                if (otherMembersCount > 0) {
                    // Still has other members, cannot leave without transfer
                    throw new Error("OWNER_MUST_TRANSFER");
                }

                // Solo owner - allow disband
                // Deactivate the sect
                await Sect.updateOne(
                    { _id: sectId },
                    { isActive: false, memberCount: 0 }
                ).session(session);

                // Deactivate owner membership
                member.isActive = false;
                await member.save({ session });
            } else {
                // Regular member can leave normally
                member.isActive = false;
                await member.save({ session });

                await Sect.updateOne({ _id: sectId }, { $inc: { memberCount: -1 } }).session(session);
            }
        });

        res.json({ success: true, message: "Rời tông môn thành công" });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NOT_MEMBER") return res.status(404).json({ success: false, message: "Bạn không phải thành viên" });
        if (msg === "OWNER_MUST_TRANSFER") return res.status(403).json({ success: false, message: "Môn chủ phải chuyển quyền cho thành viên khác trước khi rời đi" });
        console.error("[ERROR][SECTS] Error leaving sect:", e);
        return res.status(500).json({ success: false, message: "Lỗi khi rời tông môn" });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/sects/:id/daily-checkin
 * Điểm danh hàng ngày trong tông môn
 */
router.post("/:id/daily-checkin", authRequired, async (req, res) => {
    try {
        const userId = req.user._id;
        const sectId = req.params.id;

        const result = await applySectContribution({ userId, sectId, type: "daily_checkin" });

        if (!result.applied) {
            return res.status(400).json({ success: false, message: result.reason, data: result });
        }

        res.json({ success: true, message: "Điểm danh thành công", data: result });
    } catch (error) {
        console.error("[ERROR][SECTS] Error daily checkin:", error);
        res.status(500).json({ success: false, message: "Lỗi khi điểm danh" });
    }
});

/**
 * POST /api/sects/:id/upgrade-building
 * Nâng cấp công trình
 */
router.post("/:id/upgrade-building", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const { buildingId } = req.body || {};

    const def = SECT_BUILDINGS[buildingId];
    if (!def) {
        return res.status(400).json({ success: false, message: "Công trình không tồn tại" });
    }

    const session = await mongoose.startSession();
    try {
        let updated = null;

        await session.withTransaction(async () => {
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true }).session(session);
            if (!member) throw new Error("NOT_MEMBER");

            // Chỉ owner/elder mới được nâng cấp
            if (!["owner", "elder"].includes(member.role)) throw new Error("NO_PERMISSION");

            const sect = await Sect.findById(sectId).session(session);
            if (!sect || !sect.isActive) throw new Error("SECT_NOT_FOUND");

            const b = sect.buildings.find((x) => x.buildingId === buildingId);
            const currentLevel = b ? b.level : 0;
            const nextLevel = currentLevel + 1;

            if (nextLevel > def.maxLevel) throw new Error("MAX_LEVEL");

            const cost = def.costs[nextLevel];
            if (sect.spiritEnergy < cost) throw new Error("NOT_ENOUGH_ENERGY");

            // Trừ Linh Khí và nâng cấp
            sect.spiritEnergy -= cost;

            if (b) {
                b.level = nextLevel;
                b.builtAt = new Date();
            } else {
                sect.buildings.push({ buildingId, level: nextLevel, builtAt: new Date() });
            }

            updated = await sect.save({ session });
        });

        res.json({ success: true, message: "Nâng cấp thành công", data: updated });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NOT_MEMBER") return res.status(403).json({ success: false, message: "Bạn không phải thành viên" });
        if (msg === "NO_PERMISSION") return res.status(403).json({ success: false, message: "Bạn không có quyền nâng cấp" });
        if (msg === "SECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        if (msg === "MAX_LEVEL") return res.status(400).json({ success: false, message: "Công trình đã đạt cấp tối đa" });
        if (msg === "NOT_ENOUGH_ENERGY") return res.status(400).json({ success: false, message: "Không đủ Linh Khí" });
        console.error("[ERROR][SECTS] Error upgrading building:", e);
        return res.status(500).json({ success: false, message: "Lỗi khi nâng cấp công trình" });
    } finally {
        session.endSession();
    }
});

/**
 * GET /api/sects/:id/contributions
 * Bảng xếp hạng đóng góp tuần
 */
router.get("/:id/contributions", authOptional, async (req, res) => {
    try {
        const sectId = req.params.id;
        const limit = Math.min(Number(req.query.limit || 10), 50);
        const weekKey = toWeekKeyUTC(new Date());

        const rows = await SectContribution.find({
            sect: sectId,
            "weekly.weekKey": weekKey
        })
            .sort({ "weekly.energy": -1 })
            .limit(limit)
            .populate("user", "name avatarUrl");

        res.json({ success: true, data: { weekKey, rows } });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching contributions:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải bảng xếp hạng" });
    }
});

// ==================== MEMBER MANAGEMENT ====================



/**
 * POST /api/sects/:id/kick/:userId
 * Đuổi thành viên (owner/elder)
 */
router.post("/:id/kick/:userId", authRequired, async (req, res) => {
    const actorId = req.user._id;
    const sectId = req.params.id;
    const targetUserId = req.params.userId;

    try {
        const actor = await SectMember.findOne({ sect: sectId, user: actorId, isActive: true });
        if (!actor || !["owner", "elder"].includes(actor.role)) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền đuổi thành viên" });
        }

        const target = await SectMember.findOne({ sect: sectId, user: targetUserId, isActive: true });
        if (!target) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thành viên" });
        }

        // Cannot kick owner
        if (target.role === "owner") {
            return res.status(400).json({ success: false, message: "Không thể đuổi Chưởng Môn" });
        }

        // Elder can only kick members, not other elders
        if (actor.role === "elder" && target.role === "elder") {
            return res.status(403).json({ success: false, message: "Trưởng Lão không thể đuổi Trưởng Lão khác" });
        }

        target.isActive = false;
        target.leftAt = new Date();
        await target.save();

        res.json({ success: true, message: "Đã đuổi thành viên khỏi tông môn" });
    } catch (error) {
        console.error("[ERROR][SECTS] Error kicking member:", error);
        res.status(500).json({ success: false, message: "Lỗi khi đuổi thành viên" });
    }
});

/**
 * POST /api/sects/:id/promote/:userId
 * Thăng chức thành viên lên Trưởng Lão (owner only)
 */
router.post("/:id/promote/:userId", authRequired, async (req, res) => {
    const actorId = req.user._id;
    const sectId = req.params.id;
    const targetUserId = req.params.userId;

    try {
        const actor = await SectMember.findOne({ sect: sectId, user: actorId, isActive: true });
        if (!actor || actor.role !== "owner") {
            return res.status(403).json({ success: false, message: "Chỉ Chưởng Môn mới có thể thăng chức" });
        }

        const target = await SectMember.findOne({ sect: sectId, user: targetUserId, isActive: true });
        if (!target) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thành viên" });
        }

        // Chỉ thăng Đệ Tử (disciple) lên Trưởng Lão
        if (target.role !== "disciple") {
            return res.status(400).json({ success: false, message: "Chỉ có thể thăng chức Đệ Tử" });
        }

        target.role = "elder";
        await target.save();

        res.json({ success: true, message: "Đã thăng chức thành Trưởng Lão" });
    } catch (error) {
        console.error("[ERROR][SECTS] Error promoting member:", error);
        res.status(500).json({ success: false, message: "Lỗi khi thăng chức" });
    }
});

/**
 * POST /api/sects/:id/demote/:userId
 * Giáng chức Trưởng Lão xuống Đệ Tử (owner only)
 */
router.post("/:id/demote/:userId", authRequired, async (req, res) => {
    const actorId = req.user._id;
    const sectId = req.params.id;
    const targetUserId = req.params.userId;

    try {
        const actor = await SectMember.findOne({ sect: sectId, user: actorId, isActive: true });
        if (!actor || actor.role !== "owner") {
            return res.status(403).json({ success: false, message: "Chỉ Chưởng Môn mới có thể giáng chức" });
        }

        const target = await SectMember.findOne({ sect: sectId, user: targetUserId, isActive: true });
        if (!target) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thành viên" });
        }

        if (target.role !== "elder") {
            return res.status(400).json({ success: false, message: "Chỉ có thể giáng chức Trưởng Lão" });
        }

        target.role = "disciple";
        await target.save();

        res.json({ success: true, message: "Đã giáng chức thành Đệ Tử" });
    } catch (error) {
        console.error("[ERROR][SECTS] Error demoting member:", error);
        res.status(500).json({ success: false, message: "Lỗi khi giáng chức" });
    }
});

/**
 * POST /api/sects/:id/transfer/:userId
 * Chuyển quyền Chưởng Môn (owner only)
 */
router.post("/:id/transfer/:userId", authRequired, async (req, res) => {
    const actorId = req.user._id;
    const sectId = req.params.id;
    const targetUserId = req.params.userId;

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const actor = await SectMember.findOne({ sect: sectId, user: actorId, isActive: true }).session(session);
            if (!actor || actor.role !== "owner") {
                throw new Error("NO_PERMISSION");
            }

            const target = await SectMember.findOne({ sect: sectId, user: targetUserId, isActive: true }).session(session);
            if (!target) {
                throw new Error("TARGET_NOT_FOUND");
            }

            if (target.role === "owner") {
                throw new Error("ALREADY_OWNER");
            }

            // Transfer ownership
            actor.role = "elder";
            target.role = "owner";

            await actor.save({ session });
            await target.save({ session });
        });

        res.json({ success: true, message: "Đã chuyển quyền Chưởng Môn" });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NO_PERMISSION") return res.status(403).json({ success: false, message: "Chỉ Chưởng Môn mới có thể chuyển quyền" });
        if (msg === "TARGET_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy thành viên" });
        if (msg === "ALREADY_OWNER") return res.status(400).json({ success: false, message: "Người này đã là Chưởng Môn" });
        console.error("[ERROR][SECTS] Error transferring ownership:", e);
        res.status(500).json({ success: false, message: "Lỗi khi chuyển quyền" });
    } finally {
        session.endSession();
    }
});

/**
 * GET /api/sects/:id/members
 * Danh sách thành viên (hỗ trợ filter theo status)
 */
router.get("/:id/members", authOptional, async (req, res) => {
    try {
        const sectId = req.params.id;
        const { page = 1, limit = 20, status = "active" } = req.query;

        // Build filter based on status
        const filter = { sect: sectId };
        if (status === "pending") {
            filter.status = "pending";
        } else {
            // Lấy thành viên active (bao gồm cả các thành viên cũ chưa có field status)
            filter.isActive = true;
            filter.$or = [
                { status: "active" },
                { status: { $exists: false } },
                { status: null }
            ];
        }

        const members = await SectMember.find(filter)
            .populate("user", "name avatarUrl")
            .sort({ role: 1, joinedAt: 1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await SectMember.countDocuments(filter);

        // Đếm số đơn pending (cho badge)
        const pendingCount = await SectMember.countDocuments({ sect: sectId, status: "pending" });

        res.json({
            success: true,
            data: {
                members,
                pendingCount,
                pagination: { page: Number(page), limit: Number(limit), total }
            }
        });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching members:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải danh sách thành viên" });
    }
});

/**
 * POST /api/sects/:id/approve/:userId
 * Duyệt đơn xin gia nhập (owner/elder)
 */
router.post("/:id/approve/:userId", authRequired, async (req, res) => {
    const actorId = req.user._id;
    const sectId = req.params.id;
    const targetUserId = req.params.userId;

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const actor = await SectMember.findOne({ sect: sectId, user: actorId, isActive: true }).session(session);
            if (!actor || !["owner", "elder"].includes(actor.role)) {
                throw new Error("NO_PERMISSION");
            }

            const pending = await SectMember.findOne({ sect: sectId, user: targetUserId, status: "pending" }).session(session);
            if (!pending) {
                throw new Error("NOT_FOUND");
            }

            // Kiểm tra user đã có tông môn khác chưa (có thể đã gia nhập trong lúc chờ)
            const existingActive = await SectMember.findOne({ user: targetUserId, isActive: true }).session(session);
            if (existingActive) {
                throw new Error("USER_ALREADY_IN_SECT");
            }

            // Approve
            pending.status = "active";
            pending.isActive = true;
            pending.joinedAt = new Date();
            await pending.save({ session });

            // Tạo contribution record
            await SectContribution.findOneAndUpdate(
                { sect: sectId, user: targetUserId },
                { $setOnInsert: { sect: sectId, user: targetUserId } },
                { upsert: true, session }
            );

            await Sect.updateOne({ _id: sectId }, { $inc: { memberCount: 1 } }).session(session);
        });

        res.json({ success: true, message: "Đã duyệt đơn gia nhập" });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NO_PERMISSION") return res.status(403).json({ success: false, message: "Bạn không có quyền duyệt đơn" });
        if (msg === "NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy đơn xin gia nhập" });
        if (msg === "USER_ALREADY_IN_SECT") return res.status(409).json({ success: false, message: "Người này đã gia nhập tông môn khác" });
        console.error("[ERROR][SECTS] Error approving member:", e);
        res.status(500).json({ success: false, message: "Lỗi khi duyệt đơn" });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/sects/:id/reject/:userId
 * Từ chối đơn xin gia nhập (owner/elder)
 */
router.post("/:id/reject/:userId", authRequired, async (req, res) => {
    const actorId = req.user._id;
    const sectId = req.params.id;
    const targetUserId = req.params.userId;

    try {
        const actor = await SectMember.findOne({ sect: sectId, user: actorId, isActive: true });
        if (!actor || !["owner", "elder"].includes(actor.role)) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền từ chối đơn" });
        }

        const pending = await SectMember.findOne({ sect: sectId, user: targetUserId, status: "pending" });
        if (!pending) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn xin gia nhập" });
        }

        // Xóa đơn pending (hoặc có thể đổi status thành rejected nếu cần lưu lịch sử)
        await SectMember.deleteOne({ _id: pending._id });

        res.json({ success: true, message: "Đã từ chối đơn gia nhập" });
    } catch (error) {
        console.error("[ERROR][SECTS] Error rejecting member:", error);
        res.status(500).json({ success: false, message: "Lỗi khi từ chối đơn" });
    }
});

// ==================== LIBRARY TECHNIQUES ====================

/**
 * GET /api/sects/:id/library/techniques
 * Lấy danh sách công pháp có thể học từ Tàng Kinh Các
 */
router.get("/:id/library/techniques", authRequired, async (req, res) => {
    try {
        const sectId = req.params.id;
        const userId = req.user._id;

        // Check membership
        const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true });
        if (!member) {
            return res.status(403).json({ success: false, message: "Bạn không phải thành viên tông môn này" });
        }

        const sect = await Sect.findById(sectId);
        if (!sect) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        }

        const libraryLevel = (sect.buildings || []).find(b => b.buildingId === "library")?.level || 0;
        const availableTechniques = getTechniquesForLibraryLevel(libraryLevel);

        // Get user's cultivation to check which techniques they already have
        const cultivation = await Cultivation.findOne({ user: userId });
        const learnedIds = cultivation?.sectTechniques?.map(t => t.id) || [];

        // Get user's weekly contribution
        const weekKey = toWeekKeyUTC(new Date());
        const contribution = await SectContribution.findOne({ sect: sectId, user: userId });
        const weeklyContribution = contribution?.weekly?.weekKey === weekKey ? contribution.weekly.energy : 0;

        // Tính số slot công pháp theo cấp Tàng Kinh Các
        const techniqueSlots = SECT_BUILDINGS.library?.effects?.[libraryLevel]?.techniqueSlots || 0;

        res.json({
            success: true,
            data: {
                libraryLevel,
                techniqueSlots,
                techniques: availableTechniques.map(t => ({
                    ...t,
                    learned: learnedIds.includes(t.id),
                    canAfford: weeklyContribution >= t.contributionCost
                })),
                weeklyContribution
            }
        });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching library techniques:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải công pháp" });
    }
});

/**
 * POST /api/sects/:id/library/learn/:techniqueId
 * Học công pháp từ Tàng Kinh Các
 */
router.post("/:id/library/learn/:techniqueId", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const techniqueId = req.params.techniqueId;

    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            // Check membership
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true }).session(session);
            if (!member) throw new Error("NOT_MEMBER");

            const sect = await Sect.findById(sectId).session(session);
            if (!sect) throw new Error("SECT_NOT_FOUND");

            // Find technique
            const technique = SECT_TECHNIQUES.find(t => t.id === techniqueId);
            if (!technique) throw new Error("TECHNIQUE_NOT_FOUND");

            // Check library level
            const libraryLevel = (sect.buildings || []).find(b => b.buildingId === "library")?.level || 0;
            if (technique.requiredLibraryLevel > libraryLevel) {
                throw new Error("LIBRARY_LEVEL_TOO_LOW");
            }

            // Check weekly contribution
            const weekKey = toWeekKeyUTC(new Date());
            const contribution = await SectContribution.findOne({ sect: sectId, user: userId }).session(session);
            const weeklyContribution = contribution?.weekly?.weekKey === weekKey ? contribution.weekly.energy : 0;

            if (weeklyContribution < technique.contributionCost) {
                throw new Error("NOT_ENOUGH_CONTRIBUTION");
            }

            // Check if already learned
            const cultivation = await Cultivation.findOne({ user: userId }).session(session);
            if (!cultivation) throw new Error("NO_CULTIVATION");

            const alreadyLearned = cultivation.sectTechniques?.some(t => t.id === techniqueId);
            if (alreadyLearned) throw new Error("ALREADY_LEARNED");

            // Check slot limit based on library level
            const techniqueSlots = SECT_BUILDINGS.library?.effects?.[libraryLevel]?.techniqueSlots || 0;
            const learnedCount = cultivation.sectTechniques?.length || 0;
            if (techniqueSlots <= 0) throw new Error("NO_TECHNIQUE_SLOTS");
            if (learnedCount >= techniqueSlots) throw new Error("TECHNIQUE_SLOTS_FULL");

            // Deduct contribution and add technique
            contribution.weekly.energy -= technique.contributionCost;
            await contribution.save({ session });

            cultivation.sectTechniques = cultivation.sectTechniques || [];
            cultivation.sectTechniques.push({
                id: technique.id,
                learnedAt: new Date()
            });
            await cultivation.save({ session });

            result = { technique: technique.name, cost: technique.contributionCost };
        });

        // Invalidate cache immediately to update stats/UI
        // Wrapped in try/catch so Redis failures don't break the successful learn response
        try {
            await invalidateCultivationCache(String(req.user.id));
        } catch (cacheErr) {
            console.error(`[invalidateCultivationCache] Failed for user ${req.user.id}:`, cacheErr);
        }

        res.json({ success: true, message: `Đã học thành công ${result.technique}`, data: result });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NOT_MEMBER") return res.status(403).json({ success: false, message: "Bạn không phải thành viên tông môn này" });
        if (msg === "SECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        if (msg === "TECHNIQUE_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy công pháp" });
        if (msg === "LIBRARY_LEVEL_TOO_LOW") return res.status(400).json({ success: false, message: "Tàng Kinh Các chưa đủ cấp" });
        if (msg === "NOT_ENOUGH_CONTRIBUTION") return res.status(400).json({ success: false, message: "Không đủ điểm đóng góp tuần" });
        if (msg === "NO_CULTIVATION") return res.status(400).json({ success: false, message: "Bạn chưa có dữ liệu tu luyện" });
        if (msg === "ALREADY_LEARNED") return res.status(400).json({ success: false, message: "Bạn đã học công pháp này rồi" });
        if (msg === "NO_TECHNIQUE_SLOTS") return res.status(400).json({ success: false, message: "Tàng Kinh Các chưa cung cấp công pháp" });
        if (msg === "TECHNIQUE_SLOTS_FULL") return res.status(400).json({ success: false, message: "Đã đạt giới hạn số công pháp tông môn có thể học" });
        console.error("[ERROR][SECTS] Error learning technique:", e);
        res.status(500).json({ success: false, message: "Lỗi khi học công pháp" });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/sects/:id/library/unlearn/:techniqueId
 * Quên công pháp tông môn (để đổi sang công pháp khác)
 * Hoàn lại 50% contribution cost
 */
router.post("/:id/library/unlearn/:techniqueId", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const techniqueId = req.params.techniqueId;

    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            // Check membership
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true }).session(session);
            if (!member) throw new Error("NOT_MEMBER");

            // Find technique definition
            const technique = SECT_TECHNIQUES.find(t => t.id === techniqueId);
            if (!technique) throw new Error("TECHNIQUE_NOT_FOUND");

            // Check if user has learned this technique
            const cultivation = await Cultivation.findOne({ user: userId }).session(session);
            if (!cultivation) throw new Error("NO_CULTIVATION");

            const learnedIndex = cultivation.sectTechniques?.findIndex(t => t.id === techniqueId);
            if (learnedIndex === undefined || learnedIndex === -1) {
                throw new Error("NOT_LEARNED");
            }

            // Remove the technique
            cultivation.sectTechniques.splice(learnedIndex, 1);
            await cultivation.save({ session });

            // Refund 50% contribution
            const refundAmount = Math.floor(technique.contributionCost * 0.5);
            const weekKey = toWeekKeyUTC(new Date());

            await SectContribution.findOneAndUpdate(
                { sect: sectId, user: userId },
                {
                    $inc: { "weekly.energy": refundAmount },
                    $set: { "weekly.weekKey": weekKey }
                },
                { session, upsert: true }
            );

            result = {
                technique: technique.name,
                refund: refundAmount,
                originalCost: technique.contributionCost
            };
        });

        // Invalidate cache
        try {
            await invalidateCultivationCache(String(req.user.id));
        } catch (cacheErr) {
            console.error(`[invalidateCultivationCache] Failed for user ${req.user.id}:`, cacheErr);
        }

        res.json({
            success: true,
            message: `Đã quên công pháp ${result.technique}. Hoàn lại ${result.refund} điểm đóng góp`,
            data: result
        });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NOT_MEMBER") return res.status(403).json({ success: false, message: "Bạn không phải thành viên tông môn này" });
        if (msg === "TECHNIQUE_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy công pháp" });
        if (msg === "NO_CULTIVATION") return res.status(400).json({ success: false, message: "Bạn chưa có dữ liệu tu luyện" });
        if (msg === "NOT_LEARNED") return res.status(400).json({ success: false, message: "Bạn chưa học công pháp này" });
        console.error("[ERROR][SECTS] Error unlearning technique:", e);
        res.status(500).json({ success: false, message: "Lỗi khi quên công pháp" });
    } finally {
        session.endSession();
    }
});

// ==================== RAID ROUTES ====================

/**
 * POST /api/sects/:id/raid/start
 * Bắt đầu raid tuần
 */
router.post("/:id/raid/start", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const weekKey = toWeekKeyUTC(new Date());

    const session = await mongoose.startSession();
    try {
        let sectOut = null;

        await session.withTransaction(async () => {
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true }).session(session);
            if (!member) throw new Error("NOT_MEMBER");

            const sect = await Sect.findById(sectId).session(session);
            if (!sect || !sect.isActive) throw new Error("SECT_NOT_FOUND");

            // Đã có raid active tuần này? (chưa hoàn thành)
            if (sect.currentRaid && sect.currentRaid.weekKey === weekKey && sect.currentRaid.healthRemaining > 0) {
                throw new Error("RAID_ALREADY_ACTIVE");
            }

            // Đếm số lần đã triệu hồi trong tuần
            let raidCountThisWeek = 1;
            if (sect.currentRaid && sect.currentRaid.weekKey === weekKey) {
                // Cùng tuần, tăng count
                raidCountThisWeek = (sect.currentRaid.raidCountThisWeek || 1) + 1;
            }
            // Nếu tuần mới thì reset về 1

            const raidDef = SECT_RAIDS.weekly_beast;
            const baseHP = raidDef.baseHPByLevel[String(sect.level)] ?? raidDef.baseHPByLevel[1];

            // Scale HP: +25% cho mỗi lần triệu hồi thêm (lần 1: 100%, lần 2: 125%, lần 3: 150%, ...)
            const hpMultiplier = 1 + (raidCountThisWeek - 1) * 0.25;
            const hp = Math.floor(baseHP * hpMultiplier);

            sect.currentRaid = {
                raidId: randomId("raid"),
                weekKey,
                raidCountThisWeek,
                healthMax: hp,
                healthRemaining: hp,
                totalDamage: 0,
                startedAt: new Date(),
                completedAt: null,
            };

            sectOut = await sect.save({ session });
        });

        res.json({ success: true, message: "Thần thú đã xuất hiện!", data: sectOut.currentRaid });
    } catch (e) {
        const msg = String(e?.message || "");
        if (msg === "NOT_MEMBER") return res.status(403).json({ success: false, message: "Bạn không phải thành viên" });
        if (msg === "SECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        if (msg === "RAID_ALREADY_ACTIVE") return res.status(400).json({ success: false, message: "Thần thú đã xuất hiện tuần này rồi" });
        console.error("[ERROR][SECTS] Error starting raid:", e);
        return res.status(500).json({ success: false, message: "Lỗi khi triệu hồi thần thú" });
    } finally {
        session.endSession();
    }
});

/**
 * POST /api/sects/:id/raid/attack
 * Tấn công raid với 3 loại skill (basic/artifact/ultimate)
 * Server tính damage, check cooldowns, trả response đầy đủ cho UI
 */
router.post("/:id/raid/attack", authRequired, async (req, res) => {
    const userId = req.user._id;
    const sectId = req.params.id;
    const weekKey = toWeekKeyUTC(new Date());
    const attackType = req.body?.attackType || "basic";

    // Validate attack type
    if (!RAID_ATTACKS[attackType]) {
        return res.status(400).json({ success: false, message: "INVALID_ATTACK_TYPE" });
    }

    const session = await mongoose.startSession();
    try {
        let out = null;
        let cooldownResponse = null;
        let myReward = null; // Track phần thưởng của user hiện tại

        await session.withTransaction(async () => {
            // 1) Check membership
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true }).session(session);
            if (!member) throw new Error("NOT_MEMBER");

            // 2) Load sect and validate raid
            const sect = await Sect.findById(sectId).session(session);
            if (!sect || !sect.isActive) throw new Error("SECT_NOT_FOUND");

            const raid = sect.currentRaid;
            if (!raid || raid.weekKey !== weekKey) throw new Error("NO_ACTIVE_RAID");
            if (raid.completedAt) throw new Error("RAID_COMPLETED");
            if (raid.healthRemaining <= 0) throw new Error("RAID_DEAD");

            // 3) Get or create RaidLog for this user (stores cooldowns)
            let raidLog = await SectRaidLog.findOne({ sect: sectId, weekKey, user: userId }).session(session);
            if (!raidLog) {
                raidLog = new SectRaidLog({ sect: sectId, weekKey, user: userId, damage: 0 });
            }

            // 4) Check cooldown for this attack type
            const cooldownField = `last${attackType.charAt(0).toUpperCase() + attackType.slice(1)}At`;
            const lastAttackAt = raidLog[cooldownField];
            const remaining = getCooldownRemaining(lastAttackAt, attackType);

            if (remaining > 0) {
                // Build all cooldowns for response
                cooldownResponse = {
                    basic: getCooldownRemaining(raidLog.lastBasicAt, "basic"),
                    artifact: getCooldownRemaining(raidLog.lastArtifactAt, "artifact"),
                    ultimate: getCooldownRemaining(raidLog.lastUltimateAt, "ultimate")
                };
                throw new Error("COOLDOWN");
            }

            // 5) Get weekly contribution for bonus damage
            const contribution = await SectContribution.findOne({ sect: sectId, user: userId }).session(session);
            const weeklyEnergy = contribution?.weekly?.energy || 0;

            // 6) Get player's cultivation for combat stats
            const cultivation = await Cultivation.findOne({ user: userId }).session(session);
            const playerStats = cultivation?.calculateCombatStats?.() || { attack: 10, criticalRate: 5, criticalDamage: 150 };

            // 7) Calculate damage server-side using player stats
            const result = calculateRaidDamage(attackType, playerStats, weeklyEnergy);

            // Clamp damage to remaining HP
            const finalDamage = Math.min(result.damage, raid.healthRemaining);

            // 7) Update raid HP
            raid.healthRemaining -= finalDamage;
            raid.totalDamage += finalDamage;

            const raidCompleted = raid.healthRemaining <= 0;
            if (raidCompleted && !raid.completedAt) {
                raid.completedAt = new Date();

                // ===== DISTRIBUTE REWARDS =====
                // Get all participants who dealt damage this week
                const raidDef = SECT_RAIDS.weekly_beast;
                const allLogs = await SectRaidLog.find({ sect: sectId, weekKey }).session(session);
                const totalDamage = allLogs.reduce((sum, log) => sum + (log.damage || 0), 0) + finalDamage;

                if (totalDamage > 0 && raidDef?.rewards) {
                    for (const log of allLogs) {
                        if (!log.damage || log.damage <= 0) continue;

                        // Include current attack damage for the attacking user
                        const userTotalDamage = log.user.toString() === userId.toString()
                            ? (log.damage + finalDamage)
                            : log.damage;

                        const damageRatio = userTotalDamage / totalDamage;
                        const expReward = Math.floor(raidDef.rewards.exp * damageRatio);
                        const stoneReward = Math.floor(raidDef.rewards.spiritStones * damageRatio);

                        // Update user's cultivation
                        if (expReward > 0 || stoneReward > 0) {
                            await Cultivation.findOneAndUpdate(
                                { user: log.user },
                                {
                                    $inc: {
                                        exp: expReward,
                                        spiritStones: stoneReward,
                                        totalSpiritStonesEarned: stoneReward
                                    }
                                },
                                { session }
                            );
                        }

                        // Mark reward in log
                        log.rewardClaimed = true;
                        log.expRewarded = expReward;
                        log.stonesRewarded = stoneReward;
                        await log.save({ session });

                        // Lưu reward của user hiện tại để trả về
                        if (log.user.toString() === userId.toString()) {
                            myReward = { exp: expReward, spiritStones: stoneReward };
                        }
                    }

                    // Add sect energy reward (use correct fields)
                    if (raidDef.rewards.sectEnergy) {
                        const gain = raidDef.rewards.sectEnergy;
                        sect.spiritEnergy = (sect.spiritEnergy || 0) + gain;
                        sect.totalEnergyEarned = (sect.totalEnergyEarned || 0) + gain;
                    }
                }
            }

            await sect.save({ session });

            // 8) Update RaidLog (damage + cooldown)
            raidLog.damage += finalDamage;
            raidLog[cooldownField] = new Date();
            await raidLog.save({ session });

            // 9) Build response
            out = {
                damage: finalDamage,
                isCrit: result.isCrit,
                label: result.label,
                flavorEffect: result.flavorEffect,
                hpRemaining: raid.healthRemaining,
                hpMax: raid.healthMax || raid.healthRemaining + raid.totalDamage,
                raidCompleted,
                myReward: raidCompleted ? myReward : null, // Phần thưởng của user này
                cooldowns: {
                    basic: attackType === "basic" ? RAID_ATTACKS.basic.cooldownMs : getCooldownRemaining(raidLog.lastBasicAt, "basic"),
                    artifact: attackType === "artifact" ? RAID_ATTACKS.artifact.cooldownMs : getCooldownRemaining(raidLog.lastArtifactAt, "artifact"),
                    ultimate: attackType === "ultimate" ? RAID_ATTACKS.ultimate.cooldownMs : getCooldownRemaining(raidLog.lastUltimateAt, "ultimate")
                },
                log: {
                    attacker: req.user.name || req.user.username || "Tu Sĩ",
                    damage: finalDamage,
                    isCrit: result.isCrit,
                    label: result.label,
                    flavorEffect: result.flavorEffect,
                    timestamp: new Date().toISOString()
                }
            };
        });

        // Grant contribution for participation (outside raid transaction to avoid nested sessions)
        try {
            const contribResult = await applySectContribution({ userId, sectId, type: "raid_participation" });
            if (contribResult?.applied) {
                out = { ...out, contributionDelta: contribResult.delta };
            }
        } catch (_) {
            // ignore contribution errors
        }

        res.json({ success: true, message: "Tấn công thành công", data: out });
    } catch (e) {
        const msg = String(e?.message || "");

        if (msg === "NOT_MEMBER") return res.status(403).json({ success: false, message: "Bạn không phải thành viên" });
        if (msg === "SECT_NOT_FOUND") return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        if (msg === "NO_ACTIVE_RAID") return res.status(400).json({ success: false, message: "Chưa có thần thú xuất hiện tuần này" });
        if (msg === "RAID_COMPLETED") return res.status(400).json({ success: false, message: "Thần thú đã bị tiêu diệt tuần này" });
        if (msg === "RAID_DEAD") return res.status(400).json({ success: false, message: "Thần thú đã bị tiêu diệt" });
        if (msg === "COOLDOWN") {
            return res.status(429).json({
                success: false,
                message: "Kỹ năng đang hồi chiêu",
                cooldowns: cooldownResponse
            });
        }
        console.error("[ERROR][SECTS] Error attacking raid:", e);
        return res.status(500).json({ success: false, message: "Lỗi khi tấn công" });
    } finally {
        session.endSession();
    }
});

/**
 * GET /api/sects/:id/raid
 * Thông tin raid hiện tại
 */
router.get("/:id/raid", authOptional, async (req, res) => {
    try {
        const sectId = req.params.id;
        const weekKey = toWeekKeyUTC(new Date());

        const sect = await Sect.findById(sectId).select("currentRaid level");
        if (!sect) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tông môn" });
        }

        // Lấy top damage
        const topDamage = await SectRaidLog.find({ sect: sectId, weekKey })
            .sort({ damage: -1 })
            .limit(10)
            .populate("user", "name avatarUrl");

        res.json({
            success: true,
            data: {
                raid: sect.currentRaid,
                weekKey,
                topDamage
            }
        });
    } catch (error) {
        console.error("[ERROR][SECTS] Error fetching raid:", error);
        res.status(500).json({ success: false, message: "Lỗi khi tải thông tin raid" });
    }
});

export default router;
