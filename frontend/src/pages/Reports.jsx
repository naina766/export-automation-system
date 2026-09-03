import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Download, 
  Globe, 
  CheckCircle2, 
  Building2, 
  Send, 
  Percent, 
  AlertCircle,
  FileSpreadsheet,
  PieChart,
  Layers,
  Clock,
  Search,
  XCircle,
  TrendingUp
} from 'lucide-react';
import apiService from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Reports = () => {
  const navigate = useNavigate();
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
      render: (row) => <span className="text-xs text-[#94A3B8] font-mono">{row.timestamp}</span>,
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
      header: 'Transport',
      accessor: 'mode',
      render: (row) => <span className="text-xs font-mono text-slate-400">Gmail SMTP</span>,
    },
    {
      header: 'Error / Details',
      accessor: 'error',
      render: (row) => <span className="text-xs text-rose-400 truncate max-w-xs block">{row.error || '—'}</span>,
    },
  ];

  const total = metrics?.total_leads || 0;
  const validContacts = metrics?.valid_emails || 0;
  const qualified = metrics?.business_leads || 0;
  const emailsSent = metrics?.successful_sends || 0;
  const failedSends = metrics?.failed_sends || 0;
  const successRate = metrics?.success_rate;
  const recentLogs = metrics?.recent_activity || [];

  const bizPct = total > 0 ? Math.round((qualified / total) * 100) : 0;
  const indPct = total > 0 ? 100 - bizPct : 0;
  const valPct = total > 0 ? Math.round((validContacts / total) * 100) : 0;

  const hasAnyData = total > 0 || recentLogs.length > 0;

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Header & Download Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-base font-bold text-[#F8FAFC] mb-1">Campaign Analytics & Performance Reports</h1>
          <p className="text-xs text-[#94A3B8]">Complete audit trail, delivery telemetry, and conversion analytics.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || !hasAnyData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Downloading...' : 'Export Full CSV Report'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-[#94A3B8]">Total Leads</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{total}</div>
          <div className="text-[10px] text-slate-500 mt-1">Discovered pool</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-[#94A3B8]">Qualified</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{qualified}</div>
          <div className="text-[10px] text-slate-500 mt-1">Commercial B2B</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-[#94A3B8]">Valid Contacts</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{validContacts}</div>
          <div className="text-[10px] text-slate-500 mt-1">{valPct}% verified format</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-[#94A3B8]">Emails Sent</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{emailsSent}</div>
          <div className="text-[10px] text-slate-500 mt-1">Gmail SMTP Dispatched</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-[#94A3B8]">Failed</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{failedSends}</div>
          <div className="text-[10px] text-slate-500 mt-1">Delivery errors</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-[#94A3B8]">Success Rate</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {successRate !== null && successRate !== undefined ? `${successRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {successRate !== null && successRate !== undefined ? 'Delivery Success' : 'No sends recorded'}
          </div>
        </div>
      </div>

      {!hasAnyData ? (
        /* Compact Empty State */
        <div className="p-10 rounded-2xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)] text-center space-y-3 max-w-md mx-auto shadow-xl">
          <BarChart3 className="w-8 h-8 text-blue-400/60 mx-auto" />
          <div>
            <h2 className="text-sm font-bold text-[#F8FAFC]">No campaign data yet</h2>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              Run your first buyer discovery and outreach campaign to start generating performance analytics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Discover Buyers</span>
          </button>
        </div>
      ) : (
        <>
          {/* Visual Analytics Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audience Composition & Validation Distribution */}
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                <span>Lead Composition & Quality</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span className="text-[#94A3B8]">B2B Wholesale vs Individual</span>
                    <span className="font-bold text-[#F8FAFC]">{bizPct}% B2B / {indPct}% Retail</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#080D1D] rounded-full overflow-hidden flex border border-[rgba(148,163,184,0.12)]">
                    <div style={{ width: `${bizPct}%` }} className="bg-emerald-500 h-full" title="B2B Qualified" />
                    <div style={{ width: `${indPct}%` }} className="bg-purple-500 h-full" title="Individual" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span className="text-[#94A3B8]">Email Syntax & Domain Verification</span>
                    <span className="font-bold text-emerald-400">{valPct}% Verified Format</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#080D1D] rounded-full overflow-hidden flex border border-[rgba(148,163,184,0.12)]">
                    <div style={{ width: `${valPct}%` }} className="bg-blue-500 h-full" />
                    <div style={{ width: `${100 - valPct}%` }} className="bg-rose-500/80 h-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Email Delivery Results Breakdown */}
            <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Email Delivery Telemetry</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)]">
                  <div className="text-[10px] text-[#94A3B8] uppercase">Attempted</div>
                  <div className="text-lg font-bold text-white mt-1">{emailsSent + failedSends}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)]">
                  <div className="text-[10px] text-[#94A3B8] uppercase">Delivered</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{emailsSent}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)]">
                  <div className="text-[10px] text-[#94A3B8] uppercase">Failed</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">{failedSends}</div>
                </div>
              </div>

              <div className="text-[11px] text-[#94A3B8] flex items-center justify-between border-t border-[rgba(148,163,184,0.12)] pt-3">
                <span>Transport Protocol: <b>Gmail SMTP (STARTTLS 587)</b></span>
                <span className="text-emerald-400 font-semibold">Active Deduplication Guard</span>
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(148,163,184,0.12)]">
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC]">Complete Outreach Activity Log (sent_log.csv)</h2>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">{recentLogs.length} total dispatch records</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTable
                columns={activityColumns}
                data={recentLogs}
                emptyMessage="No activity records logged yet."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
