import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  Building2, 
  Send, 
  Percent, 
  ArrowUpRight, 
  UploadCloud, 
  Bot, 
  BarChart3,
  RefreshCw
} from 'lucide-react';
import apiService from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import PipelineFunnel from '../components/PipelineFunnel';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Dashboard = () => {
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
      setError(err.response?.data?.detail || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Loading export automation dashboard..." />;

  const metrics = data?.metrics || {};
  const system = data?.system || {};

  const activityColumns = [
    { 
      header: 'Timestamp', 
      accessor: 'timestamp',
      render: (row) => <span className="text-xs text-slate-400">{row.timestamp}</span> 
    },
    { 
      header: 'Buyer / Lead', 
      accessor: 'buyer_name',
      render: (row) => <span className="font-semibold text-white">{row.buyer_name || '—'}</span> 
    },
    { 
      header: 'Company', 
      accessor: 'company',
      render: (row) => <span className="text-slate-300">{row.company || '—'}</span> 
    },
    { 
      header: 'Email', 
      accessor: 'email',
      render: (row) => <code className="text-xs text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">{row.email}</code> 
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} /> 
    },
    { 
      header: 'Mode', 
      accessor: 'mode',
      render: (row) => <span className="text-xs text-slate-400 font-mono">{row.mode}</span> 
    }
  ];

  return (
    <div className="space-y-6">
      <Notification type="error" message={error} onClose={() => setError('')} />

      {/* Funnel Pipeline */}
      <PipelineFunnel stats={metrics} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Leads"
          value={metrics.total_leads || 0}
          subtext="Imported via CSV/Search"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Valid Emails"
          value={metrics.valid_emails || 0}
          subtext={`${metrics.invalid_emails || 0} invalid / missing`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Business Leads"
          value={metrics.business_leads || 0}
          subtext="B2B Wholesale / Studios"
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Emails Sent"
          value={metrics.successful_sends || 0}
          subtext={`${metrics.failed_sends || 0} failed / ${metrics.skipped_leads || 0} skipped`}
          icon={Send}
          color="amber"
        />
        <StatCard
          title="Success Rate"
          value={`${metrics.success_rate || 0}%`}
          subtext="Successful / Attempted"
          icon={Percent}
          color="cyan"
        />
      </div>

      {/* Quick Actions & System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">🚀 Quick Pipeline Workflows</h2>
            <p className="text-xs text-slate-400 mb-4">Execute next action in the Singing Bowls export lead cycle.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/upload"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Upload Leads</div>
                  <div className="text-[11px] text-slate-400">Ingest CSV dataset</div>
                </div>
              </Link>

              <Link
                to="/classify"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">AI Classify</div>
                  <div className="text-[11px] text-slate-400">Segment B2B contacts</div>
                </div>
              </Link>

              <Link
                to="/send"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Launch Campaign</div>
                  <div className="text-[11px] text-slate-400">Safe email outreach</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Engine Status Card */}
        <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">🛡️ Engine Status</h2>
            <button 
              onClick={fetchDashboard}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c]">
              <span className="text-slate-400 font-medium">Email Dispatch Mode:</span>
              <StatusBadge status={system.email_mode === 'SMTP' ? 'sent' : 'demo_sent'} text={system.email_mode} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c]">
              <span className="text-slate-400 font-medium">Classification AI:</span>
              <StatusBadge status={system.has_gemini_key ? 'valid' : 'individual'} text={system.classifier_mode} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-[#222f4c]">
              <span className="text-slate-400 font-medium">Export Catalog (PDF):</span>
              <StatusBadge status="valid" text="Ready (Attached)" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">📜 Recent Outreach Activity</h2>
            <p className="text-xs text-slate-400">Real-time audit log from data/sent_log.csv</p>
          </div>
          <Link
            to="/reports"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View Full Report</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={activityColumns}
          data={metrics.recent_activity || []}
          emptyMessage="No campaign send events logged yet. Load demo data and run your first outreach campaign!"
        />
      </div>
    </div>
  );
};

export default Dashboard;
