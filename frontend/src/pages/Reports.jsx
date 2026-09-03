import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Users, 
  CheckCircle2, 
  Building2, 
  Send, 
  Percent, 
  AlertCircle,
  FileSpreadsheet,
  PieChart
} from 'lucide-react';
import apiService from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Reports = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiService.getReport();
      setMetrics(res.metrics || {});
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to load report data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await apiService.downloadReport();
      setNotification({ type: 'success', message: 'CSV Report downloaded successfully.' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to download CSV report.' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Generating campaign analytics..." />;

  const activityColumns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (row) => <span className="text-xs text-slate-400 font-mono">{row.timestamp}</span>,
    },
    {
      header: 'Buyer Name',
      accessor: 'buyer_name',
      render: (row) => <span className="font-semibold text-white">{row.buyer_name || '—'}</span>,
    },
    {
      header: 'Company',
      accessor: 'company',
      render: (row) => <span className="text-slate-300">{row.company || '—'}</span>,
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (row) => <code className="text-xs text-blue-300 font-mono">{row.email}</code>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Mode',
      accessor: 'mode',
      render: (row) => <span className="text-xs font-mono text-slate-400">{row.mode}</span>,
    },
    {
      header: 'Error / Details',
      accessor: 'error',
      render: (row) => <span className="text-xs text-rose-400 truncate max-w-xs block">{row.error || '—'}</span>,
    },
  ];

  const total = metrics.total_leads || 1;
  const bizPct = Math.round(((metrics.business_leads || 0) / total) * 100);
  const indPct = Math.round(((metrics.individual_leads || 0) / total) * 100);
  const valPct = Math.round(((metrics.valid_emails || 0) / total) * 100);

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Header & Download Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white mb-1">📈 Export Outreach Performance Analytics</h2>
          <p className="text-xs text-slate-400">Complete audit trail and delivery KPI analysis.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Downloading...' : 'Download Full CSV Report'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222f4c]">
          <div className="text-xs text-slate-400">Total Leads</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{metrics.total_leads || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Ingested pool</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222f4c]">
          <div className="text-xs text-slate-400">Valid Emails</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.valid_emails || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">{valPct}% syntax valid</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222f4c]">
          <div className="text-xs text-slate-400">B2B Businesses</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{metrics.business_leads || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">{bizPct}% segmented</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222f4c]">
          <div className="text-xs text-slate-400">Successful Sends</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{metrics.successful_sends || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Live & Demo Sent</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222f4c]">
          <div className="text-xs text-slate-400">Duplicates Skipped</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{metrics.skipped_leads || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Deduplication guard</div>
        </div>

        <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222f4c]">
          <div className="text-xs text-slate-400">Success Rate</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.success_rate || 0}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Delivered / Attempted</div>
        </div>
      </div>

      {/* Visual Composition Bars */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-400" />
          <span>Lead Segmentation & Quality Composition</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Audience Segmentation (Business vs Individual)</span>
              <span className="font-bold text-white">{bizPct}% Business / {indPct}% Individual</span>
            </div>
            <div className="h-2.5 w-full bg-[#0b0f19] rounded-full overflow-hidden flex border border-[#222f4c]">
              <div style={{ width: `${bizPct}%` }} className="bg-emerald-500 h-full" title="Business" />
              <div style={{ width: `${indPct}%` }} className="bg-purple-500 h-full" title="Individual" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Email Validity Ratio</span>
              <span className="font-bold text-emerald-400">{valPct}% Verified Valid</span>
            </div>
            <div className="h-2.5 w-full bg-[#0b0f19] rounded-full overflow-hidden flex border border-[#222f4c]">
              <div style={{ width: `${valPct}%` }} className="bg-blue-500 h-full" />
              <div style={{ width: `${100 - valPct}%` }} className="bg-rose-500/80 h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">📜 Complete Outreach Activity Log (data/sent_log.csv)</h2>
            <p className="text-xs text-slate-400">{metrics.recent_activity?.length || 0} total activity records</p>
          </div>
        </div>

        <DataTable
          columns={activityColumns}
          data={metrics.recent_activity || []}
          emptyMessage="No activity records logged yet. Dispatch a campaign from Send Campaign."
        />
      </div>
    </div>
  );
};

export default Reports;
