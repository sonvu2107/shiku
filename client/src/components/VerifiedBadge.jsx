import React, { useState, useEffect } from "react";
import { loadRoles, getCachedRole, invalidateRoleCache } from "../utils/roleCache";

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
 * VerifiedBadge - Component hiển thị huy hiệu verify/role
 * Hiển thị icon tương ứng với role và tooltip khi hover
 * Hỗ trợ cả role cũ (hardcoded) và role mới (dynamic từ database)
 * @param {string} role - Role của user (admin, sololeveling, sybau, moxumxue)
 * @param {boolean} isVerified - User có được verify không (hiện tại chưa dùng)
 * @param {Object} roleData - Thông tin role từ database (optional)
 */
export default function VerifiedBadge({ role, isVerified, roleData, refreshTrigger = 0 }) {
  const [dynamicRoles, setDynamicRoles] = useState({});
  const [loading, setLoading] = useState(false);

  // Load dynamic roles từ global cache
  const loadDynamicRoles = async () => {
    // Skip loading nếu roleData đã được truyền vào (tối ưu performance)
    if (roleData && roleData.iconUrl) {
      return;
    }

    try {
      setLoading(true);
      // Sử dụng global cache thay vì fetch trực tiếp
      const rolesMap = await loadRoles();
      setDynamicRoles(rolesMap);
    } catch (error) {
      console.error("Error loading dynamic roles:", error);
      // Fallback về default roles nếu không load được
    } finally {
      setLoading(false);
    }
  };

  // Load roles khi component mount hoặc refreshTrigger thay đổi
  useEffect(() => {
    loadDynamicRoles();
  }, [refreshTrigger, roleData]); // Reload khi refreshTrigger hoặc roleData thay đổi

  // Lắng nghe custom event để reload roles khi có thay đổi
  useEffect(() => {
    const handleRoleUpdate = () => {
      // Invalidate cache và reload
      invalidateRoleCache();
      loadDynamicRoles();
    };

    window.addEventListener('roleUpdated', handleRoleUpdate);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('roleUpdated', handleRoleUpdate);
    };
  }, []); // Chỉ chạy một lần để đăng ký listener

  // Không hiển thị gì nếu không có role
  if (!role) return null;

  // Lấy thông tin role (ưu tiên roleData prop, sau đó dynamic roles, cuối cùng là default)
  let icon, tooltip, color;
  
  if (roleData && roleData.iconUrl) {
    // Sử dụng roleData nếu được truyền vào và có iconUrl
    icon = roleData.iconUrl;
    tooltip = roleData.displayName;
    color = roleData.color;
  } else if (dynamicRoles[role]) {
    // Sử dụng dynamic roles từ database
    icon = dynamicRoles[role].iconUrl;
    tooltip = dynamicRoles[role].displayName;
    color = dynamicRoles[role].color;
  } else {
    // Fallback về default roles
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
