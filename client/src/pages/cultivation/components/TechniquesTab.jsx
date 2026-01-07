/**
 * Techniques Tab - Practice and manage cultivation techniques
 */
import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api.js';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import FlyingReward from './FlyingReward.jsx';
import CombatSlotsSection from './CombatSlotsSection.jsx';

const TechniquesTab = memo(function TechniquesTab({ practiceTechnique }) {
  const { cultivation, shop, loadShop, loading, refresh } = useCultivation();
  const [practicing, setPracticing] = useState(null);
  const [expGain] = useState(10); // Exp mỗi lần luyện
  const [cooldowns, setCooldowns] = useState({}); // techniqueId -> remaining seconds
  const [filterRarity, setFilterRarity] = useState('all'); // 'all', 'common', 'uncommon', 'rare', 'epic', 'legendary'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'learned', 'notLearned'
  const [rewardsAnimation, setRewardsAnimation] = useState([]);

  // Cultivation techniques state
  const [cultivationTechniques, setCultivationTechniques] = useState([]);
  const [equippedEfficiency, setEquippedEfficiency] = useState(null);
  const [loadingCultTech, setLoadingCultTech] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [activating, setActivating] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Bulk Practice Session state (Nhập Định 10 Phút)
  const [bulkPracticeSession, setBulkPracticeSession] = useState(null);
  const [bulkPracticeTimeLeft, setBulkPracticeTimeLeft] = useState(0);
  const [startingBulkPractice, setStartingBulkPractice] = useState(false);
  const [claimingBulkPractice, setClaimingBulkPractice] = useState(false);

  // Load shop data khi component mount nếu chưa có
  // Đảm bảo công pháp luôn hiển thị dù user vào tab này trước Cửa Hàng
  useEffect(() => {
    if (!shop) {
      loadShop();
    }
  }, [shop, loadShop]);

  // Load cultivation techniques
  const loadCultivationTechniques = async () => {
    setLoadingCultTech(true);
    try {
      const data = await api('/api/cultivation/techniques');
      if (data.success) {
        setCultivationTechniques(data.data.techniques || []);
        setEquippedEfficiency(data.data.equippedEfficiency);
        if (data.data.activeSession) {
          setActiveSession(data.data.activeSession);
          const timeLeft = Math.max(0, Math.floor(data.data.activeSession.timeRemaining / 1000));
          setSessionTimeLeft(timeLeft);
        } else {
          setActiveSession(null);
          setSessionTimeLeft(0);
        }
      }
    } catch (e) {
      console.error('Failed to load cultivation techniques:', e);
    } finally {
      setLoadingCultTech(false);
    }
  };

  useEffect(() => {
    loadCultivationTechniques();
    loadBulkPracticeStatus();
  }, []);

  // Load bulk practice session status
  const loadBulkPracticeStatus = async () => {
    try {
      const data = await api('/api/cultivation/practice-session/status');
      if (data.success && data.data.hasActiveSession) {
        setBulkPracticeSession(data.data);
        const timeLeft = Math.max(0, Math.floor(data.data.remainingMs / 1000));
        setBulkPracticeTimeLeft(timeLeft);
      } else {
        setBulkPracticeSession(null);
        setBulkPracticeTimeLeft(0);
      }
    } catch (e) {
      console.error('Failed to load bulk practice status:', e);
    }
  };

  // Session countdown timer
  useEffect(() => {
    if (sessionTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionTimeLeft > 0]);

  // Bulk practice countdown timer
  useEffect(() => {
    if (bulkPracticeTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setBulkPracticeTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [bulkPracticeTimeLeft > 0]);

  useEffect(() => {
    if (!Object.keys(cooldowns).length) return;

    const timer = setInterval(() => {
      setCooldowns(prev => {
        const next = {};
        let hasAny = false;
        for (const [id, value] of Object.entries(prev)) {
          if (value > 1) {
            next[id] = value - 1;
            hasAny = true;
          } else if (value === 1) {
            // hết cooldown, bỏ khỏi map
          }
        }
        return hasAny ? next : {};
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldowns]);

  // Handler: Start bulk practice session (Nhập Định 10 Phút)
  const handleStartBulkPractice = async () => {
    if (startingBulkPractice) return;
    setStartingBulkPractice(true);
    try {
      const res = await api('/api/cultivation/practice-session/start', {
        method: 'POST'
      });
      if (res.success) {
        setBulkPracticeSession({
          hasActiveSession: true,
          ...res.data
        });
        setBulkPracticeTimeLeft(Math.floor(res.data.durationMs / 1000));
      }
    } catch (e) {
      console.error('Start bulk practice failed:', e);
    } finally {
      setStartingBulkPractice(false);
    }
  };

  // Handler: Claim bulk practice session
  const handleClaimBulkPractice = async () => {
    if (claimingBulkPractice) return;
    setClaimingBulkPractice(true);
    try {
      const res = await api('/api/cultivation/practice-session/claim', {
        method: 'POST'
      });
      if (res.success) {
        setBulkPracticeSession(null);
        setBulkPracticeTimeLeft(0);
        // Do NOT call refresh() here - it causes full page reload
        // User can immediately start new meditation session
      }
    } catch (e) {
      console.error('Claim bulk practice failed:', e);
    } finally {
      setClaimingBulkPractice(false);
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  // Lấy danh sách công pháp từ shop
  const allTechniques = shop?.items?.filter(item => item.type === 'technique') || [];
  const learnedTechniques = cultivation.learnedTechniques || [];
  const skills = cultivation.skills || [];

  // Công pháp tông môn đã học
  const sectTechniquesData = cultivation.sectTechniques || [];
  const SECT_TECHNIQUES_INFO = {
    sect_basic_qi: { name: 'Tông Môn Thổ Nạp Pháp', description: 'Tăng 8% Tấn Công và Phòng Thủ', rarity: 'common', stats: { attack: 0.08, defense: 0.08 } },
    sect_spirit_gathering: { name: 'Linh Khí Quy Tụ Pháp', description: 'Tăng 10% Chân Nguyên và 5% Hồi Phục', rarity: 'uncommon', stats: { zhenYuan: 0.10, regeneration: 0.05 } },
    sect_unity_strike: { name: 'Đồng Tâm Quyết', description: 'Tăng 12% Tấn Công và 8% Chí Mạng', rarity: 'rare', stats: { attack: 0.12, criticalRate: 0.08 } },
    sect_guardian_aura: { name: 'Hộ Tông Thần Công', description: 'Tăng 15% Phòng Thủ và 10% Kháng Cự', rarity: 'rare', stats: { defense: 0.15, resistance: 0.10 } },
    sect_swift_formation: { name: 'Tốc Chiến Trận Pháp', description: 'Tăng 15% Tốc Độ và 12% Né Tránh', rarity: 'rare', stats: { speed: 0.15, dodge: 0.12 } },
    sect_hegemon_art: { name: 'Bá Vương Tông Pháp', description: 'Tăng 18% Tấn Công, 12% Chí Mạng và 10% Xuyên Thấu', rarity: 'epic', stats: { attack: 0.18, criticalRate: 0.12, penetration: 0.10 } },
    sect_immortal_body: { name: 'Bất Tử Tông Thể', description: 'Tăng 20% Khí Huyết và 15% Hồi Phục', rarity: 'epic', stats: { qiBlood: 0.20, regeneration: 0.15 } },
    sect_ancestral_legacy: { name: 'Tổ Sư Di Huấn', description: 'Tăng 15% tất cả chỉ số chiến đấu', rarity: 'legendary', stats: { attack: 0.15, defense: 0.15, qiBlood: 0.15, zhenYuan: 0.15, speed: 0.15, criticalRate: 0.10 } },
  };
  const learnedSectTechniques = sectTechniquesData.map(st => ({
    ...st,
    technique: SECT_TECHNIQUES_INFO[st.id] || null
  })).filter(st => st.technique);

  // Tách công pháp đã học và chưa học
  const learned = learnedTechniques.map(learned => {
    const technique = allTechniques.find(t => t.id === learned.techniqueId);
    return { ...learned, technique };
  }).filter(t => t.technique);

  const notLearned = allTechniques.filter(t =>
    !learnedTechniques.some(l => l.techniqueId === t.id)
  );

  // Filter functions
  const filterByRarity = (items) => {
    if (filterRarity === 'all') return items;
    return items.filter(item => {
      const technique = item.technique || item;
      return technique.rarity === filterRarity;
    });
  };

  const filterByStatus = (learnedItems, notLearnedItems) => {
    if (filterStatus === 'all') return { learned: learnedItems, notLearned: notLearnedItems };
    if (filterStatus === 'learned') return { learned: learnedItems, notLearned: [] };
    return { learned: [], notLearned: notLearnedItems };
  };

  // Apply filters
  const filteredLearned = filterByRarity(learned);
  const filteredNotLearned = filterByRarity(notLearned);
  const { learned: finalLearned, notLearned: finalNotLearned } = filterByStatus(filteredLearned, filteredNotLearned);

  const getPracticeCooldown = (technique) => {
    // Ưu tiên dùng cooldown của skill nếu có (đơn vị giây, rút gọn để luyện)
    if (technique.skill?.cooldown) {
      // Ví dụ: luyện công = skillCooldown / 3, tối thiểu 3s
      return Math.max(3, Math.round(technique.skill.cooldown / 3));
    }

    // Fallback theo độ hiếm
    const byRarity = {
      common: 3,
      uncommon: 5,
      rare: 8,
      epic: 12,
      legendary: 15
    };
    return byRarity[technique.rarity] || 5;
  };

  const handlePractice = async (techniqueId, technique, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Đang cooldown thì bỏ qua
    if (cooldowns[techniqueId] > 0) return;

    // Lưu vị trí click để chạy animation (Relative to Card)
    let startPos = { x: 50, y: 50 }; // Default fallback
    let targetPos = { x: 0, y: 0 };

    if (e && e.currentTarget) {
      const btn = e.currentTarget;
      const card = btn.closest('.spirit-tablet'); // Tim the cha

      if (card) {
        const btnRect = btn.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        // Convert viewport coords to card-relative coords
        startPos = {
          x: btnRect.left - cardRect.left + btnRect.width / 2,
          y: btnRect.top - cardRect.top + btnRect.height / 2
        };

        // Target: Left of button (Progress bar area)
        targetPos = {
          x: startPos.x - 120, // Move left
          y: startPos.y - 10   // Move slightly up
        };
      }
    }

    setPracticing(techniqueId);
    try {
      await practiceTechnique(techniqueId, expGain);

      // Trigger animation with techniqueId
      setRewardsAnimation(prev => [...prev, {
        id: Date.now(),
        techniqueId, // Add techniqueId to track which card
        startPos,
        targetPos,
        rewards: [{ type: 'exp', amount: expGain }]
      }]);

      const cd = getPracticeCooldown(technique);
      setCooldowns(prev => ({
        ...prev,
        [techniqueId]: cd
      }));
    } finally {
      setPracticing(null);
    }
  };

  const getExpNeeded = (level) => level * 100;

  // Handlers for cultivation techniques
  const handleLearnCultTechnique = async (techniqueId) => {
    try {
      const res = await api('/api/cultivation/techniques/learn', {
        method: 'POST',
        body: JSON.stringify({ techniqueId })
      });
      if (res.success) {
        await loadCultivationTechniques();
        // Do NOT call refresh() here - it causes full page reload
      }
    } catch (e) {
      console.error('Learn technique failed:', e);
    }
  };

  const handleEquipCultTechnique = async (techniqueId) => {
    try {
      const res = await api('/api/cultivation/techniques/equip', {
        method: 'POST',
        body: JSON.stringify({ techniqueId })
      });
      if (res.success) {
        setEquippedEfficiency(techniqueId);
      }
    } catch (e) {
      console.error('Equip technique failed:', e);
    }
  };

  const handleUnequipCultTechnique = async () => {
    try {
      const res = await api('/api/cultivation/techniques/equip', {
        method: 'POST',
        body: JSON.stringify({ techniqueId: null })
      });
      if (res.success) {
        setEquippedEfficiency(null);
      }
    } catch (e) {
      console.error('Unequip technique failed:', e);
    }
  };

  // Activate semi-auto technique (vận công)
  const handleActivateTechnique = async (techniqueId) => {
    setActivating(true);
    try {
      const res = await api('/api/cultivation/techniques/activate', {
        method: 'POST',
        body: JSON.stringify({ techniqueId })
      });
      if (res.success) {
        setActiveSession({
          sessionId: res.data.sessionId,
          techniqueId: res.data.techniqueId,
          techniqueName: res.data.techniqueName,
          endsAt: res.data.endsAt,
          estimatedExp: res.data.estimatedExp
        });
        setSessionTimeLeft(res.data.durationSec);
      }
    } catch (e) {
      console.error('Activate technique failed:', e);
    } finally {
      setActivating(false);
    }
  };

  // Claim vận công
  const handleClaimTechnique = async () => {
    if (!activeSession) return;
    setClaiming(true);
    try {
      const res = await api('/api/cultivation/techniques/claim', {
        method: 'POST',
        body: JSON.stringify({ sessionId: activeSession.sessionId })
      });
      if (res.success) {
        setActiveSession(null);
        setSessionTimeLeft(0);
        // Do NOT call refresh() here - it causes full page reload
        // User can immediately start new meditation session
      }
    } catch (e) {
      console.error('Claim technique failed:', e);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-6 pb-2">
      <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">LUYỆN CÔNG PHÁP</h3>

      {/* Filter Bar */}
      <div className="spirit-tablet rounded-xl p-4">
        {/* Filters - Improved UI */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Rarity Filter */}
          <div className="flex-1 space-y-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Phẩm cấp</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tất cả', color: 'bg-slate-800 border-slate-600 text-slate-300' },
                { id: 'common', label: 'Phàm Phẩm', color: 'bg-slate-800 border-slate-500 text-slate-300' },
                { id: 'uncommon', label: 'Tinh Phẩm', color: 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' },
                { id: 'rare', label: 'Hiếm Có', color: 'bg-blue-900/30 border-blue-500/30 text-blue-400' },
                { id: 'epic', label: 'Cực Phẩm', color: 'bg-purple-900/30 border-purple-500/30 text-purple-400' },
                { id: 'legendary', label: 'Thần Bảo', color: 'bg-amber-900/30 border-amber-500/30 text-amber-400' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterRarity(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterRarity === opt.id
                    ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : `${opt.color} hover:bg-slate-700`
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Trạng thái</span>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'learned', label: 'Đã lĩnh ngộ' },
                { id: 'notLearned', label: 'Chưa học' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterStatus(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStatus === opt.id
                    ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Combat Slots Section */}
      <CombatSlotsSection cultivationTechniques={cultivationTechniques} />

      {/* Công Pháp Tông Môn */}
      {learnedSectTechniques.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-blue-400 font-title">CÔNG PHÁP TÔNG MÔN</h4>
            <span className="text-xs text-slate-500">({learnedSectTechniques.length})</span>
          </div>
          <p className="text-xs text-slate-500">Học từ Tàng Kinh Các - Chỉ số cộng vĩnh viễn</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {learnedSectTechniques.map((item) => {
              const { technique, id, learnedAt } = item;
              const rarity = RARITY_COLORS[technique.rarity] || RARITY_COLORS.common;
              const statLabels = {
                attack: 'Tấn Công',
                defense: 'Phòng Thủ',
                qiBlood: 'Khí Huyết',
                zhenYuan: 'Chân Nguyên',
                speed: 'Tốc Độ',
                criticalRate: 'Chí Mạng',
                dodge: 'Né Tránh',
                penetration: 'Xuyên Thấu',
                resistance: 'Kháng Cự',
                lifesteal: 'Hấp Huyết',
                regeneration: 'Hồi Phục',
                luck: 'Vận Khí'
              };

              return (
                <div
                  key={id}
                  className={`spirit-tablet rounded-xl p-3 ${rarity.bg} ${rarity.border}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-900/50 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-300 text-xs font-title">宗</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={`font-bold text-base truncate ${rarity.text}`}>{technique.name}</h5>
                        <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded uppercase">
                          {rarity.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{technique.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  {technique.stats && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(technique.stats).map(([stat, value]) => (
                        <span key={stat} className="text-[10px] bg-slate-800/50 text-emerald-300 px-1.5 py-0.5 rounded">
                          {statLabels[stat]}: +{Math.round(value * 100)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Công Pháp Tu Luyện */}
      {cultivationTechniques.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-amber-400 font-title">CÔNG PHÁP TU LUYỆN</h4>
            <span className="text-xs text-slate-500">
              ({cultivationTechniques.filter(t => t.learned).length}/{cultivationTechniques.length})
            </span>
          </div>
          <p className="text-xs text-slate-500">Tăng hiệu suất thu thập tu vi</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cultivationTechniques.map((tech) => {
              const isLearned = tech.learned;
              const canUnlock = tech.canUnlock;
              const isEquipped = equippedEfficiency === tech.id;
              const isEfficiency = tech.type === 'efficiency';
              const isActiveSession = activeSession?.techniqueId === tech.id;

              return (
                <div
                  key={tech.id}
                  className={`spirit-tablet rounded-xl p-4 ${isLearned
                    ? 'bg-amber-900/20 border border-amber-500/30'
                    : canUnlock
                      ? 'bg-slate-800/50 border border-emerald-500/30'
                      : 'bg-slate-900/50 border border-slate-700/30 opacity-60'}`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isEfficiency ? 'bg-amber-900/50 border-2 border-amber-500/40' : 'bg-cyan-900/50 border-2 border-cyan-500/40'
                      }`}>
                      <span className={`text-lg font-title ${isEfficiency ? 'text-amber-300' : 'text-cyan-300'}`}>
                        {isEfficiency ? '聚' : '功'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={`font-bold text-base ${isLearned ? 'text-amber-300' : 'text-slate-400'}`}>
                          {tech.name}
                        </h5>
                        {isEquipped && (
                          <span className="text-[10px] bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                            Trang bị
                          </span>
                        )}
                        {isActiveSession && (
                          <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 animate-pulse">
                            Đang vận công
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-400/80">{tech.shortDesc || tech.description}</p>
                    </div>
                  </div>

                  {/* Description & Lore */}
                  <div className="mb-3 p-2 bg-black/30 rounded-lg border border-slate-700/30">
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      "{tech.lore}"
                    </p>
                  </div>

                  {/* Stats badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tech.bonusPercent && (
                      <span className="text-[10px] bg-amber-900/40 text-amber-300 px-2 py-1 rounded border border-amber-500/20">
                        +{tech.bonusPercent}% Tu Vi
                      </span>
                    )}
                    {tech.durationSec && (
                      <span className="text-[10px] bg-cyan-900/40 text-cyan-300 px-2 py-1 rounded border border-cyan-500/20">
                        {tech.durationSec}s nhập định
                      </span>
                    )}
                    {tech.techniqueMultiplier && tech.techniqueMultiplier !== 1 && (
                      <span className="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-1 rounded border border-purple-500/20">
                        x{tech.techniqueMultiplier} hiệu quả
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-1 rounded border ${tech.tier === 1 ? 'bg-slate-800/50 text-slate-400 border-slate-600/30' :
                      tech.tier === 2 ? 'bg-blue-900/40 text-blue-300 border-blue-500/20' :
                        'bg-purple-900/40 text-purple-300 border-purple-500/20'
                      }`}>
                      {tech.tier === 1 ? 'Phàm Phẩm' : tech.tier === 2 ? 'Hiếm Có' : 'Cực Phẩm'}
                    </span>
                  </div>

                  {/* Active session timer */}
                  {isActiveSession && sessionTimeLeft > 0 && (
                    <div className="mb-3 p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-cyan-300">Đang nhập định...</span>
                        <span className="text-lg font-bold text-cyan-400 font-mono">{sessionTimeLeft}s</span>
                      </div>
                      {activeSession?.estimatedExp > 0 && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-amber-300/80">Tu vi dự kiến</span>
                          <span className="text-sm font-bold text-amber-400">+{activeSession.estimatedExp} Tu Vi</span>
                        </div>
                      )}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-1000"
                          style={{ width: `${(sessionTimeLeft / tech.durationSec) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {/* Chưa học + có thể unlock */}
                    {!isLearned && canUnlock && (
                      <button
                        onClick={() => handleLearnCultTechnique(tech.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold uppercase bg-gradient-to-r from-emerald-700 to-emerald-900 text-emerald-100 border border-emerald-500/30 hover:from-emerald-600 hover:to-emerald-800 transition-all"
                      >
                        Lĩnh Ngộ Công Pháp
                      </button>
                    )}

                    {/* Chưa học + chưa đủ điều kiện */}
                    {!isLearned && !canUnlock && (
                      <span className="flex-1 py-2 text-center text-xs text-slate-500 bg-slate-900/50 rounded-lg border border-slate-700/30">
                        {tech.unlockReason || 'Chưa đủ tu vi'}
                      </span>
                    )}

                    {/* Đã học + Efficiency + chưa equip */}
                    {isLearned && isEfficiency && !isEquipped && (
                      <button
                        onClick={() => handleEquipCultTechnique(tech.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold uppercase bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 border border-amber-500/30 hover:from-amber-600 hover:to-amber-800 transition-all"
                      >
                        Trang Bị
                      </button>
                    )}

                    {/* Đã học + Efficiency + đã equip */}
                    {isLearned && isEfficiency && isEquipped && (
                      <button
                        onClick={handleUnequipCultTechnique}
                        className="flex-1 py-2 rounded-lg text-xs font-bold uppercase bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700 transition-all"
                      >
                        Tháo Công Pháp
                      </button>
                    )}

                    {/* Đã học + Semi-auto + chưa có session active */}
                    {isLearned && !isEfficiency && !activeSession && (
                      <button
                        onClick={() => handleActivateTechnique(tech.id)}
                        disabled={activating}
                        className="flex-1 py-2 rounded-lg text-xs font-bold uppercase bg-gradient-to-r from-cyan-700 to-cyan-900 text-cyan-100 border border-cyan-500/30 hover:from-cyan-600 hover:to-cyan-800 disabled:opacity-50 transition-all"
                      >
                        {activating ? 'Đang kích hoạt...' : 'Nhập Định Vận Công'}
                      </button>
                    )}

                    {/* Đã học + Semi-auto + có session active của technique này */}
                    {isLearned && !isEfficiency && isActiveSession && (
                      <button
                        onClick={handleClaimTechnique}
                        disabled={claiming || sessionTimeLeft > 0}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${sessionTimeLeft > 0
                          ? 'bg-slate-800 text-slate-500 border border-slate-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-700 to-emerald-900 text-emerald-100 border border-emerald-500/30 hover:from-emerald-600 hover:to-emerald-800 animate-pulse'
                          }`}
                      >
                        {claiming ? 'Đang thu...' : sessionTimeLeft > 0 ? `Chờ ${sessionTimeLeft}s` : 'Thu Hoạch Tu Vi'}
                      </button>
                    )}

                    {/* Đã học + Semi-auto + có session active của technique khác */}
                    {isLearned && !isEfficiency && activeSession && !isActiveSession && (
                      <span className="flex-1 py-2 text-center text-xs text-slate-500 bg-slate-900/50 rounded-lg border border-slate-700/30">
                        Đang vận công pháp khác
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Công Pháp Đã Học */}
      {finalLearned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-emerald-400 font-title">TU LUYỆN CÔNG PHÁP</h4>
            <span className="text-xs text-slate-500">({finalLearned.length} / {learned.length})</span>
          </div>

          {/* NHẬP ĐỊNH 10 PHÚT - Bulk Practice Panel */}
          <div className="spirit-tablet rounded-xl p-4 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg"></span>
                  <h5 className="font-bold text-purple-300">Nhập Định 10 Phút</h5>
                </div>
                <p className="text-xs text-slate-400">
                  {bulkPracticeSession?.hasActiveSession
                    ? `Đang luyện ${bulkPracticeSession.techniqueCount || learned.filter(t => t.level < 10).length} công pháp...`
                    : `Luyện tất cả ${learned.filter(t => t.level < 10).length} công pháp cùng lúc (+400 exp/công pháp)`
                  }
                </p>

                {/* Progress bar when session active */}
                {bulkPracticeSession?.hasActiveSession && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-300">Tiến độ</span>
                      <span className="text-blue-400 font-mono font-bold">{formatTime(bulkPracticeTimeLeft)}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-blue-500/30">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-violet-500 h-full transition-all duration-1000"
                        style={{ width: `${((600 - bulkPracticeTimeLeft) / 600) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Dự kiến nhận: +{(bulkPracticeSession.totalEstimatedExp || learned.filter(t => t.level < 10).length * 400).toLocaleString()} điểm tu luyện
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                {!bulkPracticeSession?.hasActiveSession ? (
                  <button
                    onClick={handleStartBulkPractice}
                    disabled={startingBulkPractice || learned.filter(t => t.level < 10).length === 0}
                    className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm font-bold uppercase bg-amber-700 text-amber-100 border border-amber-500/50 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)]"
                  >
                    {startingBulkPractice ? 'Đang bắt đầu...' : 'Bắt Đầu Nhập Định'}
                  </button>
                ) : bulkPracticeTimeLeft <= 0 ? (
                  <button
                    onClick={handleClaimBulkPractice}
                    disabled={claimingBulkPractice}
                    className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm font-bold uppercase bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/50 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                  >
                    {claimingBulkPractice ? 'Đang thu...' : ' Thu Hoạch'}
                  </button>
                ) : (
                  <div className="text-center px-4 py-2 sm:px-6 sm:py-3 rounded-lg bg-slate-800/50 border border-slate-600/50">
                    <span className="text-slate-400 text-sm">Đang nhập định...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid 2 cột trên desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sắp xếp: công pháp chưa max lên trước, đã max xuống cuối */}
            {[...finalLearned].sort((a, b) => {
              const aMaxed = a.level >= 10 ? 1 : 0;
              const bMaxed = b.level >= 10 ? 1 : 0;
              return aMaxed - bMaxed;
            }).map((learnedItem) => {
              const { technique, level, exp } = learnedItem;
              const expNeeded = getExpNeeded(level);
              const progress = level >= 10 ? 100 : (exp / expNeeded) * 100;
              const rarity = RARITY_COLORS[technique.rarity] || RARITY_COLORS.common;
              const TechniqueIcon = getItemIcon(technique);
              const remainingCd = cooldowns[learnedItem.techniqueId] || 0;
              const isMaxLevel = level >= 10;

              return (
                <div
                  key={learnedItem.techniqueId}
                  className={`spirit-tablet rounded-xl p-3 ${rarity.bg} ${rarity.border} hover:scale-[1.01] transition-transform`}
                >
                  {/* Header row: Icon + Name + Level */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-black border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                      {IMAGE_COMPONENTS.includes(TechniqueIcon) ? (
                        <TechniqueIcon size={24} />
                      ) : (
                        <TechniqueIcon size={18} className="text-amber-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={`font-bold text-base truncate ${rarity.text}`}>{technique.name}</h5>
                        <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded font-bold flex-shrink-0">
                          Lv.{level}/10
                        </span>
                      </div>
                      {/* Stats inline */}
                      {technique.stats && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(technique.stats).slice(0, 3).map(([stat, value]) => {
                            const statLabels = {
                              attack: 'Tấn Công',
                              defense: 'Phòng Thủ',
                              qiBlood: 'Khí Huyết',
                              zhenYuan: 'Chân Nguyên',
                              speed: 'Tốc Độ',
                              criticalRate: 'Chí Mạng',
                              dodge: 'Né Tránh',
                              penetration: 'Xuyên Thấu',
                              resistance: 'Kháng Cự',
                              lifesteal: 'Hấp Huyết',
                              regeneration: 'Hồi Phục',
                              luck: 'Vận Khí'
                            };
                            const actualBonus = value * (1 + (level - 1) * 0.1) * 100;
                            return (
                              <span key={stat} className="text-[10px] bg-slate-800/50 text-emerald-300 px-1.5 py-0.5 rounded">
                                {statLabels[stat]}: +{actualBonus.toFixed(0)}%
                              </span>
                            );
                          })}
                          {Object.keys(technique.stats).length > 3 && (
                            <span className="text-[10px] text-slate-500">+{Object.keys(technique.stats).length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress + Button row */}
                  <div className="flex items-center gap-2">
                    {/* Progress bar */}
                    {!isMaxLevel ? (
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                          <span>{exp}/{expNeeded}</span>
                          <span>{Math.floor(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-900/80 rounded-full h-2 border border-slate-700/50 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-violet-400 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-amber-400/70 text-center">ĐÃ ĐẠT CẤP CAO NHẤT</div>
                    )}

                    {/* Practice button */}
                    <button
                      onClick={(e) => handlePractice(learnedItem.techniqueId, technique, e)}
                      type="button"
                      disabled={practicing === learnedItem.techniqueId || isMaxLevel || remainingCd > 0}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex-shrink-0 ${isMaxLevel
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : remainingCd > 0
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                          : practicing === learnedItem.techniqueId
                            ? 'bg-amber-800 text-amber-300'
                            : 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 hover:from-amber-600 hover:to-amber-800'
                        }`}
                    >
                      {isMaxLevel
                        ? 'Max'
                        : remainingCd > 0
                          ? `${remainingCd}s`
                          : practicing === learnedItem.techniqueId
                            ? '...'
                            : 'Luyện'}
                    </button>
                  </div>

                  {/* Local Rewards Animation */}
                  {rewardsAnimation.filter(a => a.techniqueId === learnedItem.techniqueId).map(anim => (
                    <FlyingReward
                      key={anim.id}
                      inline={true}
                      startPos={anim.startPos}
                      targetPos={anim.targetPos}
                      rewards={anim.rewards}
                      onComplete={() => setRewardsAnimation(prev => prev.filter(p => p.id !== anim.id))}
                    />
                  ))}

                  {/* Skill info - compact */}
                  {technique.skill && (
                    <div className="mt-2 pt-2 border-t border-purple-500/20 text-xs">
                      <span className="text-purple-300 font-bold">{technique.skill.name}</span>
                      <span className="text-slate-500 ml-1">• CD: {technique.skill.cooldown}s</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Công Pháp Chưa Học */}
      {finalNotLearned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-400 font-title">CÔNG PHÁP CHƯA HỌC</h4>
            <span className="text-xs text-slate-500">({finalNotLearned.length} / {notLearned.length})</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">Mua công pháp trong cửa hàng để bắt đầu luyện</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {finalNotLearned.map((technique) => {
              const rarity = RARITY_COLORS[technique.rarity] || RARITY_COLORS.common;
              const TechniqueIcon = getItemIcon(technique);
              return (
                <div
                  key={technique.id}
                  className={`spirit-tablet rounded-xl p-4 opacity-60 ${rarity.bg} ${rarity.border}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-black border border-amber-500/40 flex items-center justify-center">
                      {IMAGE_COMPONENTS.includes(TechniqueIcon) ? (
                        <TechniqueIcon size={28} />
                      ) : (
                        <TechniqueIcon size={20} className="text-amber-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className={`font-bold ${rarity.text}`}>{technique.name}</h5>
                      <p className="text-xs text-slate-500">{technique.price} Linh Thạch</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{technique.description}</p>
                  {technique.stats && (
                    <div className="text-xs text-slate-500">
                      Bonus: {Object.keys(technique.stats).length} thông số
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {finalLearned.length === 0 && finalNotLearned.length === 0 && (
        <div className="text-center text-slate-500 py-10">
          <p className="text-sm">
            {filterRarity !== 'all' || filterStatus !== 'all'
              ? 'Không tìm thấy công pháp phù hợp'
              : 'Chưa có công pháp nào'}
          </p>
          {(filterRarity !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setFilterRarity('all');
                setFilterStatus('all');
              }}
              className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default TechniquesTab;

