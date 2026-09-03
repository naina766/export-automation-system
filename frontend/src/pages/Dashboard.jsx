import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  Building2, 
  Send, 
  Percent, 
  ArrowUpRight, 
  UploadCloud, 
  BarChart3, 
  Globe, 
  Sparkles, 
  FileText, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  AlertCircle, 
  Layers, 
  ArrowRight,
  Zap,
  MailCheck,
  CheckCircle2,
  Search
} from 'lucide-react';
import apiService from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import PipelineFunnel from '../components/PipelineFunnel';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard metrics & performance data..." />;
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-[#131b2e] border border-rose-500/30 text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Unable to Load Dashboard</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const hygiene = metrics.data_hygiene || {};
  const segments = metrics.buyer_segments || [];
  const recentLogs = metrics.recent_activity || [];

  // Production campaign stats (strictly separate from test SMTP sends)
  const prodAttempts = metrics.emails_attempted || 0;
  const prodSends = metrics.successful_sends || 0;
  const testSends = metrics.test_sends || 0;

  // Format success rate gracefully (Requirement 4)
  const hasCampaignAttempts = prodAttempts > 0;
  const successRateDisplay = hasCampaignAttempts && metrics.success_rate !== null ? `${metrics.success_rate}%` : '—';
  const successRateSubtext = hasCampaignAttempts ? `${prodSends} sent / ${prodAttempts} attempted` : 'No campaign attempts yet';

  // Format Emails Sent subtext (Requirement 3)
  const emailsSentSubtext = testSends > 0 
    ? `${testSends} test dispatch${testSends > 1 ? 'es' : ''} verified`
    : 'Dispatched via Gmail SMTP';

  // Data hygiene note (Requirement 7)
  const invalidTotal = (hygiene.invalid_emails || 0) + (hygiene.missing_emails || 0);
  const hygieneStatusNote = invalidTotal === 0 
    ? 'All contacts are ready for outreach.' 
    : 'Review invalid contacts before launching outreach.';

  const activityColumns = [
    { 
      header: 'Timestamp', 
      accessor: 'timestamp',
      render: (row) => <span className="text-xs text-slate-400 font-mono">{row.timestamp || '—'}</span> 
    },
    { 
      header: 'Buyer / Recipient', 
      accessor: 'buyer_name',
      render: (row) => <span className="font-semibold text-white">{row.buyer_name || 'Valued Partner'}</span> 
    },
    { 
      header: 'Company', 
      accessor: 'company',
      render: (row) => <span className="text-slate-300">{row.company || '—'}</span> 
    },
    { 
      header: 'Email', 
      accessor: 'email',
      render: (row) => (
        <code className="text-xs text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50 font-mono">
          {row.email}
        </code> 
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => {
        const isTest = row.is_test || row.classification === 'custom' || (row.mode && row.mode.includes('TEST'));
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.status} />
            {isTest && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                TEST
              </span>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Campaign / Event', 
      accessor: 'campaign',
      render: (row) => (
        <span className="text-xs text-slate-300">
          {row.campaign || (row.is_test ? 'SMTP Test' : 'Export Outreach')}
        </span>
      ) 
    }
  ];

  return (
    <div className="space-y-5">
      {/* Executive Hero Banner with Animated Subtle Gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] p-6 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-cyan-500/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              <span>B2B Export Intelligence</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] tracking-tight">
              Himalayan Singing Bowls Export Outreach
            </h2>
            <p className="text-xs sm:text-sm font-medium text-blue-400/90 mt-1">
              Discover → Qualify → Personalize → Engage
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/discover"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Discover Buyers</span>
            </Link>
            <Link
              to="/send"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#080D1D] hover:bg-slate-800 text-[#F8FAFC] text-xs font-bold border border-[rgba(148,163,184,0.16)] shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Launch Campaign</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Core Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Leads"
          value={metrics.total_buyers_discovered ?? metrics.total_leads ?? 0}
          subtext="Discovered from live search"
          icon={Search}
          color="blue"
        />
        <StatCard
          title="Qualified Buyers"
          value={metrics.ai_qualified_buyers ?? metrics.qualified_buyers ?? metrics.business_leads ?? 0}
          subtext="Wholesale & studio targets"
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Valid Contacts"
          value={metrics.valid_contact_emails ?? metrics.valid_emails ?? 0}
          subtext="Verified syntax & domain"
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Emails Sent"
          value={prodSends}
          subtext={emailsSentSubtext}
          icon={Send}
          color="amber"
        />
        <StatCard
          title="Success Rate"
          value={successRateDisplay}
          subtext={successRateSubtext}
          icon={Percent}
          color="cyan"
        />
        <StatCard
          title="Campaigns"
          value={metrics.campaigns_count || 0}
          subtext="Active campaigns"
          icon={BarChart3}
          color="teal"
        />
      </div>

      {/* Visual Pipeline Funnel */}
      <PipelineFunnel stats={metrics} />

      {/* Two-Column Middle Section: Buyer Segments (Left) & Data Hygiene (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Buyer Segments Breakdown (Adaptive height, no giant whitespace) */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#222f4c]/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Buyer Segment Breakdown</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Real Classified Distribution</span>
          </div>

          {segments.length > 0 ? (
            <div className="space-y-3 pt-1">
              {segments.map((seg, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">{seg.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">{seg.count} lead{seg.count > 1 ? 's' : ''}</span>
                      <span className="font-bold text-white text-xs">{seg.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#0b0f19] rounded-full h-2 overflow-hidden border border-[#222f4c]/50">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, seg.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-center space-y-2">
              <Sparkles className="w-7 h-7 text-slate-500 mx-auto" />
              <div className="text-xs font-bold text-white">No Classified Buyers Yet</div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Run AI lead qualification to segment your imported contacts into commercial wholesale targets.
              </p>
              <button
                onClick={() => navigate('/classify')}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5 mt-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Go to AI Qualification</span>
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-[#222f4c]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Focus: <b>Wholesale Importers & Distributors</b></span>
            <Link to="/classify" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
              <span>Inspect Leads</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right Column: Data Hygiene (Requirement 7) */}
        <div className="lg:col-span-5 bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#222f4c]/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Data Hygiene</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Quality Guardrails</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Valid Contacts</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{hygiene.valid_contacts ?? metrics.valid_emails ?? 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Duplicates Removed</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">{hygiene.duplicates_removed ?? metrics.duplicates ?? 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Invalid Format</div>
              <div className="text-base font-bold text-rose-400 mt-0.5">{hygiene.invalid_emails ?? metrics.invalid_emails ?? 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Missing Emails</div>
              <div className="text-base font-bold text-slate-400 mt-0.5">{hygiene.missing_emails ?? metrics.missing_emails ?? 0}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#222f4c]/60 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 leading-tight">
              {hygieneStatusNote}
            </span>
            <button
              onClick={() => navigate('/upload')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold whitespace-nowrap transition-all"
            >
              Review Invalid Leads
            </button>
          </div>
        </div>
      </div>

      {/* Recent Campaign Activity Table (Requirement 11) */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#222f4c]/60">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Campaign Activity</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Real delivery & verification records from sent_log.csv</p>
          </div>
          <Link
            to="/reports"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Full Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentLogs.length > 0 ? (
          <DataTable
            columns={activityColumns}
            data={recentLogs}
            emptyMessage="No campaign activity recorded yet."
          />
        ) : (
          <div className="p-6 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-center space-y-2">
            <Send className="w-7 h-7 text-slate-500 mx-auto" />
            <div className="text-xs font-bold text-white">No Campaign Activity Yet</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Your dispatched outreach emails will appear here with live timestamps and delivery statuses.
            </p>
            <button
              onClick={() => navigate('/send')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5 mt-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Workflow + Export Catalog Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Quick Actions (Requirement 13) */}
        <div className="lg:col-span-8 bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 shadow-sm space-y-3">
          <div className="pb-1 border-b border-[#222f4c]/60">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Outreach Workflow</h3>
            <p className="text-[11px] text-slate-400">Guided chronological progression from discovery to reporting.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <Link
              to="/discover"
              className="flex flex-col justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">1. Discover</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Find buyers</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            <Link
              to="/upload"
              className="flex flex-col justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">2. Upload</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Import CSV</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            <Link
              to="/classify"
              className="flex flex-col justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">3. Classify</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>AI segment</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            <Link
              to="/send"
              className="flex flex-col justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">4. Send</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Gmail outreach</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex flex-col justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c] hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">5. Reports</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>View results</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>
        </div>

        {/* Export Product Catalog (Requirement 12) */}
        <div className="lg:col-span-4 bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#222f4c]/60">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Export Product Catalog</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PDF Ready
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Himalayan Singing Bowls wholesale presentation attached automatically to outreach campaigns.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={apiService.getCatalogUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>View Catalog</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={apiService.getCatalogUrl()}
              download="Himalayan_Singing_Bowls_Export_Catalog.pdf"
              className="py-1.5 px-3 rounded-lg bg-[#0b0f19] hover:bg-slate-800 text-slate-300 border border-[#222f4c] text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
