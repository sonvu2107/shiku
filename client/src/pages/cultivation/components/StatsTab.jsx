/**
 * Stats Tab - Display combat stats and equipment
 */
import { memo, useState } from 'react';
import { GiBroadsword, GiShield, GiGems, GiScrollUnfurled } from 'react-icons/gi';
import { Settings } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { CULTIVATION_REALMS } from '../../../services/cultivationAPI.js';
import { getCombatStats } from '../utils/helpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import IdentityHeader from './IdentityHeader.jsx';
import WeaponSlot from './WeaponSlot.jsx';
import CharacterAppearanceModal from './CharacterAppearanceModal.jsx';

const StatsTab = memo(function StatsTab() {
  const { cultivation, loading, updateCharacterAppearance } = useCultivation();
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realm?.level) || CULTIVATION_REALMS[0];

  // Backend đã merge equipment stats vào combatStats rồi
  const combatStats = getCombatStats(cultivation);

  return (
    <div className="space-y-5 sm:space-y-8 pb-4">
      <div className="text-center">
        <h3 className="font-bold text-gold font-title tracking-[0.2em] text-xl lg:text-2xl mb-2">THÔNG SỐ TU LUYỆN</h3>
        <div className="h-[2px] w-24 mx-auto bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
      </div>

      {/* Ngọc Giản Định Danh & Trang Bị */}
      <div className="relative">
        {/* Background với gradient và viền ánh kim */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-[#1e293b]/80 to-slate-900/80 rounded-xl border-2 border-amber-500/30 shadow-[0_0_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(245,158,11,0.1)] transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(0,0,0,0.7),0_0_40px_rgba(245,158,11,0.15)]"></div>

        {/* Họa tiết viền rồng/mây - Decorative Corners - Enhanced */}
        <div className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-[3px] border-l-[3px] border-amber-500/60 rounded-tl-lg"></div>
        <div className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-[3px] border-r-[3px] border-amber-500/60 rounded-tr-lg"></div>
        <div className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-[3px] border-l-[3px] border-amber-500/60 rounded-bl-lg"></div>
        <div className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-[3px] border-r-[3px] border-amber-500/60 rounded-br-lg"></div>

        {/* Decorative side borders */}
        <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-gradient-to-b from-transparent via-amber-500/40 to-transparent"></div>
        <div className="absolute right-0 top-1/4 bottom-1/4 w-[2px] bg-gradient-to-b from-transparent via-amber-500/40 to-transparent"></div>

        {/* Hiệu ứng ánh kim trên nền */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 rounded-xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)] rounded-xl pointer-events-none"></div>

        <div className="relative p-4 sm:p-5 md:p-6 lg:p-8">
          {/* Header - Enhanced */}
          <div className="text-center mb-6 md:mb-8">
            <div className="relative inline-block">
              <h3 className="text-base lg:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 font-title tracking-[0.15em] mb-3 relative z-10">
                NGỌC GIẢN ĐỊNH DANH
              </h3>
              <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
              <div className="absolute -bottom-0.5 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"></div>
            </div>
          </div>

          {/* Identity Header */}
          <IdentityHeader cultivation={cultivation} currentRealm={currentRealm} />

          {/* Thông Số Chiến Đấu - Grid 4 columns for desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-6 sm:mt-8 mb-8 sm:mb-10">
            {/* Tấn Công */}
            <div className="relative bg-black/40 border-2 border-red-500/20 p-3 sm:p-4 md:p-5 rounded-xl text-center group/stat hover:border-red-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
              <p className="text-[11px] text-red-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Tấn Công</p>
              <h3 className="text-xl lg:text-2xl font-bold text-red-100 font-mono leading-tight">
                {combatStats.attack.toLocaleString()}
              </h3>
            </div>

            {/* Phòng Thủ */}
            <div className="relative bg-black/40 border-2 border-blue-500/20 p-3 sm:p-4 md:p-5 rounded-xl text-center group/stat hover:border-blue-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
              <p className="text-[11px] text-blue-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Phòng Thủ</p>
              <h3 className="text-xl lg:text-2xl font-bold text-blue-100 font-mono leading-tight">
                {combatStats.defense.toLocaleString()}
              </h3>
            </div>

            {/* Khí Huyết */}
            <div className="relative bg-black/40 border-2 border-pink-500/20 p-3 sm:p-4 md:p-5 rounded-xl text-center group/stat hover:border-pink-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"></div>
              <p className="text-[11px] text-pink-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Khí Huyết</p>
              <h3 className="text-xl lg:text-2xl font-bold text-pink-100 font-mono leading-tight">
                {combatStats.qiBlood.toLocaleString()}
              </h3>
            </div>

            {/* Chân Nguyên */}
            <div className="relative bg-black/40 border-2 border-purple-500/20 p-3 sm:p-4 md:p-5 rounded-xl text-center group/stat hover:border-purple-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
              <p className="text-[11px] text-purple-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Chân Nguyên</p>
              <h3 className="text-xl lg:text-2xl font-bold text-purple-100 font-mono leading-tight">
                {combatStats.zhenYuan.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Divider - Enhanced */}
          <div className="relative my-6 sm:my-8">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4">
              <div className="w-3 h-3 border-2 border-amber-500/50 rotate-45 bg-slate-900/80"></div>
            </div>
          </div>

          {/* EQUIPMENT SECTION - Character Silhouette Layout */}
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4">
              <div className="relative inline-block">
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-[0.15em] inline-block px-6 py-2 border-2 border-amber-500/40 rounded-full bg-amber-900/10 relative">
                  <span className="relative z-10">Trang Bị Pháp Bảo</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5"></div>
                </h4>
              </div>
            </div>

            {/* Character Silhouette Layout */}
            <div className="relative max-w-4xl mx-auto">
              {/* Desktop Layout - 3 columns with character in center */}
              <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] gap-3 lg:gap-4 items-start">

                {/* Left Column - Armor & Accessories */}
                <div className="space-y-2 lg:space-y-3">
                  <WeaponSlot slotName="Mũ" slotType="helmet" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Vai Giáp" slotType="shoulder" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Găng Tay" slotType="gloves" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Nhẫn" slotType="ring" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Dây Chuyền" slotType="necklace" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                </div>

                {/* Center - Character Silhouette */}
                <div className="flex flex-col items-center">
                  {/* Character Image */}
                  <div className="relative w-32 lg:w-40 h-48 lg:h-56 mb-3">
                    {/* Character Body Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-purple-500/15 to-blue-500/10 rounded-2xl blur-xl"></div>

                    {/* Character Image */}
                    <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-amber-500/40 bg-black/40">
                      <img
                        src={`/assets/avatar_characters/${cultivation.characterAppearance || 'Immortal_male'}.jpg`}
                        alt="Character"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/assets/avatar_characters/Immortal_male.jpg';
                        }}
                      />
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
                    </div>

                    {/* Settings Button */}
                    <button
                      onClick={() => setShowAppearanceModal(true)}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 rounded-full flex items-center justify-center transition-all hover:scale-110 hover:border-amber-500"
                      title="Đổi hình tượng"
                    >
                      <Settings size={14} className="text-amber-400" />
                    </button>

                    {/* Decorative Particles */}
                    <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-amber-400 rounded-full animate-pulse"></div>
                    <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-200"></div>
                  </div>

                  {/* Weapons Row below character */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                    <WeaponSlot slotName="Vũ Khí" slotType="weapon" icon={GiBroadsword} iconColor="text-red-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Pháp Bảo" slotType="magicTreasure" icon={GiGems} iconColor="text-purple-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Linh Khí" slotType="powerItem" icon={GiScrollUnfurled} iconColor="text-cyan-400" cultivation={cultivation} compact />
                  </div>
                </div>

                {/* Right Column - Armor & Accessories */}
                <div className="space-y-2 lg:space-y-3">
                  <WeaponSlot slotName="Giáp Ngực" slotType="chest" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Đai Lưng" slotType="belt" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Giày" slotType="boots" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Bông Tai" slotType="earring" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Vòng Tay" slotType="bracelet" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                </div>
              </div>

              {/* Mobile Layout - Compact grid */}
              <div className="md:hidden space-y-4">
                {/* Character image for mobile */}
                <div className="flex justify-center mb-2">
                  <div className="relative w-24 h-32">
                    <div className="w-full h-full rounded-lg overflow-hidden border border-amber-500/30 bg-black/40">
                      <img
                        src={`/assets/avatar_characters/${cultivation.characterAppearance || 'Immortal_male'}.jpg`}
                        alt="Character"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/assets/avatar_characters/Immortal_male.jpg';
                        }}
                      />
                    </div>
                    {/* Settings Button */}
                    <button
                      onClick={() => setShowAppearanceModal(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 rounded-full flex items-center justify-center"
                    >
                      <Settings size={10} className="text-amber-400" />
                    </button>
                  </div>
                </div>

                {/* Weapons Row */}
                <div className="grid grid-cols-3 gap-2">
                  <WeaponSlot slotName="Vũ Khí" slotType="weapon" icon={GiBroadsword} iconColor="text-red-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Pháp Bảo" slotType="magicTreasure" icon={GiGems} iconColor="text-purple-400" cultivation={cultivation} compact />
                  <WeaponSlot slotName="Linh Khí" slotType="powerItem" icon={GiScrollUnfurled} iconColor="text-cyan-400" cultivation={cultivation} compact />
                </div>

                {/* Armor Grid */}
                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider text-center mb-2">Hộ Giáp</p>
                  <div className="grid grid-cols-3 gap-2">
                    <WeaponSlot slotName="Mũ" slotType="helmet" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Giáp Ngực" slotType="chest" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Vai Giáp" slotType="shoulder" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Găng Tay" slotType="gloves" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Đai Lưng" slotType="belt" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Giày" slotType="boots" icon={GiShield} iconColor="text-blue-400" cultivation={cultivation} compact />
                  </div>
                </div>

                {/* Accessories Grid */}
                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider text-center mb-2">Trang Sức</p>
                  <div className="grid grid-cols-4 gap-2">
                    <WeaponSlot slotName="Nhẫn" slotType="ring" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Dây Chuyền" slotType="necklace" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Bông Tai" slotType="earring" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                    <WeaponSlot slotName="Vòng Tay" slotType="bracelet" icon={GiGems} iconColor="text-yellow-400" cultivation={cultivation} compact />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Character Appearance Modal */}
      <CharacterAppearanceModal
        isOpen={showAppearanceModal}
        onClose={() => setShowAppearanceModal(false)}
        currentAppearance={cultivation.characterAppearance || 'Immortal_male'}
        lastChangeAt={cultivation.lastAppearanceChangeAt}
        onSave={async (appearance) => {
          await updateCharacterAppearance(appearance);
        }}
      />
    </div>
  );
});

export default StatsTab;
