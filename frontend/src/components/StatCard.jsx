import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-[#3B82F6] border-blue-500/20 bg-blue-500/10',
    emerald: 'text-[#10B981] border-emerald-500/20 bg-emerald-500/10',
    purple: 'text-[#8B5CF6] border-purple-500/20 bg-purple-500/10',
    amber: 'text-[#F59E0B] border-amber-500/20 bg-amber-500/10',
    rose: 'text-rose-400 border-rose-500/20 bg-rose-500/10',
    cyan: 'text-[#06B6D4] border-cyan-500/20 bg-cyan-500/10',
    teal: 'text-teal-400 border-teal-500/20 bg-teal-500/10',
  };

  const accentColor = colorMap[color] || colorMap.blue;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 hover:border-blue-500/30 transition-colors shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap truncate">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border ${accentColor} flex-shrink-0 ml-1`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl lg:text-3xl font-bold text-[#F8FAFC] tracking-tight">{value}</div>
        {subtext && <div className="text-[11px] text-[#94A3B8] mt-1 truncate">{subtext}</div>}
      </div>
    </motion.div>
  );
};

export default StatCard;
