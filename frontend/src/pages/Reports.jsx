import React, { useState, useEffect, useRef } from 'react';
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
  Filter,
  Calendar,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';
import PipelineStepper from '../components/PipelineStepper';
import { formatBusinessError } from '../services/errorHandler';

export const Reports = () => {
  const navigate = useNavigate();
  const { selectedProduct, products } = useProduct();
  
  // Filter states
  const [productFilter, setProductFilter] = useState(selectedProduct?.id || 'all');
  const [dateRange, setDateRange] = useState('all'); // 'all' | '30d' | '7d' | 'today'
  const [countryFilter, setCountryFilter] = useState('all');

  const [metrics, setMetrics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // In-memory cache to prevent duplicate requests and flickering
  const cacheRef = useRef({});
  const fetchTimeoutRef = useRef(null);

  const fetchReport = async (isInitial = false) => {
    const cacheKey = `${productFilter}_${dateRange}`;
    
    // Check in-memory cache first
    if (cacheRef.current[cacheKey]) {
      setMetrics(cacheRef.current[cacheKey]);
      setRefreshing(false);
      setInitialLoading(false);
      return;
    }

    try {
      if (isInitial) setInitialLoading(true);
      else setRefreshing(true);

      const pid = productFilter === 'all' ? null : productFilter;
      const res = await apiService.getReport(pid);
      
      const reportMetrics = res.metrics || {};
      cacheRef.current[cacheKey] = reportMetrics;
      setMetrics(reportMetrics);
    } catch (err) {
      setNotification({ 
        type: 'error', 
        message: formatBusinessError(err, 'Unable to load report data right now.') 
      });
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced filter trigger
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Immediate visual feedback indicator
    setRefreshing(true);

    fetchTimeoutRef.current = setTimeout(() => {
      fetchReport(false);
    }, 150);

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [productFilter, dateRange]);

  // Initial load
  useEffect(() => {
    fetchReport(true);
  }, []);

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

  if (initialLoading) return <LoadingSpinner text="Generating sales analytics..." />;

  const total = metrics?.total_leads || 0;
  const validContacts = metrics?.valid_emails || 0;
  const qualified = metrics?.business_leads || 0;
  const emailsSent = metrics?.successful_sends || 0;
  const failedSends = metrics?.failed_sends || 0;
  const successRate = metrics?.success_rate;
  const recentLogs = metrics?.recent_activity || [];

  const filteredLogs = countryFilter === 'all' 
    ? recentLogs 
    : recentLogs.filter(l => l.country && l.country.toLowerCase() === countryFilter.toLowerCase());

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

      {/* Official 6-Stage Pipeline Stepper */}
      <PipelineStepper 
        currentStage={6} 
        stats={{ 
          total_leads: total,
          valid_emails: validContacts,
          qualified_buyers: qualified,
          successful_sends: emailsSent,
          total_campaigns: 1
        }} 
      />

      {/* Header & Instant Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#F8FAFC]">Sales Analytics & Outreach Reports</h1>
            {refreshing && (
              <span className="flex items-center gap-1 text-[11px] text-purple-400 font-medium animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Updating analytics...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">Audit trail, delivery results, and multi-product conversion analytics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-[#050816] px-3 py-1.5 rounded-xl border border-[#1E293B]">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-purple-300 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B1220] text-[#F8FAFC]">All Time</option>
              <option value="30d" className="bg-[#0B1220] text-[#F8FAFC]">Last 30 Days</option>
              <option value="7d" className="bg-[#0B1220] text-[#F8FAFC]">Last 7 Days</option>
              <option value="today" className="bg-[#0B1220] text-[#F8FAFC]">Today</option>
            </select>
          </div>

          {/* Product Filter Selector */}
          <div className="flex items-center gap-1.5 bg-[#050816] px-3 py-1.5 rounded-xl border border-[#1E293B]">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-transparent text-purple-300 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B1220] text-[#F8FAFC]">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0B1220] text-[#F8FAFC]">{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading || !hasAnyData}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-40 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Export Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid with Skeleton Pulse during refresh */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="text-xs text-[#94A3B8]">Total Buyers</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{total}</div>
          <div className="text-[10px] text-slate-500 mt-1">Discovered pool</div>
        </div>

        <div className={`p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="text-xs text-[#94A3B8]">Qualified Buyers</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{qualified}</div>
          <div className="text-[10px] text-slate-500 mt-1">Commercial B2B</div>
        </div>

        <div className={`p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="text-xs text-[#94A3B8]">Valid Contacts</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{validContacts}</div>
          <div className="text-[10px] text-slate-500 mt-1">{valPct}% verified format</div>
        </div>

        <div className={`p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="text-xs text-[#94A3B8]">Emails Sent</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{emailsSent}</div>
          <div className="text-[10px] text-slate-500 mt-1">Direct Dispatches</div>
        </div>

        <div className={`p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="text-xs text-[#94A3B8]">Failed</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{failedSends}</div>
          <div className="text-[10px] text-slate-500 mt-1">Delivery errors</div>
        </div>

        <div className={`p-4 rounded-xl bg-[#0B1220] border border-[#1E293B] transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
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
        <div className={`p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
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

        <div className={`p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Market Coverage</h3>
            </div>
            <span className="text-xs text-slate-400">{metrics?.countries_covered || 0} Countries</span>
          </div>

          <div className="text-xs text-slate-400">
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {(metrics?.countries || []).map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCountryFilter(countryFilter === c ? 'all' : c)}
                  className={`px-2.5 py-1 rounded text-[11px] border transition-all ${countryFilter === c ? 'bg-purple-600 text-white border-purple-500 font-bold' : 'bg-[#050816] text-slate-300 border-[#1E293B] hover:border-slate-600'}`}
                >
                  {c}
                </button>
              ))}
              {(!metrics?.countries || metrics?.countries.length === 0) && (
                <span className="text-slate-500 italic">No geographic data logged yet.</span>
              )}
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
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
              <span className="font-semibold text-cyan-400">{metrics?.data_hygiene?.duplicates_removed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Audit Table */}
      <div className={`bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-4 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Outreach Delivery Log</h3>
          </div>
          <span className="text-xs text-slate-400">Total Entries: {filteredLogs.length}</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#050816] border border-[#1E293B] text-center space-y-3">
            <Send className="w-8 h-8 text-purple-400/60 mx-auto" />
            <div>
              <div className="text-sm font-bold text-white">No Outreach Dispatches Yet</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Run a qualified campaign to see real-time email delivery status and engagement metrics here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/send')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition-all inline-flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>Go to Gmail Campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <DataTable
            columns={activityColumns}
            data={filteredLogs}
            emptyMessage="No outreach activity recorded yet. Dispatches will appear here."
          />
        )}
      </div>
    </div>
  );
};

export default Reports;
