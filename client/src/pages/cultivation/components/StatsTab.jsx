/**
 * Stats Tab - Display combat stats and equipment
 */
import { memo } from 'react';
import { Sword, Shield, Gem, Scroll } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { CULTIVATION_REALMS } from '../../../services/cultivationAPI.js';
import { getCombatStats } from '../utils/helpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import IdentityHeader from './IdentityHeader.jsx';
import WeaponSlot from './WeaponSlot.jsx';

const StatsTab = memo(function StatsTab() {
  const { cultivation, loading } = useCultivation();

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realm?.level) || CULTIVATION_REALMS[0];

  return (
    <div className="space-y-8 pb-4">
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

        <div className="relative p-5 md:p-6 lg:p-8">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6 mt-8 mb-10">
            {/* Tấn Công */}
            <div className="relative bg-black/40 border-2 border-red-500/20 p-4 md:p-5 rounded-xl text-center group/stat hover:border-red-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
              <p className="text-[11px] text-red-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Tấn Công</p>
              <h3 className="text-xl lg:text-2xl font-bold text-red-100 font-mono leading-tight">
                {getCombatStats(cultivation).attack.toLocaleString()}
              </h3>
            </div>

            {/* Phòng Thủ */}
            <div className="relative bg-black/40 border-2 border-blue-500/20 p-4 md:p-5 rounded-xl text-center group/stat hover:border-blue-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
              <p className="text-[11px] text-blue-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Phòng Thủ</p>
              <h3 className="text-xl lg:text-2xl font-bold text-blue-100 font-mono leading-tight">
                {getCombatStats(cultivation).defense.toLocaleString()}
              </h3>
            </div>

            {/* Khí Huyết */}
            <div className="relative bg-black/40 border-2 border-pink-500/20 p-4 md:p-5 rounded-xl text-center group/stat hover:border-pink-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"></div>
              <p className="text-[11px] text-pink-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Khí Huyết</p>
              <h3 className="text-xl lg:text-2xl font-bold text-pink-100 font-mono leading-tight">
                {getCombatStats(cultivation).qiBlood.toLocaleString()}
              </h3>
            </div>

            {/* Chân Nguyên */}
            <div className="relative bg-black/40 border-2 border-purple-500/20 p-4 md:p-5 rounded-xl text-center group/stat hover:border-purple-500/50 hover:bg-black/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
              <p className="text-[11px] text-purple-300/80 uppercase tracking-[0.2em] mb-3 font-semibold">Chân Nguyên</p>
              <h3 className="text-xl lg:text-2xl font-bold text-purple-100 font-mono leading-tight">
                {getCombatStats(cultivation).zhenYuan.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Divider - Enhanced */}
          <div className="relative my-8">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4">
              <div className="w-3 h-3 border-2 border-amber-500/50 rotate-45 bg-slate-900/80"></div>
            </div>
          </div>

          {/* EQUIPMENT SECTION MERGED */}
          <div className="space-y-8">
            <div className="text-center mb-6">
               <div className="relative inline-block">
                 <h4 className="text-sm font-bold text-amber-400 uppercase tracking-[0.15em] inline-block px-6 py-2 border-2 border-amber-500/40 rounded-full bg-amber-900/10 relative">
                   <span className="relative z-10">Trang Bị Pháp Bảo</span>
                   <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5"></div>
                 </h4>
               </div>
            </div>

            {/* Row 1: Vũ Khí, Pháp Bảo, Linh Khí */}
            <div className="grid grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
                <WeaponSlot slotName="Vũ Khí" slotType="weapon" icon={Sword} iconColor="text-red-400" cultivation={cultivation} />
                <WeaponSlot slotName="Pháp Bảo" slotType="magicTreasure" icon={Gem} iconColor="text-purple-400" cultivation={cultivation} />
                <WeaponSlot slotName="Linh Khí" slotType="powerItem" icon={Scroll} iconColor="text-purple-400" cultivation={cultivation} />
            </div>

            {/* Row 2: Armor (6 slots) */}
            <div className="pt-4">
               <div className="flex items-center gap-3 mb-4 justify-center">
                  <div className="h-[1px] flex-1 max-w-16 bg-gradient-to-r from-transparent via-slate-600/60 to-slate-600/60"></div>
                  <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-semibold px-3">Hộ Giáp</p>
                  <div className="h-[1px] flex-1 max-w-16 bg-gradient-to-l from-transparent via-slate-600/60 to-slate-600/60"></div>
               </div>
               <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                  <WeaponSlot slotName="Mũ" slotType="helmet" icon={Shield} iconColor="text-blue-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Giáp Ngực" slotType="chest" icon={Shield} iconColor="text-blue-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Vai Giáp" slotType="shoulder" icon={Shield} iconColor="text-blue-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Găng Tay" slotType="gloves" icon={Shield} iconColor="text-blue-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Giày" slotType="boots" icon={Shield} iconColor="text-blue-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Đai Lưng" slotType="belt" icon={Shield} iconColor="text-blue-400" cultivation={cultivation} />
               </div>
            </div>

            {/* Row 3: Jewelry (4 slots) */}
            <div className="pt-4">
               <div className="flex items-center gap-3 mb-4 justify-center">
                  <div className="h-[1px] flex-1 max-w-16 bg-gradient-to-r from-transparent via-slate-600/60 to-slate-600/60"></div>
                  <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-semibold px-3">Trang Sức</p>
                  <div className="h-[1px] flex-1 max-w-16 bg-gradient-to-l from-transparent via-slate-600/60 to-slate-600/60"></div>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  <WeaponSlot slotName="Nhẫn" slotType="ring" icon={Gem} iconColor="text-yellow-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Dây Chuyền" slotType="necklace" icon={Gem} iconColor="text-yellow-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Bông Tai" slotType="earring" icon={Gem} iconColor="text-yellow-400" cultivation={cultivation} />
                  <WeaponSlot slotName="Vòng Tay" slotType="bracelet" icon={Gem} iconColor="text-yellow-400" cultivation={cultivation} />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StatsTab;
