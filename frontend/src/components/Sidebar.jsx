import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Globe, 
  UploadCloud, 
  Bot, 
  Send, 
  BarChart3, 
  Settings as SettingsIcon, 
  X,
  Package
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Discover Buyers', path: '/discover', icon: Globe },
    { name: 'Import Leads', path: '/upload', icon: UploadCloud },
    { name: 'AI Classification', path: '/classify', icon: Bot },
    { name: 'Send Campaign', path: '/send', icon: Send },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50
        w-64 bg-[#0B1220] border-r border-[#1E293B] flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="flex items-center justify-between p-5 border-b border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-purple-600/25">
                EA
              </div>
              <div>
                <div className="text-sm font-bold text-[#F8FAFC] tracking-tight">EXPORT AUTO</div>
                <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Multi-Product B2B</div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="lg:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-slate-800/60 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200
                    ${isActive 
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_-3px_rgba(124,58,237,0.25)] font-bold' 
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04] border border-transparent'}
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Minimal Footer */}
        <div className="p-4 border-t border-[#1E293B] text-[11px] text-[#94A3B8] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Enterprise Engine</span>
          </span>
          <span className="font-mono text-[10px] text-slate-500">v2.1</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
