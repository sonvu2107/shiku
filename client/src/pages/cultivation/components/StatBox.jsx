/**
 * StatBox Component - Display stat label and value
 */
import { memo } from 'react';

const StatBox = memo(function StatBox({ label, value }) {
  return (
    <div className="bg-black/40 border border-white/10 p-4 lg:p-5 rounded-xl text-center relative overflow-hidden group hover:border-purple-500/30 transition-all">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50"></div>
      <p className="text-xs lg:text-sm text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <h3 className="text-xl lg:text-2xl font-bold text-slate-100 font-mono">
        {value}
      </h3>
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50"></div>
    </div>
  );
});

export default StatBox;

