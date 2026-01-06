/**
 * Icon helper functions for cultivation items
 */
import {
  GiBroadsword, GiShield, GiLightningFrequency, GiFlame, GiWaterDrop, GiWhirlwind, GiSnowflake2,
  GiMountainCave, GiLotusFlower, GiTwoCoins, GiSunRadiations, GiMoon, GiSparkles, GiCloudRing,
  GiTornado, GiGhost, GiCrown, GiSkullCrossedBones, GiRing, GiGems, GiScrollUnfurled,
  GiSwapBag, GiKey, GiFlyingDagger, GiCat, GiRabbit, GiPawPrint, GiMedal, GiPotionBall,
  GiWizardStaff, GiTicket,
  // Equipment icons
  GiSwordWound, GiCrossedSwords, GiSpearHook, GiBowArrow, GiHandheldFan, GiFlute, GiQuillInk,
  GiAbdominalArmor, GiHelmet, GiChestArmor, GiShoulderArmor, GiGloves, GiBoots, GiBelt,
  GiNecklace, GiEarrings, GiDiamondRing, GiCrystalBall, GiMagicLamp, GiCrystalGrowth
} from 'react-icons/gi';

import {
  TechniqueImage,
  TitleImage,
  BadgeImage,
  ExpBoostImage,
  ProfileEffectImage,
  AvatarFrameImage,
  PetImage,
  MountImage,
  ConsumableImage
} from '../components/ImageComponents.jsx';

import { TECHNIQUE_ICON_MAP } from './constants.js';

// Icon map cho các loại equipment theo type và subtype
export const EQUIPMENT_ICON_MAP = {
  // Main types
  equipment_weapon: GiBroadsword,
  equipment_armor: GiAbdominalArmor,
  equipment_accessory: GiRing,
  equipment_magic_treasure: GiCrystalBall,
  equipment_power_item: GiCrystalGrowth,
  
  // Weapon subtypes
  sword: GiSwordWound,
  saber: GiBroadsword,
  spear: GiSpearHook,
  bow: GiBowArrow,
  fan: GiHandheldFan,
  flute: GiFlute,
  brush: GiQuillInk,
  dual_sword: GiCrossedSwords,
  flying_sword: GiFlyingDagger,
  
  // Armor subtypes
  helmet: GiHelmet,
  chest: GiChestArmor,
  shoulder: GiShoulderArmor,
  gloves: GiGloves,
  boots: GiBoots,
  belt: GiBelt,
  
  // Accessory subtypes
  ring: GiDiamondRing,
  necklace: GiNecklace,
  earring: GiEarrings,
  bracelet: GiRing,
  
  // Power Item subtypes
  spirit_stone: GiGems,
  spirit_pearl: GiCrystalBall,
  spirit_seal: GiMagicLamp
};

export const SHOP_ICON_MAP = {
  // Titles & badges
  title: TitleImage,
  badge: BadgeImage,
  avatar_frame: AvatarFrameImage,
  profile_effect: ProfileEffectImage,
  exp_boost: ExpBoostImage,
  breakthrough_boost: ExpBoostImage, // Sử dụng cùng icon với đan dược
  consumable: ConsumableImage,
  pet: PetImage,
  mount: MountImage,
  technique: TechniqueImage
};

// Danh sách các component ảnh để kiểm tra
export const IMAGE_COMPONENTS = [
  TechniqueImage,
  TitleImage,
  BadgeImage,
  ExpBoostImage,
  ProfileEffectImage,
  AvatarFrameImage,
  PetImage,
  MountImage,
  ConsumableImage
];

export const ITEM_TYPE_LABELS = {
  title: { label: 'Danh Hiệu', color: 'text-amber-300' },
  badge: { label: 'Huy Hiệu', color: 'text-cyan-300' },
  avatar_frame: { label: 'Khung Avatar', color: 'text-purple-300' },
  profile_effect: { label: 'Hiệu Ứng', color: 'text-pink-300' },
  exp_boost: { label: 'Đan Dược', color: 'text-emerald-300' },
  breakthrough_boost: { label: 'Độ Kiếp Đan', color: 'text-amber-400' },
  consumable: { label: 'Vật Phẩm', color: 'text-blue-300' },
  pet: { label: 'Linh Thú', color: 'text-orange-300' },
  mount: { label: 'Tọa Kỵ', color: 'text-indigo-300' },
  technique: { label: 'Công Pháp', color: 'text-yellow-300' },
  // Equipment types
  equipment_weapon: { label: 'Vũ Khí', color: 'text-red-300' },
  equipment_armor: { label: 'Giáp', color: 'text-blue-300' },
  equipment_accessory: { label: 'Trang Sức', color: 'text-yellow-300' },
  equipment_magic_treasure: { label: 'Pháp Bảo', color: 'text-purple-300' },
  equipment_power_item: { label: 'Linh Khí', color: 'text-cyan-300' }
};

export const getItemIcon = (item) => {
  // Kiểm tra equipment trước - ưu tiên subtype để có icon chính xác nhất
  if (item.type?.startsWith('equipment_')) {
    const subtype = item.subtype || item.metadata?.subtype;
    if (subtype && EQUIPMENT_ICON_MAP[subtype]) {
      return EQUIPMENT_ICON_MAP[subtype];
    }
    // Fallback về equipment type
    if (EQUIPMENT_ICON_MAP[item.type]) {
      return EQUIPMENT_ICON_MAP[item.type];
    }
  }

  // Ưu tiên: Kiểm tra type trước để đảm bảo tất cả vật phẩm dùng icon ảnh theo danh mục
  if (item.type && SHOP_ICON_MAP[item.type]) {
    return SHOP_ICON_MAP[item.type];
  }

  // Check by specific ID (chỉ cho các item không có type hoặc không match trong SHOP_ICON_MAP)
  if (TECHNIQUE_ICON_MAP[item.itemId || item.id]) {
    return TECHNIQUE_ICON_MAP[item.itemId || item.id];
  }

  // Fallback: Check by name (case insensitive partial match) - chỉ khi không có type
  const name = (item.name || '').toLowerCase();

  // Weapons & Combat
  if (name.includes('kiếm')) return GiBroadsword;
  if (name.includes('đao')) return GiBroadsword;
  if (name.includes('giáp') || name.includes('áo')) return GiShield;
  if (name.includes('hộ mệnh')) return GiShield;

  // Elements
  if (name.includes('lôi') || name.includes('sấm') || name.includes('điện')) return GiLightningFrequency;
  if (name.includes('hỏa') || name.includes('lửa') || name.includes('viêm') || name.includes('nhiệt')) return GiFlame;
  if (name.includes('thủy') || name.includes('nước') || name.includes('băng') || name.includes('tuyết')) return GiSnowflake2;
  if (name.includes('phong') || name.includes('gió')) return GiWhirlwind;
  if (name.includes('thổ') || name.includes('đất') || name.includes('địa')) return GiMountainCave;
  if (name.includes('mộc') || name.includes('cây') || name.includes('hoa') || name.includes('liên')) return GiLotusFlower;
  if (name.includes('kim') || name.includes('vàng')) return GiTwoCoins;

  // Celestial / Mystical
  if (name.includes('nhật') || name.includes('dương') || name.includes('mặt trời')) return GiSunRadiations;
  if (name.includes('nguyệt') || name.includes('trăng') || name.includes('âm')) return GiMoon;
  if (name.includes('tinh') || name.includes('sao')) return GiSparkles;
  if (name.includes('thiên') || name.includes('trời') || name.includes('vân') || name.includes('mây')) return GiCloudRing;
  if (name.includes('hư không') || name.includes('không gian')) return GiTornado;
  if (name.includes('hỗn độn')) return GiGhost;
  if (name.includes('tiên') || name.includes('thần')) return GiCrown;
  if (name.includes('ma') || name.includes('quỷ') || name.includes('diệt')) return GiSkullCrossedBones;

  // Items
  if (name.includes('thư') || name.includes('bí kíp') || name.includes('quyển') || name.includes('pháp')) return TechniqueImage;
  if (name.includes('lệnh') || name.includes('bài')) return GiTicket;
  if (name.includes('nhẫn')) return GiRing;
  if (name.includes('ngọc') || name.includes('đá')) return GiGems;
  if (name.includes('bùa') || name.includes('phù')) return GiScrollUnfurled;
  if (name.includes('hương')) return GiFlame;
  if (name.includes('túi')) return GiSwapBag;
  if (name.includes('chìa')) return GiKey;

  // Creatures
  if (name.includes('long') || name.includes('rồng')) return GiFlame; // Dragon fallback
  if (name.includes('phượng') || name.includes('chim') || name.includes('hạc') || name.includes('điểu')) return GiFlyingDagger;
  if (name.includes('hổ') || name.includes('mèo') || name.includes('miêu')) return GiCat;
  if (name.includes('thố') || name.includes('thỏ')) return GiRabbit;
  if (name.includes('hồ') || name.includes('cáo')) return GiPawPrint;
  if (name.includes('quy') || name.includes('rùa')) return GiShield;

  // Roles
  if (name.includes('sư') || name.includes('giả') || name.includes('khách')) return GiMedal;
  if (name.includes('luyện đan')) return GiPotionBall;
  if (name.includes('ẩn sĩ')) return GiMountainCave;
  if (name.includes('hiền giả')) return GiWizardStaff;

  // Final fallback
  return GiSwapBag;
};

