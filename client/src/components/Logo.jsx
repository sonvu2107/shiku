import { FileText } from "lucide-react";

export default function Logo({ size = "small", showText = false }) {
  const logoSizes = {
    small: "h-10",     
    medium: "h-16",  
    large: "h-20"      
  };

  const textSizes = {
    small: "text-xl",
    medium: "text-3xl",
    large: "text-5xl"
  };

  return (
    <div className="flex items-center gap-3">
      <img 
        src="/assets/shiku-logo.svg" 
        alt="Shiku Logo" 
        className={`${logoSizes[size]} w-auto`}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div style={{display: 'none'}} className="flex items-center gap-3">
        <FileText size={size === 'large' ? 48 : size === 'medium' ? 36 : 24} className="text-gray-800" />
        {showText && <span className={`font-bold text-gray-800 ${textSizes[size]}`}>Shiku</span>}
      </div>
    </div>
  );
}
