import React, { useState, useEffect, useRef, memo } from "react";
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
 * Default colors for legacy roles (fallback)
 */
const defaultRoleColors = {
  sololeveling: "#8B5CF6",
  sybau: "#EC4899",
  moxumxue: "#EF4444",
  admin: "#F59E0B",
  gay: "#EC4899",
  special: "#10B981",
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
 * @param {string} variant - Display variant: 'icon' (chỉ icon) | 'text' (chỉ text) | 'both' (cả hai) | 'minimal' (text đơn giản)
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 */
function VerifiedBadge({
  role,
  isVerified,
  roleData,
  availableRoles = [],
  variant = "icon",
  size = "md"
}) {
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
    color = defaultRoleColors[role] || "#3B82F6"; // Default color
  }

  // Return null if there is still no icon/tooltip available for non-icon variants
  if (!icon && variant === 'icon') return null;
  if (!tooltip && variant !== 'icon') return null;

  // Size classes
  const sizeConfig = {
    sm: {
      icon: "w-4 h-4",
      text: "text-[10px]",
      padding: "px-1.5 py-0.5",
      gap: "gap-1"
    },
    md: {
      icon: "w-5 h-5",
      text: "text-xs",
      padding: "px-2 py-0.5",
      gap: "gap-1.5"
    },
    lg: {
      icon: "w-6 h-6",
      text: "text-sm",
      padding: "px-2.5 py-1",
      gap: "gap-2"
    }
  };

  const sizeClass = sizeConfig[size] || sizeConfig.md;

  // Render badge content based on variant
  const renderBadgeContent = () => {
    switch (variant) {
      case 'text':
        // Chỉ text với background màu
        return (
          <span
            className={`inline-flex items-center rounded-full ${sizeClass.text} ${sizeClass.padding} font-semibold tracking-wide`}
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}40`
            }}
          >
            {tooltip}
          </span>
        );

      case 'minimal':
        // Chỉ text, không background
        return (
          <span
            className={`inline-flex items-center ${sizeClass.text} font-semibold tracking-wide`}
            style={{ color: color }}
          >
            {tooltip}
          </span>
        );

      case 'both':
        // Icon + text
        return (
          <span
            className={`inline-flex items-center ${sizeClass.gap} rounded-full ${sizeClass.text} ${sizeClass.padding} font-semibold`}
            style={{
              backgroundColor: `${color}15`,
              color: color,
              border: `1px solid ${color}30`
            }}
          >
            {icon && (
              <img
                src={icon}
                alt=""
                className={`${sizeClass.icon} rounded-full object-cover`}
                loading="lazy"
              />
            )}
            <span>{tooltip}</span>
          </span>
        );

      case 'icon':
      default:
        // Chỉ icon (mặc định)
        // Wrap trong container với background sáng ở dark mode để icon đen không bị chìm
        return (
          <span className="inline-flex items-center justify-center rounded-full dark:bg-white/90 dark:p-0.5">
            <img
              src={icon}
              alt="Verified"
              className={`${sizeClass.icon} rounded-full align-middle flex-shrink-0 object-cover border-2 border-gray-300 dark:border-transparent`}
              loading="lazy"
            />
          </span>
        );
    }
  };

  return (
    <>
      <div
        ref={badgeRef}
        className="relative inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderBadgeContent()}
      </div>

      {/* Tooltip rendered via portal - only show for icon/both variants */}
      {showTooltip && tooltip && (variant === 'icon' || variant === 'both') && createPortal(
        <div
          className="fixed bg-neutral-900/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-[9999] backdrop-blur-sm border border-neutral-700/50"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <span style={{ color: color }} className="font-semibold">{tooltip}</span>
        </div>,
        document.body
      )}
    </>
  );
}

export default memo(VerifiedBadge);
