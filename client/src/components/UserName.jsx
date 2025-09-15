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
export default function UserName({ user, className = "" }) {
	// Không hiển thị gì nếu không có user
	if (!user) return null;
	
	return (
		<span className={`inline-flex items-center gap-1 ${className}`}>
			{/* Tên user */}
			{user.name}
			
			{/* Verified badge nếu có role */}
			{user.role && (
				<VerifiedBadge role={user.role} isVerified={user.isVerified} />
			)}
		</span>
	);
}
