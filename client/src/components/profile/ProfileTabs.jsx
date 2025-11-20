import { FileText, Users, BarChart3 } from "lucide-react";
import { cn } from "../../utils/cn";
import { PROFILE_TABS } from "../../constants/profile";

const iconMap = {
  FileText,
  Users,
  BarChart3,
};

/**
 * ProfileTabs - Component tabs navigation
 * Mobile optimized with horizontal scroll
 */
export default function ProfileTabs({ activeTab, onTabChange }) {
  return (
    <div className="sticky top-20 z-30 mb-6 md:mb-8">
      {/* Mobile: Scrollable tabs with gradient indicators */}
      <div className="relative">
        {/* Gradient indicators for mobile scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none md:hidden"></div>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none md:hidden"></div>
        
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full p-1 md:p-1.5 flex shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-hide max-w-full md:max-w-2xl mx-auto justify-center md:justify-between">
          {PROFILE_TABS.map((tab) => {
            const Icon = iconMap[tab.icon];
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex-1 md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 px-3 md:px-4 rounded-full text-xs md:text-sm font-bold transition-all duration-300 min-h-[44px] touch-manipulation min-w-0",
                  activeTab === tab.id
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20"
                )}
              >
                <Icon size={14} className="md:w-4 md:h-4 flex-shrink-0" strokeWidth={2.5} />
                <span className="whitespace-nowrap truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

