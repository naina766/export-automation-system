import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Bot, 
  Send, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  Sparkles,
  X
} from 'lucide-react';

export const Sidebar = ({ systemStatus, isOpen, onClose }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Lead Upload', path: '/upload', icon: UploadCloud },
    { name: 'AI Classification', path: '/classify', icon: Bot },
    { name: 'Send Campaign', path: '/send', icon: Send },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const emailMode = systemStatus?.email_mode || 'DEMO';
  const classifierMode = systemStatus?.classifier_mode || 'DEMO CLASSIFIER';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50
        w-64 bg-[#080c14] border-r border-[#222f4c] flex flex-col justify-between
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header / Brand */}
        <div>
          <div className="flex items-center justify-between p-5 border-b border-[#222f4c]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
                SB
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">EXPORT AUTO</div>
                <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Singing Bowls B2B</div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                    ${isActive 
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Mode Badges */}
        <div className="p-4 border-t border-[#222f4c] space-y-2 bg-[#0b0f19]/40">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#131b2e] border border-[#222f4c]">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Email Engine:</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${emailMode === 'SMTP' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
              {emailMode}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#131b2e] border border-[#222f4c]">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Classifier:</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 truncate max-w-[90px]">
              {classifierMode}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
