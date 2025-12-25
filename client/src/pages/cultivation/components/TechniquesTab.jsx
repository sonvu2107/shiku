/**
 * Techniques Tab - Practice and manage cultivation techniques
 */
import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import FlyingReward from './FlyingReward.jsx';

const TechniquesTab = memo(function TechniquesTab({ practiceTechnique }) {
  const { cultivation, shop, loadShop, loading } = useCultivation();
  const [practicing, setPracticing] = useState(null);
  const [expGain] = useState(10); // Exp mỗi lần luyện
  const [cooldowns, setCooldowns] = useState({}); // techniqueId -> remaining seconds
  const [filterRarity, setFilterRarity] = useState('all'); // 'all', 'common', 'uncommon', 'rare', 'epic', 'legendary'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'learned', 'notLearned'
  const [rewardsAnimation, setRewardsAnimation] = useState([]);

  // Load shop data khi component mount nếu chưa có
  // Đảm bảo công pháp luôn hiển thị dù user vào tab này trước Cửa Hàng
  useEffect(() => {
    if (!shop) {
      loadShop();
    }
  }, [shop, loadShop]);

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

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  // Lấy danh sách công pháp từ shop
  const allTechniques = shop?.items?.filter(item => item.type === 'technique') || [];
  const learnedTechniques = cultivation.learnedTechniques || [];
  const skills = cultivation.skills || [];

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

      {/* Công Pháp Đã Học */}
      {finalLearned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-emerald-400 font-title">TU LUYỆN CÔNG PHÁP</h4>
            <span className="text-xs text-slate-500">({finalLearned.length} / {learned.length})</span>
          </div>

          {/* Grid 2 cột trên desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {finalLearned.map((learnedItem) => {
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

