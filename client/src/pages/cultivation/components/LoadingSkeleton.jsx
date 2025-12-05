/**
 * Loading Skeleton for Cultivation Page - Tiên Hiệp Style
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CULTIVATION_QUOTES = [
  "Tu luyện đạo tâm, khắc chế dục vọng...",
  "Luyện khí hóa thần, đột phá cảnh giới...",
  "Ngưng tụ chân nguyên, thăng hoa bản thân...",
  "Đạo pháp tự nhiên, vạn vật quy nhất...",
  "Tinh khí thần hợp nhất, đạt đến đại đạo...",
  "Luyện tâm luyện tính, siêu việt phàm trần...",
  "Thiên địa linh khí, quy về một mạch...",
  "Đạo tâm kiên định, bất động như sơn..."
];

const CultivationLoading = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Cố định delay 5 giây
    const delay = 5000;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        setTimeout(() => onComplete(), 300); // Wait for fade out
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Loading Spinner - Yellow Effect */}
      <div className="relative">
        {/* Outer Glow Ring */}
        <motion.div
          className="absolute inset-0 border-4 border-amber-400/30 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Main Spinner */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
          <div className="absolute inset-0 border-4 border-amber-400/20 rounded-full"></div>
          <motion.div
            className="absolute inset-0 border-4 border-transparent border-t-amber-400 border-r-amber-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Inner Glow */}
        <motion.div
          className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </motion.div>
  );
};

const LoadingSkeleton = ({ showCultivationLoading = true }) => {
  const [showCultivation, setShowCultivation] = useState(showCultivationLoading);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const handleCultivationComplete = () => {
    setShowCultivation(false);
    setShowSkeleton(true);
  };

  if (showCultivation) {
    return (
      <>
        <CultivationLoading onComplete={handleCultivationComplete} />
        {showSkeleton && (
          <div className="space-y-4 animate-pulse p-6">
            <div className="h-48 bg-slate-800/50 rounded-xl"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-slate-800/50 rounded-lg"></div>
              <div className="h-20 bg-slate-800/50 rounded-lg"></div>
            </div>
            <div className="h-32 bg-slate-800/50 rounded-xl"></div>
          </div>
        )}
      </>
    );
  }

  return (
  <div className="space-y-4 animate-pulse p-6">
    <div className="h-48 bg-slate-800/50 rounded-xl"></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-20 bg-slate-800/50 rounded-lg"></div>
      <div className="h-20 bg-slate-800/50 rounded-lg"></div>
    </div>
    <div className="h-32 bg-slate-800/50 rounded-xl"></div>
  </div>
);
};

export default LoadingSkeleton;
