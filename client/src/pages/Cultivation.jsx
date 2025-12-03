/**
 * Cultivation Page - Main entry point
 * Quản lý tab navigation và state cho dashboard (logs, particles, breakthrough)
 * Tất cả tab components đã được tách ra trong ./cultivation/components/
 */

import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CultivationProvider, useCultivation } from '../hooks/useCultivation.jsx';
import { CULTIVATION_REALMS } from '../services/cultivationAPI.js';
import { api } from '../api';
import {
  CustomStyles,
  LoadingSkeleton,
  IdentityHeader,
  DashboardTab,
  QuestsTab,
  StatsTab,
  ShopTab,
  InventoryTab,
  TechniquesTab,
  PKTab,
  LeaderboardTab
} from './cultivation/components';
import { LOG_MESSAGES } from './cultivation/utils/constants';

const CultivationContent = memo(function CultivationContent() {
  const {
    cultivation,
    checkIn,
    loading,
    addExp,
    collectPassiveExp,
    loadPassiveExpStatus,
    notification,
    clearNotification,
    practiceTechnique,
    attemptBreakthrough
  } = useCultivation();

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState([{ id: 0, text: "-- Bắt đầu bước vào con đường tu tiên --", type: 'normal' }]);
  const [particles, setParticles] = useState([]);
  const [clickCooldown, setClickCooldown] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [passiveExpStatus, setPassiveExpStatus] = useState({ 
    pendingExp: 0, 
    multiplier: 1, 
    minutesElapsed: 0 
  });
  const [collectingPassiveExp, setCollectingPassiveExp] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [isBreakingThrough, setIsBreakingThrough] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const logEndRef = useRef(null);

  const addLog = useCallback((text, type = 'normal') => {
    setLogs(prev => [...prev.slice(-29), { id: Date.now() + Math.random(), text, type }]);
  }, []);

  const spawnParticle = useCallback((x, y, text, color = 'cyan') => {
    const id = Date.now() + Math.random();
    setParticles(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 2000);
  }, []);

  const triggerBreakthroughEffect = useCallback((realmName) => {
    setIsBreakingThrough(true);
    addLog("⚡ BẮT ĐẦU ĐỘ KIẾP!", 'danger');
    addLog("Thiên lôi đang tụ lại...", 'danger');
    setIsShaking(true);

    let count = 0;
    const flashInterval = setInterval(() => {
      setFlashOpacity(Math.random() > 0.5 ? 0.8 : 0);
      count++;
      if (count > 10) {
        clearInterval(flashInterval);
        setFlashOpacity(0);
        setIsShaking(false);
        setIsBreakingThrough(false);
        setModalMsg(`Thiên địa chúc phúc! Đạo hữu đã bước chân vào cảnh giới ${realmName}!`);
        setModalOpen(true);
        addLog(`ĐỘT PHÁ THÀNH CÔNG! Đạt ${realmName}!`, 'success');
      }
    }, 100);
  }, [addLog]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const data = await api('/api/auth/me');
        if (data.user) {
          setIsAdmin(data.user.role === 'admin');
        }
      } catch (e) {
        // Silent fail
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchPassiveStatus = async () => {
      try {
        const status = await loadPassiveExpStatus();
        if (status) {
          setPassiveExpStatus(status);
        }
      } catch (err) {
        // Silent fail
      }
    };

    fetchPassiveStatus();
    const interval = setInterval(fetchPassiveStatus, 30000);
    return () => clearInterval(interval);
  }, [loadPassiveExpStatus]);

  useEffect(() => {
    if (logExpanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [logs, logExpanded]);

  useEffect(() => {
    if (notification) {
      if (notification.breakthroughSuccess) {
        triggerBreakthroughEffect(notification.newRealm?.name || "Cảnh giới mới");
      } else if (notification.breakthroughSuccess === false) {
        addLog(notification.message, 'danger');
        if (notification.cooldownUntil) {
          const cooldownDate = new Date(notification.cooldownUntil);
          const now = new Date();
          const remainingMs = cooldownDate - now;
          const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
          addLog(`Cần chờ ${remainingMinutes} phút nữa mới có thể độ kiếp lại`, 'danger');
        }
      } else if (notification.levelUp) {
        triggerBreakthroughEffect(notification.newRealm?.name || "Cảnh giới mới");
      }
      if (notification.breakthroughSuccess === undefined || notification.breakthroughSuccess === null) {
        addLog(
          notification.message, 
          notification.type === 'success' ? 'success' : notification.type === 'error' ? 'danger' : 'normal'
        );
      }
      clearNotification();
    }
  }, [notification, clearNotification, triggerBreakthroughEffect, addLog]);
  const handleYinYangClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (clickCooldown || checkingIn || isBreakingThrough) return;

    setClickCooldown(true);
    const expGain = Math.floor(Math.random() * 5) + 1;
    const rect = e.currentTarget.getBoundingClientRect();
    spawnParticle(rect.left + rect.width / 2, rect.top, `+${expGain} Tu Vi`, 'cyan');

    if (Math.random() < 0.1) {
      const stoneDrop = Math.floor(Math.random() * 3) + 1;
      setTimeout(() => {
        spawnParticle(rect.left + rect.width / 2, rect.top - 30, `+${stoneDrop} Linh Thạch`, 'gold');
      }, 200);
      addLog(`Nhặt được ${stoneDrop} Linh Thạch!`, 'gain');
    }

    try {
      await addExp(expGain, 'yinyang_click');
      if (Math.random() < 0.2) {
        addLog(LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]);
      }
    } catch (err) {
      if (err.message?.includes('cạn kiệt')) {
        addLog(`Chân nguyên đã cạn kiệt, hãy chờ một lát...`, 'danger');
      } else {
        addLog(` ${err.message}`, 'danger');
      }
    }

    setTimeout(() => setClickCooldown(false), 500);
  };
  const handleCheckIn = async () => {
    if (checkingIn || isBreakingThrough) return;

    setCheckingIn(true);
    addLog('Đang điểm danh tu luyện...');

    try {
      await checkIn();
    } catch (err) {
      addLog(`Điểm danh thất bại: ${err.message}`, 'danger');
    } finally {
      setCheckingIn(false);
    }
  };
  const handleCollectPassiveExp = async () => {
    if (collectingPassiveExp || isBreakingThrough) return;

    setCollectingPassiveExp(true);
    addLog('Đang thu thập tu vi tích lũy...');

    try {
      const result = await collectPassiveExp();

      if (result?.collected) {
        const { expEarned, multiplier, minutesElapsed } = result;
        addLog(
          multiplier > 1
            ? `Thu thập ${expEarned} Tu Vi (x${multiplier} đan dược, ${minutesElapsed} phút)`
            : `Thu thập ${expEarned} Tu Vi (${minutesElapsed} phút tu luyện)`,
          'gain'
        );
        setPassiveExpStatus({ pendingExp: 0, multiplier: 1, minutesElapsed: 0, baseExp: 0 });
      } else if (result?.nextCollectIn) {
        addLog(`Chưa đủ thời gian. Chờ thêm ${result.nextCollectIn}s`, 'normal');
      }
    } catch (err) {
      addLog(`Thu thập thất bại: ${err.message}`, 'danger');
    } finally {
      setCollectingPassiveExp(false);
    }
  };
  const handleBreakthrough = async () => {
    if (isBreakingThrough || checkingIn) return;

    setIsBreakingThrough(true);
    addLog('⚡ BẮT ĐẦU ĐỘ KIẾP!', 'danger');
    addLog('Thiên lôi đang tụ lại...', 'danger');
    setIsShaking(true);

    let count = 0;
    const flashInterval = setInterval(() => {
      setFlashOpacity(Math.random() > 0.5 ? 0.8 : 0);
      count++;
      if (count > 10) {
        clearInterval(flashInterval);
        setFlashOpacity(0);
        setIsShaking(false);
      }
    }, 100);

    try {
      const result = await attemptBreakthrough();
      if (result?.breakthroughSuccess) {
        setTimeout(() => {
          setIsBreakingThrough(false);
        }, 1500);
      } else {
        setIsBreakingThrough(false);
      }
    } catch (err) {
      setIsBreakingThrough(false);
      addLog(`Độ kiếp thất bại: ${err.message}`, 'danger');
    }
  };
  if (loading || !cultivation) {
    return (
      <div className="min-h-screen bg-[#050511] flex items-center justify-center">
        <CustomStyles />
        <LoadingSkeleton />
      </div>
    );
  }

  const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realm?.level) || CULTIVATION_REALMS[0];
  const nextRealm = CULTIVATION_REALMS.find(r => r.level === (cultivation.realm?.level || 0) + 1);
  const progressPercent = nextRealm
    ? Math.min(((cultivation.exp - currentRealm.minExp) / (nextRealm.minExp - currentRealm.minExp)) * 100, 100)
    : 100;
  const isBreakthroughReady = progressPercent >= 100 && nextRealm;
  const tabs = [
    { id: 'dashboard', label: 'Tổng Quan' },
    { id: 'stats', label: 'Thông Số' },
    { id: 'quests', label: 'Nhiệm Vụ' },
    { id: 'shop', label: 'Cửa Hàng' },
    { id: 'inventory', label: 'Túi Đồ' },
    { id: 'techniques', label: 'Công Pháp' },
    { id: 'pk', label: 'Luận Võ' },
    { id: 'leaderboard', label: 'Xếp Hạng' }
  ];

  return (
    <div className={`min-h-screen bg-[#050511] font-cultivation text-slate-200 overflow-x-hidden relative select-none ${isShaking ? 'shake' : ''}`}>
      <CustomStyles />

      <div className="fixed inset-0 -z-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2e1065] via-[#0b051d] to-[#000000]"></div>
      <div className="fixed inset-0 -z-20 stars opacity-40"></div>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="mist w-[600px] h-[600px] top-[-100px] left-[-100px]"></div>
        <div className="mist mist-2 w-[500px] h-[500px] bottom-[-50px] right-[-100px]"></div>
        <div className="mist mist-3 w-[400px] h-[400px] top-[30%] right-[10%]"></div>
      </div>

      <div
        className="fixed inset-0 bg-white pointer-events-none z-50 transition-opacity duration-100 mix-blend-overlay"
        style={{ opacity: flashOpacity }}
      ></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 sm:gap-2 text-slate-400 hover:text-amber-400 transition-colors text-xs sm:text-sm"
          >
            <span>←</span>
            <span className="hidden sm:inline">Trở về</span>
          </Link>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-title text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 tracking-[0.1em] sm:tracking-[0.15em] drop-shadow-sm text-center">
            THIÊN ĐẠO CÁC
          </h1>

          <div className="w-8 sm:w-16"></div>
        </div>

        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="grid grid-cols-4 gap-2 sm:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${activeTab === tab.id
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 active:bg-slate-800/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="hidden sm:flex justify-center gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap flex-shrink-0 snap-start ${activeTab === tab.id
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50'
                  : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[60vh]">
          {activeTab === 'dashboard' && (
            <DashboardTab
              cultivation={cultivation}
              currentRealm={currentRealm}
              nextRealm={nextRealm}
              progressPercent={progressPercent}
              isBreakthroughReady={isBreakthroughReady}
              onYinYangClick={handleYinYangClick}
              onBreakthrough={handleBreakthrough}
              onCollectPassiveExp={handleCollectPassiveExp}
              passiveExpStatus={passiveExpStatus}
              collectingPassiveExp={collectingPassiveExp}
              clickCooldown={clickCooldown}
              isBreakingThrough={isBreakingThrough}
              particles={particles}
              logs={logs}
              logExpanded={logExpanded}
              setLogExpanded={setLogExpanded}
              logEndRef={logEndRef}
            />
          )}
          
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'quests' && <QuestsTab onCheckIn={handleCheckIn} checkingIn={checkingIn} />}
          {activeTab === 'shop' && <ShopTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'techniques' && <TechniquesTab practiceTechnique={practiceTechnique} />}
          {activeTab === 'pk' && <PKTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab isAdmin={isAdmin} />}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative bg-[#0f172a] border-y-2 border-amber-600 p-8 max-w-sm text-center shadow-[0_0_100px_rgba(217,119,6,0.3)]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#0f172a] border-2 border-amber-600 rotate-45 flex items-center justify-center z-10">
                <span className="text-xl font-bold text-amber-500 -rotate-45">✓</span>
              </div>
              
              <h3 className="text-2xl font-bold text-amber-500 mb-4 font-title mt-4 tracking-wider">ĐỘ KIẾP THÀNH CÔNG</h3>
              <p className="text-slate-300 mb-8 font-serif text-sm leading-relaxed">{modalMsg}</p>
              
              <motion.button
                onClick={() => setModalOpen(false)}
                className="px-8 py-3 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100 rounded-lg border border-amber-600 font-bold uppercase text-xs tracking-wider shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tiếp tục tu luyện
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function CultivationPage() {
  return (
    <CultivationProvider>
      <CultivationContent />
    </CultivationProvider>
  );
}
