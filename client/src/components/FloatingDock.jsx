import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Compass, 
  PlusSquare, 
  UserCheck, 
  Image, 
  Bookmark, 
  Calendar 
} from "lucide-react";
import { cn } from "../utils/cn";

// Configure list items
const dockItems = [
  { icon: Home, label: "Trang chủ", href: "/" },
  { icon: Compass, label: "Khám phá", href: "/explore" },
  { icon: UserCheck, label: "Nhóm", href: "/groups" },
  { icon: PlusSquare, label: "Đăng bài", href: "/new", isPrimary: true }, 
  { icon: Calendar, label: "Sự kiện", href: "/events" },
  { icon: Image, label: "Media", href: "/media" },
  { icon: Bookmark, label: "Bài đã lưu", href: "/saved" },
];

export default function FloatingDock() {
  let mouseX = useMotionValue(Infinity);
  const [isModalOpen, setIsModalOpen] = useState(false);

      // Check if PostCreator or ProfileCustomization modal is open
  useEffect(() => {
    const checkModal = () => {
      // Check if any modal element is currently displayed
      const modal = document.querySelector('[data-post-creator-modal]') || 
                    document.querySelector('[data-profile-customization-modal]') ||
                    document.querySelector('.fixed.inset-0.z-\\[110\\]') ||
                    document.querySelector('.fixed.inset-0.z-\\[50\\]');
      setIsModalOpen(!!modal);
    };

    // Initial check
    checkModal();

    // Listen for click events to check when modal opens/closes
    const interval = setInterval(checkModal, 100);

    // Listen for mutation observer to detect when modal is added/removed
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  // Hide Dock when modal is open
  if (isModalOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] hidden md:flex pointer-events-none mb-6" style={{ willChange: 'transform' }}>
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="mx-auto flex h-16 gap-4 items-end rounded-2xl bg-white/80 dark:bg-[#111]/90 border border-white/30 dark:border-white/20 px-4 pb-3 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl pointer-events-auto transition-colors duration-300"
      >
        {dockItems.map((item) => (
          <DockIcon key={item.label} mouseX={mouseX} item={item} />
        ))}
      </motion.div>
    </div>
  );
}

function DockIcon({ mouseX, item }) {
  const ref = useRef(null);
  const location = useLocation();
  const isActive = location.pathname === item.href || 
                   (item.href === "/" && location.pathname === "/home") ||
                   (item.href === "/" && location.pathname === "/feed");

  // Calculate distance from mouse to icon
  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Transform icon width based on distance (Magnify effect)
  let widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  // Handle click for "Đăng bài" button - open modal instead of navigate
  const handleClick = (e) => {
    if (item.isPrimary) {
      e.preventDefault();
      // Find PostCreator ref from Home page or trigger hidden button
      const triggerBtn = document.querySelector('[data-post-creator-trigger]');
      if (triggerBtn) {
        triggerBtn.click();
      } else {
        // Fallback: navigate to /new if trigger not found
        window.location.href = '/new';
      }
    }
  };

  const iconContent = (
    <motion.div
      ref={ref}
      style={{ width }}
      className="aspect-square flex flex-col items-center justify-center gap-1 group relative"
    >
        <motion.div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-2xl transition-colors duration-200",
            isActive 
              ? "bg-black text-white dark:bg-neutral-700 dark:text-white" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100",
            item.isPrimary && "bg-black text-white dark:bg-neutral-700 dark:text-white shadow-lg shadow-black/30 dark:shadow-neutral-900/30"
          )}
        >
          <item.icon className={cn(
            "h-5 w-5 md:h-6 md:w-6",
            isActive && "dark:text-white",
            !isActive && !item.isPrimary && "dark:text-gray-300 dark:group-hover:text-gray-100"
          )} strokeWidth={item.isPrimary ? 2.5 : 2} />
        </motion.div>
        
        {/* Tooltip (only visible on hover) */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-xs rounded-md whitespace-nowrap pointer-events-none z-50 shadow-lg dark:shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          {item.label}
        </div>
        
        {/* Active dot */}
        {isActive && !item.isPrimary && (
          <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-black dark:bg-white" />
        )}
      </motion.div>
  );

  // If it's the "Đăng bài" button, use button instead of Link
  if (item.isPrimary) {
    return (
      <button 
        onClick={handleClick} 
        className="outline-none border-none bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-2xl"
        aria-label={item.label}
        aria-pressed={isActive}
      >
        {iconContent}
      </button>
    );
  }

  // Other icons use Link as usual
  return (
    <Link 
      to={item.href}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-2xl"
    >
      {iconContent}
    </Link>
  );
}

