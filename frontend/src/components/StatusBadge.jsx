import React from 'react';

export const StatusBadge = ({ status, text }) => {
  const normalized = (status || text || '').toString().toLowerCase();

  let styles = 'bg-slate-800/80 text-slate-300 border-slate-700';

  if (['valid', 'sent', 'business', 'connected', 'qualified', 'operational'].includes(normalized)) {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (['individual', 'custom'].includes(normalized)) {
    styles = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  } else if (['invalid', 'failed', 'unqualified'].includes(normalized)) {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  } else if (['missing', 'skipped_duplicate', 'skipped', 'needs_review', 'review'].includes(normalized)) {
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else if (['test', 'smtp_test', 'demo'].includes(normalized)) {
    styles = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  } else if (['ready', 'active', 'healthy', 'live'].includes(normalized)) {
    styles = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  } else if (['pending'].includes(normalized)) {
    styles = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${styles} capitalize tracking-wide`}>
      {text || status}
    </span>
  );
};

export default StatusBadge;
