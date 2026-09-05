import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Package, ChevronDown, Check, PlusCircle, ArrowRight, Activity, Sparkles } from 'lucide-react';
import { useProduct } from '../context/ProductContext';

export const Navbar = ({ title, subtitle, systemStatus, onMenuClick }) => {
  const { products, selectedProduct, setSelectedProduct, isDemoMode } = useProduct();
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const productRef = useRef(null);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

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
    if (!searchOk) missing.push('Buyer Discovery');
    if (!geminiOk) missing.push('AI Qualification');
    if (!gmailOk) missing.push('Email Outreach');

    if (missing.length === 1) {
      return {
        label: `${missing[0]} Needs Setup`,
        badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20',
        dotClass: 'bg-amber-400',
      };
    }

    return {
      label: 'Attention Required',
      badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20',
      dotClass: 'bg-amber-400',
    };
  };

  const statusDetails = getStatusDetails();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
      if (productRef.current && !productRef.current.contains(e.target)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-[rgba(148,163,184,0.12)] bg-[#050816]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-slate-800/60 transition-colors shrink-0"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="truncate">
          <h1 className="text-sm lg:text-base font-bold text-[#F8FAFC] tracking-tight leading-none truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#94A3B8] mt-1 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Persistent Live vs Demo Workspace Indicator */}
        {isDemoMode ? (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold shadow-sm"
            title="Sample data workflow — no real outreach will be sent"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="hidden sm:inline">DEMO WORKSPACE</span>
            <span className="sm:hidden">DEMO</span>
          </div>
        ) : (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-semibold"
            title="Connected to live production search & email data"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="hidden sm:inline">LIVE WORKSPACE</span>
            <span className="sm:hidden">LIVE</span>
          </div>
        )}

        {/* Global Product Selector Dropdown */}
        <div className="relative" ref={productRef}>
          <button
            type="button"
            onClick={() => setProductDropdownOpen(!productDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B1220] hover:bg-[#111827] border border-[#1E293B] hover:border-purple-500/40 text-xs font-semibold text-[#F8FAFC] transition-all shadow-sm group"
          >
            <div className="w-5 h-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:text-purple-300">
              <Package className="w-3 h-3" />
            </div>
            <span className="text-[#94A3B8] hidden md:inline">Product:</span>
            <span className="font-bold text-purple-300 max-w-[140px] sm:max-w-[200px] truncate">
              {selectedProduct?.name || 'Select Product'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${productDropdownOpen ? 'rotate-180 text-purple-400' : ''}`} />
          </button>

          {productDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-[#0B1220] border border-[#1E293B] shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[#1E293B]">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Export Lines
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {products.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setProductDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg flex items-start justify-between gap-2 transition-all ${
                        isSelected 
                          ? 'bg-purple-600/15 border border-purple-500/30 text-purple-200' 
                          : 'hover:bg-slate-800/50 text-[#F8FAFC] border border-transparent'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="truncate">{prod.name}</span>
                          {prod.active && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        {prod.description && (
                          <p className="text-[10px] text-[#64748B] truncate mt-0.5 max-w-[220px]">
                            {prod.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => {
                    setProductDropdownOpen(false);
                    navigate('/settings?tab=products');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#111827] hover:bg-purple-950/30 text-purple-300 hover:text-purple-200 text-xs font-semibold border border-[#1E293B] hover:border-purple-500/30 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Configure Products Catalog</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic System Status Indicator */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${statusDetails.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusDetails.dotClass} animate-pulse`}></span>
            <span className="hidden sm:inline">{statusDetails.label}</span>
            <span className="sm:hidden">{allOperational ? 'Ready' : 'Attention'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          </button>

          {popoverOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0B1220] border border-[#1E293B] shadow-2xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#1E293B]">
                <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Outreach Readiness</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  allOperational ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {allOperational ? 'Operational' : 'Attention Required'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40 text-slate-300">
                  <span className="text-[#94A3B8] font-medium">Buyer Discovery</span>
                  <span className={`flex items-center gap-1 font-semibold ${searchOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{searchOk ? 'Ready' : 'Setup Required'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800/40 text-slate-300">
                  <span className="text-[#94A3B8] font-medium">AI Qualification</span>
                  <span className={`flex items-center gap-1 font-semibold ${geminiOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{geminiOk ? 'Ready' : 'Setup Required'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span className="text-[#94A3B8] font-medium">Email Outreach</span>
                  <span className={`flex items-center gap-1 font-semibold ${gmailOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span>{gmailOk ? 'Connected' : 'Setup Required'}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1E293B]">
                <Link
                  to="/settings"
                  onClick={() => setPopoverOpen(false)}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center justify-between w-full p-1.5 rounded-lg hover:bg-purple-950/20 transition-all"
                >
                  <span>Manage Outreach Settings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
