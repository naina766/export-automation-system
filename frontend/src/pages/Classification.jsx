import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Building2, 
  User, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import apiService from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

export const Classification = () => {
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchClassification = async () => {
    try {
      setLoading(true);
      const res = await apiService.getClassification();
      setClassData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassification();
  }, []);

  const handleRunClassification = async () => {
    try {
      setClassifying(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.classifyLeads();
      setNotification({
        type: 'success',
        message: `[${res.mode}] ${res.message}`
      });
      fetchClassification();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Classification failed.'
      });
    } finally {
      setClassifying(false);
    }
  };

  const businessColumns = [
    {
      header: 'Buyer Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-white">{row.name || '—'}</span>,
    },
    {
      header: 'Company Name',
      accessor: 'company',
      render: (row) => <span className="text-slate-300 font-medium">{row.company}</span>,
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (row) => <code className="text-xs text-blue-300 font-mono">{row.email}</code>,
    },
    {
      header: 'Country',
      accessor: 'country',
      render: (row) => <span className="text-slate-300">{row.country || '—'}</span>,
    },
    {
      header: 'AI Confidence',
      accessor: 'confidence',
      render: (row) => (
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
          {Math.round((parseFloat(row.confidence) || 0.85) * 100)}%
        </span>
      ),
    },
    {
      header: 'Rationale',
      accessor: 'reason',
      render: (row) => <span className="text-xs text-slate-400 truncate max-w-xs block">{row.reason || 'B2B commercial match'}</span>,
    },
  ];

  const individualColumns = [
    {
      header: 'Buyer Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-white">{row.name || '—'}</span>,
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (row) => <code className="text-xs text-purple-300 font-mono">{row.email}</code>,
    },
    {
      header: 'Country',
      accessor: 'country',
      render: (row) => <span className="text-slate-300">{row.country || '—'}</span>,
    },
    {
      header: 'AI Confidence',
      accessor: 'confidence',
      render: (row) => (
        <span className="text-xs font-bold text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/50">
          {Math.round((parseFloat(row.confidence) || 0.75) * 100)}%
        </span>
      ),
    },
    {
      header: 'Rationale',
      accessor: 'reason',
      render: (row) => <span className="text-xs text-slate-400 truncate max-w-xs block">{row.reason || 'Personal / retail buyer'}</span>,
    },
  ];

  const mode = classData?.mode || 'DEMO FALLBACK MODE';
  const hasGeminiKey = classData?.has_gemini_key;

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Hero Control Card */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white">🤖 AI Lead Segmentation Engine</h2>
            <StatusBadge 
              status={hasGeminiKey ? 'valid' : 'missing'} 
              text={mode} 
            />
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Automatically categorizes imported leads into high-priority <b>B2B Wholesalers & Distributors</b> vs <b>Individual Retail Consumers</b> using structured semantic evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunClassification}
            disabled={classifying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{classifying ? 'Running AI Classification...' : 'Run Lead Classification'}</span>
          </button>

          {((classData?.business_count || 0) > 0 || (classData?.individual_count || 0) > 0) && (
            <button
              onClick={() => navigate('/send')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <span>Send Campaign</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!hasGeminiKey && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <b>Demo Fallback Mode Active:</b> Gemini API key is not set in <code>.env</code>. The pipeline uses intelligent rule-based heuristics (commercial keywords, corporate email domains, entity presence) to segment leads reliably without crashing.
          </div>
        </div>
      )}

      {loading || classifying ? (
        <LoadingSpinner text={classifying ? "Classifying buyer leads with AI..." : "Loading classification tables..."} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Leads Section */}
          <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Business Leads ({classData?.business_count || 0})</h3>
                  <p className="text-[11px] text-slate-400">Persisted in data/business_emails.csv</p>
                </div>
              </div>
              <StatusBadge status="business" text="B2B Wholesale" />
            </div>

            <DataTable
              columns={businessColumns}
              data={classData?.business_leads || []}
              emptyMessage="No B2B business leads classified yet. Click 'Run Lead Classification'."
            />
          </div>

          {/* Individual Leads Section */}
          <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Individual Leads ({classData?.individual_count || 0})</h3>
                  <p className="text-[11px] text-slate-400">Persisted in data/individual_emails.csv</p>
                </div>
              </div>
              <StatusBadge status="individual" text="Retail / Consumer" />
            </div>

            <DataTable
              columns={individualColumns}
              data={classData?.individual_leads || []}
              emptyMessage="No individual leads classified yet. Click 'Run Lead Classification'."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Classification;
