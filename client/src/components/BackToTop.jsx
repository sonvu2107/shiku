import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * BackToTop - Component tái sử dụng để cuộn lên đầu trang
 * Hiển thị nút khi scroll > 400px
 * Ẩn ở trang Home (/)
 */
function BackToTop() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();

  // Hide on Home page
  const isHomePage = location.pathname === "/" || location.pathname === "/home";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Thử nhiều cách để đảm bảo hoạt động trên mọi trình duyệt
    if (window.scrollTo) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }

    // Fallback cho các trình duyệt cũ
    if (document.documentElement) {
      document.documentElement.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }

    if (document.body) {
      document.body.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
  };

  // Don't render on Home page
  if (isHomePage) return null;

  return (
    <AnimatePresence>
      {showScrollTop && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="hidden md:block fixed bottom-4 right-4 z-[9999] p-3 bg-black dark:bg-neutral-700 text-white dark:text-white rounded-full shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          aria-label="Cuộn lên đầu trang"
        >
          <ArrowUp size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default BackToTop;
