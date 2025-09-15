/**
 * Mapping các role với icon tương ứng
 * Mỗi role có một huy hiệu riêng
 */
const roleIcons = {
  sololeveling: "/assets/Sung-tick.png",  // Huy hiệu Solo Leveling
  sybau: "/assets/Sybau-tick.png",        // Huy hiệu Sybau
  moxumxue: "/assets/moxumxue.png",       // Huy hiệu Moxumxue
  admin: "/assets/admin.jpg",             // Huy hiệu Admin
};

/**
 * VerifiedBadge - Component hiển thị huy hiệu verify/role
 * Hiển thị icon tương ứng với role và tooltip khi hover
 * @param {string} role - Role của user (admin, sololeveling, sybau, moxumxue)
 * @param {boolean} isVerified - User có được verify không (hiện tại chưa dùng)
 */
export default function VerifiedBadge({ role, isVerified }) {
  // Lấy icon dựa trên role, fallback về verified icon nếu cần
  const icon = roleIcons[role] || (isVerified ? roleIcons.verified : null);
  
  // Không hiển thị gì nếu không có icon
  if (!icon) return null;

  return (
    <div className="relative group inline-block">
      {/* Icon huy hiệu */}
      <img 
        src={icon} 
        alt="Verified" 
        className="w-4 h-4 rounded-full align-middle" 
      />
      
      {/* Tooltip hiển thị khi hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                      hidden group-hover:block bg-black text-white text-xs
                      px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
        Đẹp trai mới sở hữu huy hiệu này.
      </div>
    </div>
  );
}
