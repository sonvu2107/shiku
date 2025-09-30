import { FileText } from "lucide-react";

/**
 * Logo - Component hiển thị logo của ứng dụng
 * Có fallback icon nếu không load được logo SVG
 * @param {string} size - Kích thước logo ('small', 'medium', 'large')
 * @param {boolean} showText - Hiển thị text "Shiku" bên cạnh logo
 */
export default function Logo({ size = "small", showText = false }) {
  // Mapping sizes cho logo image
  const logoSizes = {
    small: "h-10",     // 40px height
    medium: "h-16",    // 64px height
    large: "h-20"      // 80px height
  };

  // Mapping sizes cho text
  const textSizes = {
    small: "text-xl",
    medium: "text-3xl",
    large: "text-5xl"
  };

  return (
    <div className="flex items-center gap-3">
      {/* Primary logo - SVG file */}
      <img 
        src="/assets/shiku-logo.svg" 
        alt="Shiku Logo" 
        className={`${logoSizes[size]} w-auto invert-0 dark:invert`}
        onError={(e) => {
          // Fallback: ẩn image và hiện icon backup
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      
      {/* Fallback logo - Lucide icon (ẩn mặc định) */}
      <div style={{display: 'none'}} className="flex items-center gap-3">
        <FileText 
          size={size === 'large' ? 48 : size === 'medium' ? 36 : 24} 
          className="text-gray-800 dark:text-gray-100" 
        />
        {showText && (
          <span className={`font-bold text-gray-800 dark:text-gray-100 ${textSizes[size]}`}>
            Shiku
          </span>
        )}
      </div>
    </div>
  );
}
