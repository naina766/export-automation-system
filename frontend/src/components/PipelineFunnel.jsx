import React from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCheck, Sparkles, Send, ArrowRight, MailCheck } from 'lucide-react';

export const PipelineFunnel = ({ stats = {} }) => {
  const pipeline = stats.pipeline_stages || {};

  const stages = [
    {
      id: 1,
      label: 'Discovery',
      count: `${pipeline.discovery ?? stats.total_leads ?? 0} leads`,
      icon: Search,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      id: 2,
      label: 'Validation',
      count: `${pipeline.validation ?? stats.valid_emails ?? 0} valid`,
      icon: CheckCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 3,
      label: 'AI Qualification',
      count: `${pipeline.qualification ?? stats.business_leads ?? stats.qualified_buyers ?? 0} qualified`,
      icon: Sparkles,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 4,
      label: 'Campaign Ready',
      count: `${pipeline.campaign_ready ?? stats.campaign_ready ?? 0} ready`,
      icon: MailCheck,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 5,
      label: 'Gmail Outreach',
      count: `${pipeline.outreach ?? stats.successful_sends ?? 0} sent`,
      icon: Send,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
  ];

  return (
    <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-xl p-5 mb-6 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between min-w-[760px] gap-2.5">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <React.Fragment key={stage.id}>
              <motion.div 
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 bg-[#080D1D] px-3.5 py-3 rounded-lg border border-[rgba(148,163,184,0.12)] flex-1"
              >
                <div className={`p-2 rounded-lg border flex-shrink-0 ${stage.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider truncate">
                    {stage.label}
                  </div>
                  <motion.div 
                    key={stage.count}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs font-bold text-[#F8FAFC] leading-tight mt-0.5 truncate"
                  >
                    {stage.count}
                  </motion.div>
                </div>
              </motion.div>
              {idx < stages.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineFunnel;
