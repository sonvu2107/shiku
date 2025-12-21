import CultivationBadge from "./CultivationBadge";
import VerifiedBadge from "./VerifiedBadge";
import { TITLES } from "./UserAvatar";
import { sanitizeUsername } from "../utils/xssSanitizer";

/**
 * UserName - Component that renders a user's display name with badges
 * Shows the nickname (preferred) or the display name
 * Always shows VerifiedBadge (role tick) for system roles unless showBadges=false
 * Shows realm and/or title based on displayBadgeType setting
 * @param {Object} user - User object
 * @param {string} user.name - The user's display name
 * @param {string} user.nickname - The user's nickname (optional)
 * @param {string|Object} user.role - User role for VerifiedBadge
 * @param {string} user.displayBadgeType - Type of cultivation badge: 'realm', 'title', 'both', or 'none'
 * @param {Object} user.cultivationCache - Cached cultivation data (realmName, equipped.title)
 * @param {string} className - Additional CSS classes to apply
 * @param {boolean} showBadges - Whether to show any badges (default: true)
 */
export default function UserName({ user, className = "", maxLength = 50, showTooltip = true, isMobile = false, showBadges = true }) {
	// Return nothing if `user` is not provided
	if (!user) return null;

	// Prefer nickname when available; otherwise use the display name
	// Sanitize to prevent XSS
	const rawName = user.nickname && user.nickname.trim()
		? user.nickname.trim()
		: (user.name || 'Người dùng');
	const displayName = sanitizeUsername(rawName);

	// Truncate the display name if it exceeds `maxLength`
	const truncatedName = displayName.length > maxLength
		? displayName.substring(0, maxLength) + '...'
		: displayName;

	// If badges are disabled, just show the name
	if (!showBadges) {
		return (
			<span
				className={`inline-flex items-center gap-1 max-w-full overflow-hidden ${className}`}
				title={showTooltip && displayName.length > maxLength ? displayName : undefined}
			>
				<span className="truncate">{truncatedName}</span>
				{user.nickname && user.nickname.trim() && user.name && (
					<span className="text-gray-500 text-sm font-normal truncate max-w-[80px] flex-shrink-0" title={user.name}>
						({user.name.length > 12 ? user.name.substring(0, 12) + '...' : user.name})
					</span>
				)}
			</span>
		);
	}

	// Determine which cultivation badge type to show (realm, title, both, none)
	// Handle legacy values: "role" -> show nothing (only VerifiedBadge), "cultivation" -> "realm"
	let badgeType = user.displayBadgeType || 'none';
	if (badgeType === 'role') {
		badgeType = 'none'; // Legacy: only show VerifiedBadge
	} else if (badgeType === 'cultivation') {
		badgeType = 'realm'; // Legacy: show realm
	}

	// Get cultivation data from cultivationCache
	const cultivationData = user.cultivationCache;

	// Check if should show realm badge (Cảnh giới: Luyện Khí, Kim Đan...)
	const showRealm = (badgeType === 'realm' || badgeType === 'both') && cultivationData?.realmName;

	// Check if should show title badge (Danh hiệu: Kiếm Khách, Tiên Nhân...)
	const equippedTitle = cultivationData?.equipped?.title;
	const titleConfig = equippedTitle ? TITLES[equippedTitle] : null;
	const showTitle = (badgeType === 'title' || badgeType === 'both') && titleConfig;

	// Only show VerifiedBadge when user chose 'none' (no cultivation badges)
	const showVerifiedBadge = badgeType === 'none';

	// Check if we have any badges to show (for conditional wrapping)
	const hasBadges = showVerifiedBadge || showRealm || showTitle;

	return (
		<span
			className={`inline-flex items-center gap-1 max-w-full overflow-hidden ${hasBadges ? 'flex-wrap sm:flex-nowrap' : ''} ${className}`}
			title={showTooltip && displayName.length > maxLength ? displayName : undefined}
		>
			{/* Display name or nickname */}
			<span className="truncate">{truncatedName}</span>

			{/* Show real name in parentheses when a nickname exists */}
			{user.nickname && user.nickname.trim() && user.name && (
				<span className="text-gray-500 text-sm font-normal truncate max-w-[80px] flex-shrink-0" title={user.name}>
					({user.name.length > 12 ? user.name.substring(0, 12) + '...' : user.name})
				</span>
			)}

			{/* VerifiedBadge - Chỉ hiển thị khi user chọn 'none' (không hiển thị cảnh giới/danh hiệu) */}
			{showVerifiedBadge && user.role && (
				<VerifiedBadge
					role={typeof user.role === 'string' ? user.role : user.role.name}
					isVerified={user.isVerified}
					roleData={typeof user.role === 'object' ? user.role : null}
				/>
			)}

			{/* Realm badge - Cảnh giới tu tiên */}
			{showRealm && (
				<CultivationBadge
					cultivation={cultivationData}
					size="sm"
					variant="gradient"
				/>
			)}

			{/* Title badge - Danh hiệu tu tiên */}
			{showTitle && (
				<span
					className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
					style={{
						background: `linear-gradient(135deg, ${titleConfig.color}20, ${titleConfig.color}40)`,
						color: titleConfig.color,
						border: `1px solid ${titleConfig.color}50`
					}}
					title={titleConfig.name}
				>
					<span>{titleConfig.name}</span>
				</span>
			)}
		</span>
	);
}
