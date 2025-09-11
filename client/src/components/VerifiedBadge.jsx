const roleIcons = {
  sololeveling: "/assets/Sung-tick.png",
  sybau: "/assets/Sybau-tick.png",
  moxumxue: "/assets/moxumxue.png",
  admin: "/assets/admin.jpg",
};

export default function VerifiedBadge({ role, isVerified }) {
  const icon = roleIcons[role] || (isVerified ? roleIcons.verified : null);
  if (!icon) return null;

  return (
    <div className="relative group inline-block">
      <img src={icon} alt="Verified" className="w-4 h-4 rounded-full align-middle" />
      {/* Tooltip khi hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                      hidden group-hover:block bg-black text-white text-xs
                      px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                              Đẹp trai mới sở hữu huy hiệu này.
      </div>
    </div>
  );
}
