import VerifiedBadge from "./VerifiedBadge";
import { Sparkles } from "lucide-react";

/**
 * UserName - Component that renders a user's display name with an optional verified badge
 * Shows the nickname (preferred) or the display name, and a role badge when available
 * @param {Object} user - User object
 * @param {string} user.name - The user's display name
 * @param {string} user.nickname - The user's nickname (optional)
 * @param {string|Object} user.role - User role key or role object (e.g., 'admin', 'sololeveling')
 * @param {boolean} user.isVerified - Whether the user is verified
 * @param {string} user.displayBadgeType - Type of badge to display: 'role' or 'cultivation'
 * @param {Object} user.cultivation - User's cultivation data (for cultivation badge)
 * @param {Object} user.cultivationCache - Cached cultivation data (for cultivation badge when full cultivation not available)
 * @param {string} className - Additional CSS classes to apply
 */
export default function UserName({ user, className = "", maxLength = 50, showTooltip = true, isMobile = false }) {
	// Return nothing if `user` is not provided
	if (!user) return null;
	
	// Prefer nickname when available; otherwise use the display name
	const displayName = user.nickname && user.nickname.trim() 
		? user.nickname.trim()
		: (user.name || 'Người dùng');
	
	// Truncate the display name if it exceeds `maxLength`
	const truncatedName = displayName.length > maxLength 
		? displayName.substring(0, maxLength) + '...'
		: displayName;

	// Determine which badge type to show
	const badgeType = user.displayBadgeType || 'role';
	
	// Get cultivation data from cultivationCache
	const cultivationData = user.cultivationCache;
	
	return (
		<span 
			className={`inline-flex items-center gap-1 ${className}`}
			title={showTooltip && displayName.length > maxLength ? displayName : undefined}
		>
			{/* Display name or nickname */}
			<span className="whitespace-nowrap">{truncatedName}</span>
			
			{/* Show real name in parentheses when a nickname exists */}
			{user.nickname && user.nickname.trim() && user.name && (
				<span className="text-gray-500 text-sm font-normal">
					({user.name})
				</span>
			)}
			
			{/* Render badge based on displayBadgeType */}
			{badgeType === 'cultivation' && cultivationData?.realmName ? (
				<span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded text-[10px] font-bold text-amber-600 dark:text-amber-400">
					<Sparkles size={10} />
					{cultivationData.realmName}
					{cultivationData.realmLevel > 1 && ` T${cultivationData.realmLevel}`}
				</span>
			) : (
				/* Default: Show role badge when a role is present */
				user.role && (
					<VerifiedBadge 
						role={typeof user.role === 'string' ? user.role : user.role.name} 
						isVerified={user.isVerified}
						roleData={typeof user.role === 'object' ? user.role : null}
					/>
				)
			)}
		</span>
	);
}
