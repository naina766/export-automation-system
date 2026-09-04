import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Binary, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  BarChart3, 
  Check, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export const PipelineStepper = ({ currentStage = 1, stats = {} }) => {
  const pipeline = stats.pipeline_stages || {};

  const stages = [
    {
      step: 1,
      title: 'Buyer Discovery',
      count: stats.total_leads ?? pipeline.discovery ?? 0,
      suffix: 'found',
      icon: Search,
      path: '/discover'
    },
    {
      step: 2,
      title: 'Extraction',
      count: stats.websites_processed ?? stats.total_leads ?? 0,
      suffix: 'extracted',
      icon: Binary,
      path: '/discover'
    },
    {
      step: 3,
      title: 'Validation',
      count: stats.valid_emails ?? pipeline.validation ?? 0,
      suffix: 'valid',
      icon: ShieldCheck,
      path: '/discover'
    },
    {
      step: 4,
      title: 'AI Classification',
      count: stats.qualified_buyers ?? stats.business_leads ?? pipeline.qualification ?? 0,
      suffix: 'qualified',
      icon: Sparkles,
      path: '/classify'
    },
    {
      step: 5,
      title: 'Gmail Campaign',
      count: stats.successful_sends ?? stats.sent_emails ?? pipeline.outreach ?? 0,
      suffix: 'sent',
      icon: Send,
      path: '/send'
    },
    {
      step: 6,
      title: 'Tracking & Reports',
      count: stats.total_campaigns ?? 1,
      suffix: 'reports',
      icon: BarChart3,
      path: '/reports'
    }
  ];

  return (
    <div className="bg-[#0B1220]/90 backdrop-blur border border-[#1E293B] rounded-2xl p-4 mb-6 shadow-lg shadow-black/20 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[860px] gap-2">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          const isCompleted = currentStage > st.step;
          const isCurrent = currentStage === st.step;
          const isPending = currentStage < st.step;

          return (
            <React.Fragment key={st.step}>
              <div 
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl border flex-1 transition-all duration-200
                  ${isCurrent 
                    ? 'bg-purple-600/15 border-purple-500/50 text-purple-300 shadow-[0_0_15px_-3px_rgba(124,58,237,0.3)]' 
                    : isCompleted 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-slate-900/40 border-[#1E293B] text-slate-400 opacity-70'}
                `}
              >
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border
                  ${isCurrent 
                    ? 'bg-purple-600 text-white border-purple-400' 
                    : isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'}
                `}>
                  {isCompleted ? <Check className="w-4 h-4 text-emerald-400" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase truncate">
                      Stage {st.step}
                    </span>
                    {isCompleted && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        DONE
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                    {st.title}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                    <span className={`font-bold ${isCurrent ? 'text-purple-300' : isCompleted ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {st.count}
                    </span> {st.suffix}
                  </div>
                </div>
              </div>

              {idx < stages.length - 1 && (
                <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 ${isCompleted ? 'text-emerald-500/60' : 'text-slate-600'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStepper;
