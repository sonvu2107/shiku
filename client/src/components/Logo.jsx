/**
 * Logo - Component hiển thị logo của ứng dụng
 * @param {string} size - Kích thước logo ('small', 'medium', 'large')
 * @param {boolean} invert - Invert màu logo (dùng cho dark background)
 */
export default function Logo({ size = "small", invert = false }) {
  // Mapping sizes cho logo image
  const logoSizes = {
    small: "h-10",     // 40px height
    medium: "h-16",    // 64px height
    large: "h-20"      // 80px height
  };

  // Width mapping based on height
  const logoWidths = {
    small: 40,   // ~40px width for 40px height
    medium: 64,  // ~64px width for 64px height
    large: 80    // ~80px width for 80px height
  };

  return (
    <div className="flex items-center">
      {/* Primary logo - SVG file with explicit dimensions to prevent CLS */}
      <img 
        src="/assets/shiku-logo.svg" 
        alt="Shiku Logo" 
        width={logoWidths[size]}
        height={size === 'small' ? 40 : size === 'medium' ? 64 : 80}
        className={`${logoSizes[size]} w-auto ${invert ? '' : 'dark:invert'}`}
        loading="eager"
        fetchpriority="high"
      />
    </div>
  );
}
