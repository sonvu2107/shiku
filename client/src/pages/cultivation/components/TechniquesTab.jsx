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

const TechniquesTab = memo(function TechniquesTab({ practiceTechnique }) {
  const { cultivation, shop, loadShop, loading } = useCultivation();
  const [practicing, setPracticing] = useState(null);
  const [expGain] = useState(10); // Exp mỗi lần luyện
  const [cooldowns, setCooldowns] = useState({}); // techniqueId -> remaining seconds
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState('all'); // 'all', 'common', 'uncommon', 'rare', 'epic', 'legendary'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'learned', 'notLearned'

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
  const filterBySearch = (items) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const technique = item.technique || item;
      return technique.name?.toLowerCase().includes(query) ||
        technique.description?.toLowerCase().includes(query);
    });
  };

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
  const filteredLearned = filterByRarity(filterBySearch(learned));
  const filteredNotLearned = filterByRarity(filterBySearch(notLearned));
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

    setPracticing(techniqueId);
    try {
      await practiceTechnique(techniqueId, expGain);

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

      {/* Search & Filter Bar */}
      <div className="spirit-tablet rounded-xl p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm công pháp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Rarity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Độ hiếm:</span>
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
              className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">Tất cả</option>
              <option value="common">Thường</option>
              <option value="uncommon">Tinh</option>
              <option value="rare">Hiếm</option>
              <option value="epic">Sử Thi</option>
              <option value="legendary">Huyền Thoại</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">Tất cả</option>
              <option value="learned">Đã học</option>
              <option value="notLearned">Chưa học</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kỹ Năng Đã Học */}
      {skills.length > 0 && (
        <div className="spirit-tablet rounded-xl p-5">
          <h4 className="text-lg font-bold text-amber-400 mb-4 font-title">CÔNG PHÁP ĐÃ HỌC</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map((skill, idx) => (
              <div key={idx} className="bg-black/40 border border-purple-500/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-purple-300">{skill.skillName}</h5>
                  <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded">Lv.{skill.level}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{skill.skillDescription}</p>
                <p className="text-xs text-slate-500">Từ: {skill.techniqueName}</p>
                <p className="text-xs text-cyan-400 mt-1">Cooldown: {skill.cooldown}s</p>
              </div>
            ))}
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
            {searchQuery || filterRarity !== 'all' || filterStatus !== 'all'
              ? 'Không tìm thấy công pháp phù hợp'
              : 'Chưa có công pháp nào'}
          </p>
          {(searchQuery || filterRarity !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
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

