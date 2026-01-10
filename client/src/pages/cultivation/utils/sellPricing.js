import { SHOP_ITEM_DATA } from './constants.js';

const EQUIPMENT_SELL_MIN = 0.5;
const EQUIPMENT_SELL_MAX = 0.7;
const NON_EQUIPMENT_SELL_RATE = 0.5;
const FALLBACK_STACKABLE_PRICE = 10;
const PRICE_MULTIPLIER = 5;
const PERCENT_WEIGHT = 300;
const HP_DIVISOR = 5;
const SPEED_WEIGHT = 2;
const PENETRATION_WEIGHT = 2;
const TRUE_DAMAGE_WEIGHT = 2;
const SKILL_BONUS_WEIGHT = 5;
const ENERGY_REGEN_WEIGHT = 5;
const BUFF_DURATION_WEIGHT = 0.5;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizePercent = (value) => {
  const num = toNumber(value);
  if (num <= 0) return 0;
  if (num <= 1) return num;
  return num / 100;
};

const sumElementalDamage = (elementalDamage) => {
  if (!elementalDamage) return 0;
  if (elementalDamage instanceof Map) {
    let total = 0;
    elementalDamage.forEach((val) => {
      total += toNumber(val);
    });
    return total;
  }
  if (typeof elementalDamage === 'object') {
    return Object.values(elementalDamage).reduce((sum, val) => sum + toNumber(val), 0);
  }
  return 0;
};

const getEquipmentStats = (item) => {
  const statsSource = item?.metadata?.stats || item?.stats || item?.metadata || {};

  return {
    attack: toNumber(statsSource.attack),
    defense: toNumber(statsSource.defense),
    hp: toNumber(statsSource.hp || statsSource.qiBlood),
    speed: toNumber(statsSource.speed),
    penetration: toNumber(statsSource.penetration),
    critRate: normalizePercent(statsSource.crit_rate ?? statsSource.criticalRate ?? statsSource.critRate),
    critDamage: normalizePercent(statsSource.crit_damage ?? statsSource.criticalDamage ?? statsSource.critDamage),
    evasion: normalizePercent(statsSource.evasion ?? statsSource.dodge),
    hitRate: normalizePercent(statsSource.hit_rate ?? statsSource.accuracy ?? statsSource.hitRate),
    lifesteal: normalizePercent(statsSource.lifesteal),
    skillBonus: toNumber(item?.metadata?.skill_bonus ?? statsSource.skill_bonus ?? item?.skill_bonus),
    energyRegen: toNumber(item?.metadata?.energy_regen ?? statsSource.energy_regen ?? item?.energy_regen),
    trueDamage: toNumber(item?.metadata?.true_damage ?? statsSource.true_damage ?? item?.true_damage),
    buffDuration: toNumber(item?.metadata?.buff_duration ?? statsSource.buff_duration ?? item?.buff_duration),
    elementalDamage: sumElementalDamage(statsSource.elemental_damage)
  };
};

const getEquipmentSellRatio = (item) => {
  const durability = item?.metadata?.durability;
  if (durability && Number.isFinite(durability.current) && Number.isFinite(durability.max) && durability.max > 0) {
    const ratio = Math.max(0, Math.min(1, durability.current / durability.max));
    return EQUIPMENT_SELL_MIN + (EQUIPMENT_SELL_MAX - EQUIPMENT_SELL_MIN) * ratio;
  }
  return EQUIPMENT_SELL_MAX;
};

const calculateEquipmentBasePrice = (item) => {
  const stats = getEquipmentStats(item);
  const flatScore = stats.attack
    + stats.defense
    + (stats.hp / HP_DIVISOR)
    + (stats.speed * SPEED_WEIGHT)
    + (stats.penetration * PENETRATION_WEIGHT)
    + (stats.trueDamage * TRUE_DAMAGE_WEIGHT)
    + (stats.skillBonus * SKILL_BONUS_WEIGHT)
    + (stats.energyRegen * ENERGY_REGEN_WEIGHT)
    + (stats.buffDuration * BUFF_DURATION_WEIGHT);
  const percentScore = (stats.critRate + stats.critDamage + stats.evasion + stats.hitRate + stats.lifesteal) * PERCENT_WEIGHT;
  const totalScore = flatScore + percentScore + stats.elementalDamage;
  const basePrice = Math.floor(totalScore * PRICE_MULTIPLIER);

  if (basePrice > 0) return basePrice;

  const fallbackPrice = toNumber(item?.metadata?.price || item?.price);
  return fallbackPrice > 0 ? fallbackPrice : 0;
};

const getNonEquipmentBasePrice = (item) => {
  const shopItem = SHOP_ITEM_DATA[item?.itemId];
  return toNumber(item?.metadata?.price || shopItem?.price || item?.price);
};

export const getSellPrice = (item) => {
  if (!item) return 0;

  if (item.type?.startsWith('equipment_')) {
    const basePrice = calculateEquipmentBasePrice(item);
    if (basePrice <= 0) return 0;
    return Math.floor(basePrice * getEquipmentSellRatio(item));
  }

  const basePrice = getNonEquipmentBasePrice(item);
  if (basePrice > 0) return Math.floor(basePrice * NON_EQUIPMENT_SELL_RATE);

  if (['exp_boost', 'breakthrough_boost', 'consumable', 'material'].includes(item.type)) {
    return FALLBACK_STACKABLE_PRICE;
  }

  return 0;
};
