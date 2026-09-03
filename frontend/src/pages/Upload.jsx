import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Globe, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  Database,
  FileSpreadsheet,
  ShieldAlert,
  Filter,
  ExternalLink,
  Building2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import apiService from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'Canada',
  'Australia',
  'France',
  'Singapore',
  'United Arab Emirates',
  'Switzerland',
  'Netherlands',
  'Spain',
  'Italy',
  'Japan',
  'All Countries'
];

const BUYER_TYPES = [
  'Distributor',
  'Wholesale Importer',
  'Yoga & Meditation Studio',
  'Sound Healing Center',
  'Metaphysical Retailer',
  'All Buyer Types'
];

export const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Search Criteria State (Primary Workflow)
  const [product, setProduct] = useState('Himalayan Sound Healing Bowls');
  const [country, setCountry] = useState('United States');
  const [buyerType, setBuyerType] = useState('Distributor');
  const [keywords, setKeywords] = useState('sound healing, meditation, wellness, singing bowls');
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(1);
  const [searchStage, setSearchStage] = useState('');
  const [configError, setConfigError] = useState(null);

  // Optional CSV Import toggle
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Persisted Leads State
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await apiService.getLeads();
      setLeads(res.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Primary Action: Live API Buyer Discovery
  const handleFindBuyers = async (e) => {
    if (e) e.preventDefault();
    if (searching) return;

    try {
      setSearching(true);
      setConfigError(null);
      setNotification({ type: '', message: '' });
      setSearchStep(1);
      setSearchStage('Creating optimized B2B export search query...');

      const payload = {
        product,
        country: country === 'All Countries' ? '' : country,
        buyer_type: buyerType === 'All Buyer Types' ? '' : buyerType,
        keywords,
        limit: Number(limit),
        auto_ingest: true
      };

      const t1 = setTimeout(() => {
        setSearchStep(2);
        setSearchStage('Connecting to Search API provider...');
      }, 400);

      const t2 = setTimeout(() => {
        setSearchStep(3);
        setSearchStage(`Querying external index for live ${buyerType || 'distributor'} entities...`);
      }, 900);

      const t3 = setTimeout(() => {
        setSearchStep(4);
        setSearchStage('Parsing business profiles, extracting websites & domains...');
      }, 1500);

      const t4 = setTimeout(() => {
        setSearchStep(5);
        setSearchStage('Inspecting public contact points & validating email syntax...');
      }, 2100);

      const res = await apiService.searchBuyers(payload);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      setSearchStep(6);
      const discoveredBuyers = res.buyers || res.results || [];
      const count = res.total_found ?? res.count ?? discoveredBuyers.length;

      // Refresh leads from store
      await fetchLeads();

      setNotification({
        type: 'success',
        message: `Discovered ${count} live international businesses from web search and added to pipeline.`
      });
    } catch (err) {
      const errDetail = err.response?.data?.detail;
      if (errDetail?.error === 'SEARCH_PROVIDER_NOT_CONFIGURED') {
        setConfigError(errDetail.message || 'Search provider API key is not configured.');
      } else {
        setNotification({
          type: 'error',
          message: typeof errDetail === 'string' ? errDetail : (errDetail?.message || 'Failed to execute live buyer search.')
        });
      }
    } finally {
      setSearching(false);
      setSearchStage('');
    }
  };

  // Secondary Optional Action: CSV File Upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotification({ type: 'error', message: 'Please select a valid .csv file.' });
      return;
    }

    try {
      setUploading(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.uploadCSV(file);
      setStats(res.stats);
      setLeads(res.leads || []);
      setNotification({
        type: 'success',
        message: `Successfully imported ${res.stats?.total_records || 0} leads (${res.stats?.valid_records || 0} valid email formats).`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to process CSV import.'
      });
    } finally {
      setUploading(false);
    }
  };

  // Filter leads according to selected tab
  const displayedLeads = leads.filter((row) => {
    const isDup = row.is_duplicate === 'True' || row.is_duplicate === true;
    const isContacted = row.already_contacted === 'True' || row.already_contacted === true;
    const isValid = (row.email_status === 'valid' || row.valid === 'True' || row.valid === true) && !isDup && !isContacted;

    if (viewFilter === 'valid') return isValid;
    if (viewFilter === 'invalid') return !isValid;
    return true;
  });

  const columns = [
    {
      header: '#',
      render: (_, idx) => <span className="text-slate-400 text-xs font-mono">{idx + 1}</span>,
    },
    {
      header: 'Buyer / Contact',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-semibold text-white">{row.name || row.buyer_name || 'Procurement Lead'}</span>
          <div className="text-[11px] text-slate-400">{row.buyer_type || 'Distributor'}</div>
        </div>
      ),
    },
    {
      header: 'Company Name',
      accessor: 'company',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-200">{row.company || row.company_name || '—'}</span>
          {row.website && (
            <div className="text-[11px] text-blue-400 truncate max-w-[140px] font-mono">
              <a href={row.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {row.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (row) => row.email ? (
        <code className="text-xs text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50 font-mono">
          {row.email}
        </code>
      ) : (
        <span className="text-xs text-slate-500 italic">Not found / unavailable</span>
      ),
    },
    {
      header: 'Country',
      accessor: 'country',
      render: (row) => <span className="text-slate-300">{row.country || 'International'}</span>,
    },
    {
      header: 'Source',
      accessor: 'source',
      render: (row) => (
        <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
          {row.source || row.source_platform || 'Web Search'}
        </span>
      ),
    },
    {
      header: 'Email Status',
      accessor: 'email_status',
      render: (row) => {
        if (!row.email) return <StatusBadge status="missing" text="Not Found" />;
        const status = row.email_status || (row.valid === 'True' || row.valid === true ? 'valid' : 'invalid');
        return <StatusBadge status={status} text={status === 'valid' ? 'Valid Format' : 'Invalid'} />;
      },
    },
    {
      header: 'Queue Status',
      render: (row) => {
        if (row.is_duplicate === 'True' || row.is_duplicate === true) {
          return <StatusBadge status="invalid" text="Suppressed (Duplicate)" />;
        }
        if (row.already_contacted === 'True' || row.already_contacted === true) {
          return <StatusBadge status="missing" text="Suppressed (Contacted)" />;
        }
        if (row.email_status === 'invalid' || !row.email) {
          return <StatusBadge status="invalid" text="Suppressed (No Valid Email)" />;
        }
        return <StatusBadge status="valid" text="Eligible" />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Page Header */}
      <div className="p-5 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#0F172A] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Import Leads</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                Utility
              </span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Import an existing external lead dataset when needed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/classify')}
            disabled={leads.length === 0}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Qualify Leads</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Unconfigured Search Provider Notice */}
      {configError && (
        <div className="p-5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>Live Search Unavailable</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">
            Search Provider is not configured.
          </p>
          <div className="bg-[#0b0f19] p-3 rounded-lg border border-amber-900/50 text-xs font-mono text-amber-300">
            Configure your Search API credentials in Settings → System Health.
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <span>Go to Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Section: Find International Buyers */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#222f4c] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Search className="w-4 h-4 text-blue-400" />
            <span>Find International Buyers</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCsvImport(!showCsvImport)}
            className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{showCsvImport ? 'Hide CSV Import' : 'Already have leads? Import CSV'}</span>
          </button>
        </div>

        <form onSubmit={handleFindBuyers} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Target Product
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Himalayan Sound Healing Bowls"
                className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Country / Region
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Buyer Type
              </label>
              <select
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {BUYER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Number of Results
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={10}>10 Results</option>
                <option value={20}>20 Results</option>
                <option value={50}>50 Results</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Keywords (Comma-separated for targeted discovery)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. sound healing, meditation, wellness, singing bowls"
              className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              * Queries real external search API and validates publicly available contact information.
            </span>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{searching ? 'Finding Buyers...' : 'Find Buyers'}</span>
            </button>
          </div>
        </form>

        {/* Real-time Progress Animation */}
        {searching && (
          <div className="p-6 rounded-xl bg-[#0b0f19] border border-blue-500/30 text-center space-y-3 max-w-md mx-auto my-4">
            <LoadingSpinner text={searchStage || 'Finding international buyers...'} />
            <div className="text-left space-y-2 text-xs font-medium pt-3 border-t border-[#222f4c]">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Search query created</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 2 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Search API connected</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 3 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Search results received</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 4 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 4 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Businesses identified & domains extracted</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 5 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Contact information extracted & emails validated</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 6 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 6 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Duplicate leads removed & saved to pipeline</span>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Optional Action: Collapsible CSV Import Panel */}
        {showCsvImport && (
          <div className="pt-4 border-t border-[#222f4c] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Secondary Action: Import CSV Leads</h3>
                <p className="text-[11px] text-slate-400">Optional: Ingest existing partner spreadsheets.</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                name,company,email,website,country,source
              </span>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200
                ${isDragOver 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-[#222f4c] bg-[#0b0f19]/50 hover:border-slate-500 hover:bg-[#0b0f19]'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
              <div className="flex items-center justify-center gap-3">
                <UploadCloud className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-semibold text-white">
                  Drop CSV here or <span className="text-blue-400 underline">browse</span>
                </span>
                <span className="text-[11px] text-slate-500">(Optional advanced import)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discovered Lead Store & Queue Inspection Table */}
      <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">👥 Lead Store & Verification Queue</h2>
            <p className="text-xs text-slate-400">{displayedLeads.length} leads displayed ({leads.length} total)</p>
          </div>

          <div className="flex bg-[#0b0f19] p-1 rounded-lg border border-[#222f4c] text-xs font-semibold">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1 rounded transition-all ${viewFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All Leads ({leads.length})
            </button>
            <button
              onClick={() => setViewFilter('valid')}
              className={`px-3 py-1 rounded transition-all ${viewFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Eligible ({leads.filter(r => (r.email_status === 'valid' || r.valid === 'True' || r.valid === true) && (r.is_duplicate !== 'True' && r.is_duplicate !== true)).length})
            </button>
            <button
              onClick={() => setViewFilter('invalid')}
              className={`px-3 py-1 rounded transition-all ${viewFilter === 'invalid' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Review Suppressed / Invalid
            </button>
          </div>
        </div>

        {viewFilter === 'invalid' && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <b>Lead Suppression Policy:</b> Rows with invalid syntax, missing email addresses, or previous campaign contact entries are automatically blocked from entering the active Gmail SMTP outreach queue.
            </span>
          </div>
        )}

        {loading ? (
          <LoadingSpinner text="Fetching lead records..." />
        ) : (
          <DataTable
            columns={columns}
            data={displayedLeads}
            emptyMessage={leads.length === 0 ? "No leads available yet. Discover live buyers or upload a CSV to begin." : "No buyer leads matching selected filter."}
          />
        )}
      </div>
    </div>
  );
};

export default Upload;
