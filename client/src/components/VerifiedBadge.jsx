import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { loadRoles } from "../utils/roleCache";

/**
 * Mapping of roles to their corresponding icon files (fallback for legacy roles)
 * Each role has a distinct badge icon used as a fallback when dynamic data isn't available
 */
const defaultRoleIcons = {
  sololeveling: "/assets/Sung-tick.png",  // Solo Leveling badge (fallback)
  sybau: "/assets/Sybau-tick.png",        // Sybau badge (fallback)
  moxumxue: "/assets/moxumxue.png",       // Moxumxue badge (fallback)
  admin: "/assets/admin.jpg",             // Admin badge (fallback)
  gay: "/assets/gay.png",                 // Gay community badge (fallback)
  special: "/assets/special-user.jpg",    // Special user badge (fallback)
};

/**
 * Mapping of default tooltips for legacy roles (fallback)
 * These strings are shown when dynamic role metadata is not available
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
 * VerifiedBadge - Renders a role/verified badge (HYBRID VERSION)
 * Displays an icon for a user's role and a tooltip on hover.
 * Supports legacy hardcoded roles and dynamic roles loaded from the database.
 * Backward compatible: works with or without `availableRoles` prop.
 * @param {string} role - Role key or name (e.g., 'admin', 'sololeveling')
 * @param {boolean} isVerified - Whether the user is verified (currently unused)
 * @param {Object} roleData - Optional role metadata from the database
 * @param {Array} availableRoles - Optional roles list provided by parent (admin dashboard optimization)
 */
export default function VerifiedBadge({ role, isVerified, roleData, availableRoles = [] }) {
  const [dynamicRoles, setDynamicRoles] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const badgeRef = useRef(null);

  // Load dynamic roles from cache/API when `availableRoles` is not provided
  const loadDynamicRoles = async () => {
    // Skip nếu đã có availableRoles từ props (admin dashboard)
    if (availableRoles.length > 0) return;
    
    // Skip loading nếu roleData đã được truyền vào và có iconUrl
    if (roleData && roleData.iconUrl) return;

    try {
      setLoading(true);
      // Use the role cache utility to fetch role metadata
      const rolesMap = await loadRoles();
      setDynamicRoles(rolesMap);
    } catch (error) {
      // Fallback về default roles nếu không load được
    } finally {
      setLoading(false);
    }
  };

  // Load roles on mount (only when `availableRoles` is not provided)
  useEffect(() => {
    if (availableRoles.length === 0) {
      loadDynamicRoles();
    }
  }, [availableRoles.length, roleData]); // Reload khi availableRoles hoặc roleData thay đổi

  // Return null if no role is provided
  if (!role) return null;

  // Handle mouse events to compute tooltip position
  const handleMouseEnter = (e) => {
    if (!badgeRef.current) return;
    
    const rect = badgeRef.current.getBoundingClientRect();
    const tooltipX = rect.left + rect.width / 2;
    const tooltipY = rect.top - 8; // 8px above the badge
    
    setTooltipPosition({ x: tooltipX, y: tooltipY });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Resolve role metadata with the following priority:
  // 1. `roleData` prop (if provided)
  // 2. `availableRoles` prop (provided by parent/admin dashboard)
  // 3. `dynamicRoles` loaded from cache/API
  // 4. `defaultRoleIcons`/`defaultRoleTooltips` (fallback)
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
  
  // Fallback to default role icons/tooltips if none found
  if (!icon) {
    icon = defaultRoleIcons[role];
    tooltip = defaultRoleTooltips[role];
    color = "#3B82F6"; // Default color
  }
  
  // Return null if there is still no icon available
  if (!icon) return null;

  return (
    <>
      <div 
        ref={badgeRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Badge icon */}
        <img 
          src={icon} 
          alt="Verified" 
          className="w-5 h-5 rounded-full align-middle flex-shrink-0 object-cover border-2 border-gray-300" 
          loading="lazy"
        />
      </div>
      
      {/* Tooltip rendered via portal */}
      {showTooltip && tooltip && createPortal(
        <div 
          className="fixed bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-[9999]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip}
        </div>,
        document.body
      )}
    </>
  );
}
