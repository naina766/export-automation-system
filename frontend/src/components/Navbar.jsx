import React from 'react';
import { Menu, Globe, Package, Zap } from 'lucide-react';

export const Navbar = ({ title, subtitle, searchKeyword, onMenuClick }) => {
  return (
    <header className="h-16 border-b border-[#222f4c] bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base lg:text-lg font-bold text-white tracking-tight leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#131b2e] border border-[#222f4c] text-xs font-semibold text-slate-300">
          <Package className="w-3.5 h-3.5 text-blue-400" />
          <span>Product: <b className="text-white">{searchKeyword || 'Singing Bowls'}</b></span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <Zap className="w-3.5 h-3.5" />
          <span>Pipeline Active</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
