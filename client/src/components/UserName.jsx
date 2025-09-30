import VerifiedBadge from "./VerifiedBadge";

/**
 * UserName - Component hiển thị tên user với verified badge
 * Hiển thị tên user cùng với badge role nếu có
 * @param {Object} user - Thông tin user
 * @param {string} user.name - Tên hiển thị
 * @param {string} user.role - Role của user (admin, sololeveling, etc.)
 * @param {boolean} user.isVerified - User có được verify không
 * @param {string} className - Additional CSS classes
 */
export default function UserName({ user, className = "", maxLength = 50, showTooltip = true, isMobile = false }) {
	// Không hiển thị gì nếu không có user
	if (!user) return null;
	
	// Truncate tên user nếu quá dài
	const displayName = user.name && user.name.length > maxLength 
		? user.name.substring(0, maxLength) + '...'
		: (user.name || 'Người dùng');
	
	return (
		<span 
			className={`inline-flex items-center gap-1 ${className}`}
			title={showTooltip && user.name && user.name.length > maxLength ? user.name : undefined}
		>
			{/* Tên user */}
			<span className="whitespace-nowrap">{displayName}</span>
			
			{/* Verified badge nếu có role */}
			{user.role && (
				<VerifiedBadge role={user.role} isVerified={user.isVerified} />
			)}
		</span>
	);
}
