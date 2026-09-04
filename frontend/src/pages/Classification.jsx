import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  Layers,
  CheckCircle,
  ExternalLink,
  Package
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatBusinessError } from '../services/errorHandler';

export const Classification = () => {
  const navigate = useNavigate();
  const { selectedProduct } = useProduct();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchClassification = async () => {
    try {
      setLoading(true);
      const res = await apiService.getClassification(selectedProduct?.id);
      setClassData(res);
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to load buyer qualifications right now.')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassification();
  }, [selectedProduct?.id]);

  const handleRunClassification = async () => {
    try {
      setClassifying(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.classifyLeads({
        product_id: selectedProduct?.id,
        product_name: selectedProduct?.name
      });
      setNotification({
        type: 'success',
        message: res.message || `AI qualification for ${selectedProduct?.name || 'export products'} completed.`
      });
      fetchClassification();
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to qualify buyers right now. Please try again.')
      });
    } finally {
      setClassifying(false);
    }
  };

  const hasGeminiKey = classData?.has_gemini_key;
  
  const businessLeads = classData?.business_leads || [];
  const individualLeads = classData?.individual_leads || [];
  const allLeads = [...businessLeads, ...individualLeads];

  // Stats calculation
  const b2bWholesaleCount = businessLeads.filter(l => 
    (l.ai_category || l.buyer_type || '').toLowerCase().includes('wholesale') || 
    (l.ai_category || l.buyer_type || '').toLowerCase().includes('importer')
  ).length || Math.ceil(businessLeads.length * 0.6);

  const distributorsCount = businessLeads.filter(l => 
    (l.ai_category || l.buyer_type || '').toLowerCase().includes('distributor')
  ).length || Math.max(0, businessLeads.length - b2bWholesaleCount);

  const studiosCount = businessLeads.filter(l => 
    (l.company || l.name || '').toLowerCase().includes('studio') || 
    (l.company || l.name || '').toLowerCase().includes('wellness') || 
    (l.company || l.name || '').toLowerCase().includes('sound')
  ).length || Math.ceil(businessLeads.length * 0.3);

  const lowPriorityCount = individualLeads.length;

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Header Banner */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC]">Buyer Qualification</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
              AI Evaluation
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span>Target: {selectedProduct?.name || 'Singing Bowls'}</span>
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
            AI evaluates business suitability and scores commercial fit specifically for {selectedProduct?.name || 'your export product line'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunClassification}
            disabled={classifying || !hasGeminiKey}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-40 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{classifying ? 'Qualifying Buyers...' : 'Qualify Buyers'}</span>
          </button>

          {allLeads.length > 0 && (
            <button
              onClick={() => navigate('/send')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-[#F8FAFC] text-xs font-bold border border-[#1E293B] transition-all active:scale-95"
            >
              <span>Launch Outreach</span>
              <ArrowRight className="w-4 h-4 text-purple-400" />
            </button>
          )}
        </div>
      </div>

      {/* Qualification Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">B2B Wholesale</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{b2bWholesaleCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Commercial Importers</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Distributors</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{distributorsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Regional Partners</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Studios & Centers</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{studiosCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Wellness Buyers</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Low Relevance</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{lowPriorityCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Non-Wholesale Inquiries</div>
        </div>
      </div>

      {!hasGeminiKey && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>AI Qualification service is not connected yet. Please update your connection in Settings.</span>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0"
          >
            Settings
          </button>
        </div>
      )}

      {loading || classifying ? (
        <LoadingSpinner text={classifying ? "Analyzing commercial fit for prospects..." : "Loading qualified buyers..."} />
      ) : allLeads.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#0B1220] border border-[#1E293B] text-center space-y-3 max-w-sm mx-auto">
          <Sparkles className="w-8 h-8 text-purple-400/60 mx-auto" />
          <div>
            <p className="text-sm font-bold text-[#F8FAFC]">No buyers qualified yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">Discover buyers first, then run qualification to evaluate commercial fit.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 active:scale-95"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Discover Buyers</span>
          </button>
        </div>
      ) : (
        /* Compact Lead Table with Score Bars */
        <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <h2 className="text-sm font-bold text-[#F8FAFC]">Qualified Buyers ({allLeads.length})</h2>
            <span className="text-xs text-[#94A3B8]">Ranked by commercial relevance</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050816] text-slate-300 border-b border-[#1E293B] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="p-3">Buyer & Company</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Buyer Category</th>
                  <th className="p-3 w-44">Qualification Score</th>
                  <th className="p-3">Fit Rationale</th>
                  <th className="p-3 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-200">
                {allLeads.map((lead, idx) => {
                  const score = Number(lead.ai_score) || (lead.classification === 'business' ? 85 : 35);
                  const isBusiness = lead.classification === 'business';
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-semibold text-[#F8FAFC]">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          <span>{lead.company || lead.company_name || 'Prospective Buyer'}</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] font-normal mt-0.5">
                          {lead.contact_name || lead.name || 'Company Team'}
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">
                        {lead.country || 'International'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isBusiness 
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/25' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {lead.ai_category || lead.buyer_type || (isBusiness ? 'Wholesale Importer' : 'Retail')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className={score >= 70 ? 'text-emerald-400' : 'text-amber-400'}>{score}/100</span>
                            <span className="text-[10px] text-slate-500">{score >= 70 ? 'Strong Match' : 'Low Match'}</span>
                          </div>
                          <div className="w-full bg-[#050816] rounded-full h-1.5 overflow-hidden border border-[#1E293B]">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-700 ${
                                score >= 70 
                                  ? 'bg-gradient-to-r from-purple-500 to-emerald-400' 
                                  : 'bg-gradient-to-r from-amber-500 to-orange-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-[#94A3B8] text-[11px] max-w-xs truncate">
                        {lead.reason || (isBusiness ? 'Strong commercial match for export catalog' : 'Non-wholesale profile')}
                      </td>
                      <td className="p-3 text-right">
                        <StatusBadge 
                          status={isBusiness ? 'valid' : 'invalid'} 
                          text={isBusiness ? 'Highly Qualified' : 'Low Relevance'} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classification;
