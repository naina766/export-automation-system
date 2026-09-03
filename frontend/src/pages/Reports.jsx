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
  TrendingUp,
  Package,
  Filter
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';
import { formatBusinessError } from '../services/errorHandler';

export const Reports = () => {
  const navigate = useNavigate();
  const { selectedProduct, products } = useProduct();
  const [productFilter, setProductFilter] = useState(selectedProduct?.id || 'all');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const pid = productFilter === 'all' ? null : productFilter;
      const res = await apiService.getReport(pid);
      setMetrics(res.metrics || {});
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: formatBusinessError(err, 'Unable to load report data right now.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [productFilter]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await apiService.downloadReport();
      setNotification({ type: 'success', message: 'Report downloaded successfully.' });
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: formatBusinessError(err, 'Unable to download report.') 
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Generating sales analytics..." />;

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
      render: (row) => <code className="text-xs text-purple-300 font-mono">{row.email}</code>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Channel',
      accessor: 'mode',
      render: (row) => <span className="text-xs text-slate-400">Direct Email</span>,
    },
    {
      header: 'Delivery Notes',
      accessor: 'error',
      render: (row) => <span className="text-xs text-slate-400 truncate max-w-xs block">{row.error ? 'Delivery attempted' : 'Delivered'}</span>,
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

      {/* Header & Product Filter & Download Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-base font-bold text-[#F8FAFC] mb-1">Sales Analytics & Outreach Reports</h1>
          <p className="text-xs text-[#94A3B8]">Audit trail, delivery results, and multi-product conversion analytics.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Product Filter Selector */}
          <div className="flex items-center gap-2 bg-[#050816] px-3 py-1.5 rounded-xl border border-[#1E293B]">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-slate-400 shrink-0">Product:</span>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-transparent text-purple-300 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B1220] text-[#F8FAFC]">All Products (Consolidated)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0B1220] text-[#F8FAFC]">{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading || !hasAnyData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-40 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Downloading...' : 'Export Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8]">Total Buyers</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{total}</div>
          <div className="text-[10px] text-slate-500 mt-1">Discovered pool</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8]">Qualified Buyers</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{qualified}</div>
          <div className="text-[10px] text-slate-500 mt-1">Commercial B2B</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8]">Valid Contacts</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{validContacts}</div>
          <div className="text-[10px] text-slate-500 mt-1">{valPct}% verified format</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8]">Emails Sent</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{emailsSent}</div>
          <div className="text-[10px] text-slate-500 mt-1">Direct Dispatches</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8]">Failed</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{failedSends}</div>
          <div className="text-[10px] text-slate-500 mt-1">Delivery errors</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8]">Delivery Rate</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {successRate !== null && successRate !== undefined ? `${successRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {successRate !== null && successRate !== undefined ? 'Delivery Success' : 'No sends recorded'}
          </div>
        </div>
      </div>

      {/* Conversion Breakdown & Geographic Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Buyer Segmentation</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Commercial Business Buyers</span>
                <span className="font-bold text-purple-400">{qualified} ({bizPct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${bizPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Other / Individual Contacts</span>
                <span className="font-bold text-slate-400">{total - qualified} ({indPct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-slate-600 rounded-full transition-all" style={{ width: `${indPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Market Coverage</h3>
          </div>

          <div className="text-xs text-slate-400">
            <div>Active Target Markets: <b className="text-white">{metrics?.countries_covered || metrics?.countries_count || 0} Countries</b></div>
            <div className="flex flex-wrap gap-1.5 mt-3 max-h-36 overflow-y-auto pr-1">
              {(metrics?.countries || []).map((country, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-[#050816] border border-[#1E293B] text-slate-300 text-[11px]">
                  {country}
                </span>
              ))}
              {(!metrics?.countries || metrics?.countries.length === 0) && (
                <span className="text-slate-500 italic">No geographic data logged yet.</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Contact Quality Guardrails</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">Verified contacts:</span>
              <span className="font-semibold text-emerald-400">{metrics?.data_hygiene?.valid_contacts || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">Format issues:</span>
              <span className="font-semibold text-rose-400">{metrics?.data_hygiene?.invalid_emails || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">Missing email addresses:</span>
              <span className="font-semibold text-amber-400">{metrics?.data_hygiene?.missing_emails || 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Duplicates prevented:</span>
              <span className="font-semibold text-blue-400">{metrics?.data_hygiene?.duplicates_removed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Audit Table */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Outreach Delivery Log</h3>
          </div>
          <span className="text-xs text-slate-400">Total Entries: {recentLogs.length}</span>
        </div>

        <DataTable
          columns={activityColumns}
          data={recentLogs}
          emptyMessage="No outreach activity recorded yet. Dispatches will appear here."
        />
      </div>
    </div>
  );
};

export default Reports;
