// services/sectContributionService.js
import mongoose from "mongoose";
import Sect from "../models/Sect.js";
import SectMember from "../models/SectMember.js";
import SectContribution from "../models/SectContribution.js";
import SectDailyStat from "../models/SectDailyStat.js";
import { toDateKeyUTC, toWeekKeyUTC } from "./sectTime.js";
import { CONTRIBUTION_RATES, CONTRIBUTION_CAPS, SECT_BUILDINGS, SECT_LEVELS } from "../data/sectBuildings.js";

/**
 * Minimal hash function cho anti-spam
 */
function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return String(h);
}

/**
 * Tính multiplier cho comment dựa trên số comment đã thực hiện
 * Diminishing returns: 1-3: 100%, 4-10: 40%, >10: 0%
 */
function getCommentMultiplier(commentCountAfterIncrement) {
    if (commentCountAfterIncrement <= 3) return 1.0;
    if (commentCountAfterIncrement <= 10) return 0.4;
    return 0.0;
}

/**
 * Apply sect contribution với transaction, valid checks, diminishing returns, caps
 * 
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.sectId - Sect ID
 * @param {string} params.type - Loại contribution: post, comment, upvote_received, daily_checkin, raid_participation
 * @param {Object} params.meta - Metadata (content cho comment, fromUserId cho upvote)
 * @returns {Promise<Object>} Result object với applied, delta, reason
 */
export async function applySectContribution({
    userId,
    sectId,
    type,
    meta = {},
}) {
    if (!CONTRIBUTION_RATES[type] && type !== 'daily_checkin' && type !== 'raid_participation') {
        return { applied: false, delta: 0, reason: "UNKNOWN_TYPE" };
    }

    const session = await mongoose.startSession();
    try {
        let result = null;

        // Helper: cập nhật cấp độ Tông Môn theo tổng năng lượng tích lũy
        function updateSectLevelIfNeeded(sectDoc) {
            try {
                const total = Number(sectDoc.totalEnergyEarned || 0);
                // Tìm cấp cao nhất có requiredEnergy <= total
                let targetLevel = 1;
                for (const lvl of SECT_LEVELS) {
                    if (total >= lvl.requiredEnergy) targetLevel = Math.max(targetLevel, lvl.level);
                }
                if ((sectDoc.level || 1) < targetLevel) {
                    sectDoc.level = targetLevel;
                }
            } catch (_) {
                // noop
            }
        }

        await session.withTransaction(async () => {
            // 1) Verify active sect
            const sect = await Sect.findOne({ _id: sectId, isActive: true }).session(session);
            if (!sect) throw new Error("SECT_NOT_FOUND");

            // 2) Verify membership
            const member = await SectMember.findOne({ sect: sectId, user: userId, isActive: true })
                .session(session);
            if (!member) throw new Error("NOT_MEMBER");

            const now = new Date();
            const dateKey = toDateKeyUTC(now);
            const weekKey = toWeekKeyUTC(now);

            // 3) Upsert contribution + weekly rollover
            const contrib = await SectContribution.findOneAndUpdate(
                { sect: sectId, user: userId },
                {
                    $setOnInsert: { sect: sectId, user: userId, totalEnergy: 0, weekly: { weekKey, energy: 0 } },
                },
                { upsert: true, new: true, session }
            );

            // Weekly rollover check
            if (contrib.weekly?.weekKey !== weekKey) {
                contrib.weekly.weekKey = weekKey;
                contrib.weekly.energy = 0;
                await contrib.save({ session });
            }

            // 4) Upsert daily stat
            const daily = await SectDailyStat.findOneAndUpdate(
                { sect: sectId, user: userId, dateKey },
                {
                    $setOnInsert: {
                        sect: sectId,
                        user: userId,
                        dateKey,
                        posts: 0,
                        comments: 0,
                        upvotesReceived: 0,
                        checkinDone: false
                    }
                },
                { upsert: true, new: true, session }
            );

            // 5) Compute delta with rules
            let delta = 0;

            // ========== COMMENT ==========
            if (type === "comment") {
                const content = String(meta.content || "").trim().replace(/\s+/g, " ");

                // Valid check: minimum length
                if (content.length < 20) {
                    result = { applied: false, delta: 0, reason: "COMMENT_TOO_SHORT" };
                    return;
                }

                // Anti-spam: same hash within 2 minutes => reject
                const hash = simpleHash(content);
                const nowMs = now.getTime();
                const lastAt = daily.lastCommentAt ? daily.lastCommentAt.getTime() : 0;
                if (daily.lastCommentHash === hash && (nowMs - lastAt) < 2 * 60 * 1000) {
                    result = { applied: false, delta: 0, reason: "DUPLICATE_COMMENT" };
                    return;
                }

                // Cap check
                if (daily.comments >= CONTRIBUTION_CAPS.comment) {
                    result = { applied: false, delta: 0, reason: "DAILY_CAP_COMMENT" };
                    return;
                }

                // Diminishing returns
                const commentCountAfter = daily.comments + 1;
                const mult = getCommentMultiplier(commentCountAfter);
                delta = Math.floor(CONTRIBUTION_RATES.comment * mult);

                if (delta <= 0) {
                    result = { applied: false, delta: 0, reason: "DIMINISHED_TO_ZERO" };
                    return;
                }

                // Apply
                daily.comments += 1;
                daily.lastCommentHash = hash;
                daily.lastCommentAt = now;

                contrib.totalEnergy += delta;
                contrib.weekly.energy += delta;

                sect.spiritEnergy += delta;
                sect.totalEnergyEarned += delta;

                updateSectLevelIfNeeded(sect);
                await Promise.all([
                    daily.save({ session }),
                    contrib.save({ session }),
                    sect.save({ session })
                ]);
                result = { applied: true, delta, reason: "OK", dateKey, weekKey };
                return;
            }

            // ========== POST ==========
            if (type === "post") {
                if (daily.posts >= CONTRIBUTION_CAPS.post) {
                    result = { applied: false, delta: 0, reason: "DAILY_CAP_POST" };
                    return;
                }
                delta = CONTRIBUTION_RATES.post;

                daily.posts += 1;
                contrib.totalEnergy += delta;
                contrib.weekly.energy += delta;

                sect.spiritEnergy += delta;
                sect.totalEnergyEarned += delta;

                updateSectLevelIfNeeded(sect);
                await Promise.all([
                    daily.save({ session }),
                    contrib.save({ session }),
                    sect.save({ session })
                ]);
                result = { applied: true, delta, reason: "OK", dateKey, weekKey };
                return;
            }

            // ========== UPVOTE RECEIVED ==========
            if (type === "upvote_received") {
                // Cap check
                if (daily.upvotesReceived >= CONTRIBUTION_CAPS.upvote_received) {
                    result = { applied: false, delta: 0, reason: "DAILY_CAP_UPVOTE_RECEIVED" };
                    return;
                }

                // Self upvote protection
                if (meta.fromUserId && String(meta.fromUserId) === String(userId)) {
                    result = { applied: false, delta: 0, reason: "SELF_UPVOTE_RECEIVED" };
                    return;
                }

                delta = CONTRIBUTION_RATES.upvote_received;

                daily.upvotesReceived += 1;
                contrib.totalEnergy += delta;
                contrib.weekly.energy += delta;

                sect.spiritEnergy += delta;
                sect.totalEnergyEarned += delta;

                updateSectLevelIfNeeded(sect);
                await Promise.all([
                    daily.save({ session }),
                    contrib.save({ session }),
                    sect.save({ session })
                ]);
                result = { applied: true, delta, reason: "OK", dateKey, weekKey };
                return;
            }

            // ========== DAILY CHECKIN ==========
            if (type === "daily_checkin") {
                if (daily.checkinDone === true) {
                    result = { applied: false, delta: 0, reason: "Hôm nay bạn đã điểm danh rồi" };
                    return;
                }

                // Tính delta cơ bản
                let baseDelta = CONTRIBUTION_RATES.daily_checkin;

                // Cộng thêm bonus từ Linh Điền (spirit_field)
                let buildingBonus = 0;
                const spiritFieldLevel = (sect.buildings || []).find(b => b.buildingId === 'spirit_field')?.level || 0;
                if (spiritFieldLevel > 0) {
                    const spiritFieldDef = SECT_BUILDINGS.spirit_field;
                    buildingBonus = spiritFieldDef?.effects?.[spiritFieldLevel]?.dailyBonusEnergy || 0;
                }

                delta = baseDelta + buildingBonus;
                daily.checkinDone = true;

                contrib.totalEnergy += delta;
                contrib.weekly.energy += delta;

                sect.spiritEnergy += delta;
                sect.totalEnergyEarned += delta;

                updateSectLevelIfNeeded(sect);
                await Promise.all([
                    daily.save({ session }),
                    contrib.save({ session }),
                    sect.save({ session })
                ]);
                result = {
                    applied: true,
                    delta,
                    baseDelta,
                    buildingBonus,
                    reason: "OK",
                    dateKey,
                    weekKey
                };
                return;
            }

            // ========== RAID PARTICIPATION ==========
            if (type === "raid_participation") {
                delta = CONTRIBUTION_RATES.raid_participation;

                contrib.totalEnergy += delta;
                contrib.weekly.energy += delta;

                sect.spiritEnergy += delta;
                sect.totalEnergyEarned += delta;

                updateSectLevelIfNeeded(sect);
                await Promise.all([
                    contrib.save({ session }),
                    sect.save({ session })
                ]);
                result = { applied: true, delta, reason: "OK", dateKey, weekKey };
                return;
            }

            result = { applied: false, delta: 0, reason: "UNHANDLED_TYPE" };
        });

        return result ?? { applied: false, delta: 0, reason: "NO_RESULT" };
    } finally {
        session.endSession();
    }
}

/**
 * Lấy sect của user hiện tại (nếu có)
 */
export async function getUserSect(userId) {
    const member = await SectMember.findOne({ user: userId, isActive: true })
        .populate('sect');
    return member?.sect || null;
}
