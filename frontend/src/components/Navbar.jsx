import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Package, ChevronDown, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

export const Navbar = ({ title, subtitle, searchKeyword, systemStatus, onMenuClick }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef(null);

  const searchOk = Boolean(systemStatus?.search_configured);
  const geminiOk = Boolean(systemStatus?.gemini_configured);
  const gmailOk = Boolean(systemStatus?.gmail_configured);
  const allOperational = searchOk && geminiOk && gmailOk;

  // Compute dynamic status text and badge style
  const getStatusDetails = () => {
    if (allOperational) {
      return {
        label: 'All Systems Operational',
        badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
        dotClass: 'bg-emerald-400',
      };
    }
    
    const missing = [];
    if (!searchOk) missing.push('Search API');
    if (!geminiOk) missing.push('Gemini AI');
    if (!gmailOk) missing.push('Gmail SMTP');

    if (missing.length === 1) {
      return {
        label: `${missing[0]} Not Configured`,
        badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20',
        dotClass: 'bg-amber-400',
      };
    }

    return {
      label: `${missing.length} Configurations Required`,
      badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20',
      dotClass: 'bg-amber-400',
    };
  };

  const statusDetails = getStatusDetails();

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-[rgba(148,163,184,0.12)] bg-[#050816]/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-slate-800/60 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm lg:text-base font-bold text-[#F8FAFC] tracking-tight leading-none">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#94A3B8] mt-1">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[rgba(148,163,184,0.12)] text-xs font-semibold text-[#94A3B8]">
          <Package className="w-3.5 h-3.5 text-blue-400" />
          <span>Product: <b className="text-[#F8FAFC]">Himalayan Sound Healing Bowls</b></span>
        </div>

        {/* Dynamic System Status Indicator */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${statusDetails.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusDetails.dotClass} animate-pulse`}></span>
            <span>{statusDetails.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          </button>

          {popoverOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.16)] shadow-2xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-[rgba(148,163,184,0.12)]">
                <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Infrastructure Status</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  allOperational ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {allOperational ? 'Operational' : 'Action Required'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40 text-slate-300">
                  <span className="text-[#94A3B8] font-medium">Search Provider</span>
                  <span className={`flex items-center gap-1 font-semibold ${searchOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{searchOk ? '✓ Connected' : '⚠ Not Configured'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/40 text-slate-300">
                  <span className="text-[#94A3B8] font-medium">Gemini AI</span>
                  <span className={`flex items-center gap-1 font-semibold ${geminiOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{geminiOk ? '✓ Connected' : '⚠ Not Configured'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span className="text-[#94A3B8] font-medium">Gmail SMTP</span>
                  <span className={`flex items-center gap-1 font-semibold ${gmailOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{gmailOk ? '✓ Connected' : '⚠ Not Configured'}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[rgba(148,163,184,0.12)]">
                <Link
                  to="/settings"
                  onClick={() => setPopoverOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-[#080D1D] hover:bg-slate-800/80 text-blue-400 hover:text-blue-300 text-xs font-semibold border border-[rgba(148,163,184,0.12)] transition-all"
                >
                  <span>Manage in System Health</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
