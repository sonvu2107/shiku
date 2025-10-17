import VerifiedBadge from "./VerifiedBadge";

/**
 * UserName - Component hiển thị tên user với verified badge
 * Hiển thị tên user cùng với badge role nếu có
 * @param {Object} user - Thông tin user
 * @param {string} user.name - Tên hiển thị
 * @param {string} user.nickname - Biệt danh của user
 * @param {string} user.role - Role của user (admin, sololeveling, etc.)
 * @param {boolean} user.isVerified - User có được verify không
 * @param {string} className - Additional CSS classes
 */
export default function UserName({ user, className = "", maxLength = 50, showTooltip = true, isMobile = false }) {
	// Không hiển thị gì nếu không có user
	if (!user) return null;
	
	// Ưu tiên hiển thị nickname nếu có, nếu không thì hiển thị tên
	const displayName = user.nickname && user.nickname.trim() 
		? user.nickname.trim()
		: (user.name || 'Người dùng');
	
	// Truncate tên user nếu quá dài
	const truncatedName = displayName.length > maxLength 
		? displayName.substring(0, maxLength) + '...'
		: displayName;
	
	return (
		<span 
			className={`inline-flex items-center gap-1 ${className}`}
			title={showTooltip && displayName.length > maxLength ? displayName : undefined}
		>
			{/* Tên user hoặc nickname */}
			<span className="whitespace-nowrap">{truncatedName}</span>
			
			{/* Hiển thị tên thật trong ngoặc đơn nếu có nickname */}
			{user.nickname && user.nickname.trim() && user.name && (
				<span className="text-gray-500 text-sm font-normal">
					({user.name})
				</span>
			)}
			
			{/* Verified badge nếu có role */}
			{user.role && (
				<VerifiedBadge 
					role={typeof user.role === 'string' ? user.role : user.role.name} 
					isVerified={user.isVerified}
					roleData={typeof user.role === 'object' ? user.role : null}
				/>
			)}
		</span>
	);
}
