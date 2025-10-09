import React, { useState, useEffect } from "react";
import { loadRoles } from "../utils/roleCache";

/**
 * Mapping các role với icon tương ứng (fallback cho role cũ)
 * Mỗi role có một huy hiệu riêng
 */
const defaultRoleIcons = {
  sololeveling: "/assets/Sung-tick.png",  // Huy hiệu Solo Leveling
  sybau: "/assets/Sybau-tick.png",        // Huy hiệu Sybau
  moxumxue: "/assets/moxumxue.png",       // Huy hiệu Moxumxue
  admin: "/assets/admin.jpg",             // Huy hiệu Admin
  gay: "/assets/gay.png",                 // Huy hiệu Gay
  special: "/assets/special-user.jpg",    // Huy hiệu Special
};

/**
 * Mapping các role với tooltip tương ứng (fallback cho role cũ)
 * Mỗi role có một tooltip riêng biệt
 */
const defaultRoleTooltips = {
  sololeveling: "Solo Leveling",
  sybau: "Ahh Sybau",
  moxumxue: "Fan anh Ộ I I",
  admin: "Admin",
  gay: "Thành viên cộng đồng LGBTQ+",
  special: "Người dùng đặc biệt",
};

/**
 * VerifiedBadge - Component hiển thị huy hiệu verify/role (HYBRID VERSION)
 * Hiển thị icon tương ứng với role và tooltip khi hover
 * Hỗ trợ cả role cũ (hardcoded) và role mới (dynamic từ database)
 * BACKWARD COMPATIBLE: Hoạt động với và không có availableRoles props
 * @param {string} role - Role của user (admin, sololeveling, sybau, moxumxue)
 * @param {boolean} isVerified - User có được verify không (hiện tại chưa dùng)
 * @param {Object} roleData - Thông tin role từ database (optional)
 * @param {Array} availableRoles - Danh sách roles từ parent (tối ưu performance cho admin)
 */
export default function VerifiedBadge({ role, isVerified, roleData, availableRoles = [] }) {
  const [dynamicRoles, setDynamicRoles] = useState({});
  const [loading, setLoading] = useState(false);

  // Load dynamic roles từ cache/API khi không có availableRoles props
  const loadDynamicRoles = async () => {
    // Skip nếu đã có availableRoles từ props (admin dashboard)
    if (availableRoles.length > 0) return;
    
    // Skip loading nếu roleData đã được truyền vào và có iconUrl
    if (roleData && roleData.iconUrl) return;

    try {
      setLoading(true);
      // Sử dụng roleCache utility để load roles
      const rolesMap = await loadRoles();
      setDynamicRoles(rolesMap);
    } catch (error) {
      // Fallback về default roles nếu không load được
    } finally {
      setLoading(false);
    }
  };

  // Load roles khi component mount (chỉ khi không có availableRoles)
  useEffect(() => {
    if (availableRoles.length === 0) {
      loadDynamicRoles();
    }
  }, [availableRoles.length, roleData]); // Reload khi availableRoles hoặc roleData thay đổi

  // Không hiển thị gì nếu không có role
  if (!role) return null;

  // Lấy thông tin role với priority order:
  // 1. roleData props (nếu có)
  // 2. availableRoles props (từ admin dashboard)
  // 3. dynamicRoles (load từ cache/API)
  // 4. defaultRoles (fallback)
  let icon, tooltip, color;
  
  if (roleData && roleData.iconUrl) {
    // Sử dụng roleData nếu được truyền vào và có iconUrl
    icon = roleData.iconUrl;
    tooltip = roleData.displayName;
    color = roleData.color;
  } else if (availableRoles.length > 0) {
    // Tìm role trong availableRoles từ parent (admin dashboard)
    const foundRole = availableRoles.find(r => r.name === role);
    if (foundRole && foundRole.iconUrl) {
      icon = foundRole.iconUrl;
      tooltip = foundRole.displayName;
      color = foundRole.color;
    }
  } else if (dynamicRoles[role]) {
    // Sử dụng dynamic roles từ cache/API (profile, posts, etc.)
    icon = dynamicRoles[role].iconUrl;
    tooltip = dynamicRoles[role].displayName;
    color = dynamicRoles[role].color;
  }
  
  // Fallback về default roles nếu không tìm thấy
  if (!icon) {
    icon = defaultRoleIcons[role];
    tooltip = defaultRoleTooltips[role];
    color = "#3B82F6"; // Default color
  }
  
  // Không hiển thị gì nếu không có icon
  if (!icon) return null;

  return (
    <div className="relative group inline-block">
      {/* Icon huy hiệu */}
      <img 
        src={icon} 
        alt="Verified" 
        className="w-5 h-5 rounded-full align-middle flex-shrink-0 object-cover border-2 border-gray-300" 
        loading="lazy"
      />
      {/* Tooltip hiển thị khi hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                      hidden group-hover:block bg-black text-white text-xs
                      px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
        {tooltip}
      </div>
    </div>
  );
}
