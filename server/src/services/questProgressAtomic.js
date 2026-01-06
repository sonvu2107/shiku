import Cultivation from "../models/Cultivation.js";
import { QUEST_RULES_BY_ACTION } from "./questRules.js";

/**
 * Atomic quest progress update using arrayFilters
 * Replaces O(n²) updateQuestProgress method
 */
export async function applyQuestProgressAtomic(userId, action, count = 1, now = new Date()) {
    // Ensure quests are reset before applying progress (timezone-aware)
    await Cultivation.ensureDailyReset(userId, now);
    await Cultivation.ensureWeeklyReset(userId, now);

    const rules = QUEST_RULES_BY_ACTION.get(action);
    if (!rules || rules.length === 0) return { updated: 0 };

    // Group by array type
    const byArray = new Map();
    for (const r of rules) {
        const arr = byArray.get(r.arrayField) || [];
        arr.push(r);
        byArray.set(r.arrayField, arr);
    }

    let updated = 0;

    for (const [arrayField, list] of byArray.entries()) {
        const questIds = list.map(x => x.questId);

        // 1) Increment progress for all matching quests not completed
        const r1 = await Cultivation.updateOne(
            { user: userId },
            {
                $inc: { [`${arrayField}.$[q].progress`]: count, dataVersion: 1 },
            },
            { arrayFilters: [{ "q.questId": { $in: questIds }, "q.completed": false }] }
        );

        if (r1.modifiedCount) updated += 1;

        // 2) Auto-complete + clamp progress per questId
        for (const q of list) {
            await Cultivation.updateOne(
                {
                    user: userId,
                    [`${arrayField}.questId`]: q.questId,
                    [`${arrayField}.completed`]: false,
                    [`${arrayField}.progress`]: { $gte: q.required },
                },
                {
                    $set: {
                        [`${arrayField}.$.completed`]: true,
                        [`${arrayField}.$.completedAt`]: now,
                        [`${arrayField}.$.progress`]: q.required, // clamp
                    },
                }
            );
        }
    }

    return { updated };
}

/**
 * Atomic daily/weekly/stats counters update
 */
export async function applyProgressCountersAtomic(userId, action, count = 1) {
    const inc = {};

    switch (action) {
        case "post":
            inc["dailyProgress.posts"] = count;
            inc["weeklyProgress.posts"] = count;
            inc["stats.totalPostsCreated"] = count;
            break;
        case "comment":
            inc["dailyProgress.comments"] = count;
            inc["stats.totalCommentsCreated"] = count;
            break;
        case "like":
            inc["dailyProgress.likes"] = count;
            inc["stats.totalLikesGiven"] = count;
            break;
        case "upvote":
            inc["dailyProgress.upvotes"] = count;
            inc["stats.totalUpvotesGiven"] = count;
            break;
        case "receive_upvote":
            inc["stats.totalUpvotesReceived"] = count;
            break;
        case "friend":
            inc["weeklyProgress.friends"] = count;
            break;
        case "event":
            inc["weeklyProgress.events"] = count;
            break;
        default:
            return;
    }

    await Cultivation.updateOne({ user: userId }, { $inc: { ...inc, dataVersion: 1 } });
}
