/**
 * Weapon Equipment Section - Display all equipment slots
 */
import { memo } from 'react';
import { GiBroadsword, GiShield, GiGems, GiScrollUnfurled } from 'react-icons/gi';
import WeaponSlot from './WeaponSlot.jsx';

const WeaponEquipmentSection = memo(function WeaponEquipmentSection({ cultivation }) {
  return (
    <div className="relative">
      {/* Background với gradient và viền ánh kim */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-[#1e293b]/80 to-slate-900/80 rounded-xl border-2 border-amber-500/30 shadow-[0_0_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(245,158,11,0.1)] transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(0,0,0,0.7),0_0_40px_rgba(245,158,11,0.15)]"></div>

      {/* Họa tiết viền rồng/mây - Decorative Corners */}
      <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-amber-500 rounded-tl-lg"></div>
      <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-amber-500 rounded-tr-lg"></div>
      <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-amber-500 rounded-bl-lg"></div>
      <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-amber-500 rounded-br-lg"></div>

      {/* Hiệu ứng ánh kim trên nền */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 rounded-xl pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)] rounded-xl pointer-events-none"></div>

      <div className="relative p-4 md:p-5 lg:p-6">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h3 className="text-sm lg:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 font-title tracking-wider mb-2">
            TRANG BỊ VŨ KHÍ
          </h3>
          <div className="h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
        </div>

        {/* Equipment Slots Grid */}
        <div className="space-y-4">
          {/* Vũ Khí & Pháp Bảo */}
          <div>
            <p className="text-xs text-amber-400/70 mb-2 uppercase tracking-wider">Vũ Khí & Pháp Bảo</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <WeaponSlot
                slotName="Vũ Khí"
                slotType="weapon"
                icon={GiBroadsword}
                iconColor="text-red-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Pháp Bảo"
                slotType="magicTreasure"
                icon={GiGems}
                iconColor="text-purple-400"
                cultivation={cultivation}
              />
            </div>
          </div>

          {/* Giáp */}
          <div>
            <p className="text-xs text-amber-400/70 mb-2 uppercase tracking-wider">Giáp</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              <WeaponSlot
                slotName="Mũ"
                slotType="helmet"
                icon={GiShield}
                iconColor="text-blue-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Giáp Ngực"
                slotType="chest"
                icon={GiShield}
                iconColor="text-blue-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Vai Giáp"
                slotType="shoulder"
                icon={GiShield}
                iconColor="text-blue-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Găng Tay"
                slotType="gloves"
                icon={GiShield}
                iconColor="text-blue-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Giày"
                slotType="boots"
                icon={GiShield}
                iconColor="text-blue-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Đai Lưng"
                slotType="belt"
                icon={GiShield}
                iconColor="text-blue-400"
                cultivation={cultivation}
              />
            </div>
          </div>

          {/* Trang Sức */}
          <div>
            <p className="text-xs text-amber-400/70 mb-2 uppercase tracking-wider">Trang Sức</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <WeaponSlot
                slotName="Nhẫn"
                slotType="ring"
                icon={GiGems}
                iconColor="text-yellow-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Dây Chuyền"
                slotType="necklace"
                icon={GiGems}
                iconColor="text-yellow-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Bông Tai"
                slotType="earring"
                icon={GiGems}
                iconColor="text-yellow-400"
                cultivation={cultivation}
              />
              <WeaponSlot
                slotName="Vòng Tay"
                slotType="bracelet"
                icon={GiGems}
                iconColor="text-yellow-400"
                cultivation={cultivation}
              />
            </div>
          </div>

          {/* Linh Khí */}
          <div>
            <p className="text-xs text-amber-400/70 mb-2 uppercase tracking-wider">Linh Khí</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <WeaponSlot
                slotName="Linh Khí"
                slotType="powerItem"
                icon={GiScrollUnfurled}
                iconColor="text-purple-400"
                cultivation={cultivation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default WeaponEquipmentSection;

