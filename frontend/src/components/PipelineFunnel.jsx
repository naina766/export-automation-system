import React from 'react';
import { Search, CheckCheck, Bot, FileText, Send, ArrowRight } from 'lucide-react';

export const PipelineFunnel = ({ stats = {} }) => {
  const stages = [
    {
      id: 1,
      label: 'Discovered',
      count: stats.total_leads || 0,
      icon: Search,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      id: 2,
      label: 'Validated',
      count: stats.valid_emails || 0,
      icon: CheckCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 3,
      label: 'Classified',
      count: (stats.business_leads || 0) + (stats.individual_leads || 0),
      icon: Bot,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 4,
      label: 'Target Pool',
      count: stats.business_leads || 0,
      sublabel: 'B2B Priority',
      icon: FileText,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 5,
      label: 'Contacted',
      count: stats.successful_sends || 0,
      icon: Send,
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
    },
  ];

  return (
    <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 mb-6 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between min-w-[700px] gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <React.Fragment key={stage.id}>
              <div className="flex items-center gap-3 bg-[#0b0f19]/60 px-4 py-3 rounded-lg border border-[#222f4c] flex-1">
                <div className={`p-2 rounded-lg border ${stage.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stage.label}</div>
                  <div className="text-lg font-bold text-white leading-tight mt-0.5">
                    {stage.count}
                    {stage.sublabel && <span className="text-[10px] text-slate-400 font-normal ml-1.5 font-sans">({stage.sublabel})</span>}
                  </div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineFunnel;
