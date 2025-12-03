/**
 * Icon helper functions for cultivation items
 */
import {
  Sword, Shield, Zap, Flame, Droplet, Wind, Snowflake, Mountain, Flower2, Coins,
  Sun, Moon, Sparkles, Cloud, Tornado, Ghost, Crown, Skull,
  CircleDot, Gem, Scroll, Package, Key, Bird, Cat, Rabbit, PawPrint,
  Medal, FlaskConical, Wand2, Ticket
} from 'lucide-react';

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

export const SHOP_ICON_MAP = {
  // Titles & badges
  title: TitleImage,
  badge: BadgeImage,
  avatar_frame: AvatarFrameImage,
  profile_effect: ProfileEffectImage,
  exp_boost: ExpBoostImage,
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
  title: { label: ' Danh Hiệu', color: 'text-amber-300' },
  badge: { label: ' Huy Hiệu', color: 'text-cyan-300' },
  avatar_frame: { label: ' Khung Avatar', color: 'text-purple-300' },
  profile_effect: { label: ' Hiệu Ứng', color: 'text-pink-300' },
  exp_boost: { label: ' Đan Dược', color: 'text-emerald-300' },
  consumable: { label: ' Vật Phẩm', color: 'text-blue-300' },
  pet: { label: ' Linh Thú', color: 'text-orange-300' },
  mount: { label: ' Tọa Kỵ', color: 'text-indigo-300' },
  technique: { label: ' Công Pháp', color: 'text-yellow-300' }
};

export const getItemIcon = (item) => {
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
  if (name.includes('kiếm')) return Sword;
  if (name.includes('đao')) return Sword;
  if (name.includes('giáp') || name.includes('áo')) return Shield;
  if (name.includes('hộ mệnh')) return Shield;

  // Elements
  if (name.includes('lôi') || name.includes('sấm') || name.includes('điện')) return Zap;
  if (name.includes('hỏa') || name.includes('lửa') || name.includes('viêm') || name.includes('nhiệt')) return Flame;
  if (name.includes('thủy') || name.includes('nước') || name.includes('băng') || name.includes('tuyết')) return Snowflake;
  if (name.includes('phong') || name.includes('gió')) return Wind;
  if (name.includes('thổ') || name.includes('đất') || name.includes('địa')) return Mountain;
  if (name.includes('mộc') || name.includes('cây') || name.includes('hoa') || name.includes('liên')) return Flower2;
  if (name.includes('kim') || name.includes('vàng')) return Coins;

  // Celestial / Mystical
  if (name.includes('nhật') || name.includes('dương') || name.includes('mặt trời')) return Sun;
  if (name.includes('nguyệt') || name.includes('trăng') || name.includes('âm')) return Moon;
  if (name.includes('tinh') || name.includes('sao')) return Sparkles;
  if (name.includes('thiên') || name.includes('trời') || name.includes('vân') || name.includes('mây')) return Cloud;
  if (name.includes('hư không') || name.includes('không gian')) return Tornado;
  if (name.includes('hỗn độn')) return Ghost;
  if (name.includes('tiên') || name.includes('thần')) return Crown;
  if (name.includes('ma') || name.includes('quỷ') || name.includes('diệt')) return Skull;

  // Items
  if (name.includes('thư') || name.includes('bí kíp') || name.includes('quyển') || name.includes('pháp')) return TechniqueImage;
  if (name.includes('lệnh') || name.includes('bài')) return Ticket;
  if (name.includes('nhẫn')) return CircleDot;
  if (name.includes('ngọc') || name.includes('đá')) return Gem;
  if (name.includes('bùa') || name.includes('phù')) return Scroll;
  if (name.includes('hương')) return Flame;
  if (name.includes('túi')) return Package;
  if (name.includes('chìa')) return Key;

  // Creatures
  if (name.includes('long') || name.includes('rồng')) return Flame; // Dragon fallback
  if (name.includes('phượng') || name.includes('chim') || name.includes('hạc') || name.includes('điểu')) return Bird;
  if (name.includes('hổ') || name.includes('mèo') || name.includes('miêu')) return Cat;
  if (name.includes('thố') || name.includes('thỏ')) return Rabbit;
  if (name.includes('hồ') || name.includes('cáo')) return PawPrint;
  if (name.includes('quy') || name.includes('rùa')) return Shield;

  // Roles
  if (name.includes('sư') || name.includes('giả') || name.includes('khách')) return Medal;
  if (name.includes('luyện đan')) return FlaskConical;
  if (name.includes('ẩn sĩ')) return Mountain;
  if (name.includes('hiền giả')) return Wand2;

  // Final fallback
  return Package;
};

