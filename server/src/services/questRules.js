import { QUEST_TEMPLATES } from "../models/Cultivation.js";

/**
 * Build runtime mapping from templates
 */
function addTemplates(map, templates, arrayField) {
    for (const t of templates) {
        if (!t?.requirement?.action || !t?.requirement?.count) continue;
        const action = t.requirement.action;
        const list = map.get(action) || [];
        list.push({ arrayField, questId: t.id, required: t.requirement.count });
        map.set(action, list);
    }
}

/**
 * Map: action -> [{ arrayField, questId, required }]
 * O(1) lookup for quest updates by action
 */
export const QUEST_RULES_BY_ACTION = (() => {
    const m = new Map();
    addTemplates(m, QUEST_TEMPLATES.daily, "dailyQuests");
    addTemplates(m, QUEST_TEMPLATES.weekly, "weeklyQuests");
    addTemplates(m, QUEST_TEMPLATES.achievement, "achievements");
    return m;
})();

/**
 * Map: questId -> { arrayField, tpl }
 * O(1) lookup for quest claim/rewards
 */
export const QUEST_META_BY_ID = (() => {
    const m = new Map();
    for (const t of QUEST_TEMPLATES.daily) m.set(t.id, { arrayField: "dailyQuests", tpl: t });
    for (const t of QUEST_TEMPLATES.weekly) m.set(t.id, { arrayField: "weeklyQuests", tpl: t });
    for (const t of QUEST_TEMPLATES.achievement) m.set(t.id, { arrayField: "achievements", tpl: t });
    return m;
})();
