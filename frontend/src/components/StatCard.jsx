import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
    amber: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    rose: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
    cyan: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
  };

  const accentColor = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 hover:border-slate-600 transition-all duration-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${accentColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{value}</div>
        {subtext && <div className="text-xs text-slate-400 mt-1.5">{subtext}</div>}
      </div>
    </div>
  );
};

export default StatCard;
