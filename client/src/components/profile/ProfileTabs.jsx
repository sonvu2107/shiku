import { FileText, Users, BarChart3, Info } from "lucide-react";
import { cn } from "../../utils/cn";
import { PROFILE_TABS } from "../../constants/profile";

const iconMap = {
  FileText,
  Info,
  Users,
  BarChart3,
};

// Short labels for mobile
const mobileLabels = {
  posts: "Bài viết",
  info: "Thông tin",
  friends: "Bạn bè",
  analytics: "Phân tích",
};

/**
 * ProfileTabs - Component tabs navigation
 * Mobile optimized with compact design
 */
export default function ProfileTabs({ activeTab, onTabChange }) {
  return (
    <div className="sticky top-20 z-30 mb-6 md:mb-8">
      {/* Responsive tabs container */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full p-1 md:p-1.5 flex shadow-sm border border-neutral-200 dark:border-neutral-800 max-w-full md:max-w-2xl mx-auto">
        {PROFILE_TABS.map((tab) => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 md:py-2.5 px-2 sm:px-3 md:px-4 rounded-full text-[11px] sm:text-xs md:text-sm font-bold transition-all duration-300 min-h-[40px] md:min-h-[44px] touch-manipulation",
                isActive
                  ? "text-white bg-neutral-900 dark:bg-white dark:text-black shadow-md"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20"
              )}
            >
              <Icon size={14} className="flex-shrink-0" strokeWidth={2.5} />
              {/* Show short label on mobile, full label on larger screens */}
              <span className="sm:hidden whitespace-nowrap">{mobileLabels[tab.id]}</span>
              <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
