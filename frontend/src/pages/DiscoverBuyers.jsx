import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Search, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Building2, 
  ExternalLink, 
  DownloadCloud, 
  ShieldAlert,
  Layers,
  MapPin,
  Mail,
  User,
  Clock,
  KeyRound,
  Package
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import Notification from '../components/Notification';
import { formatBusinessError } from '../services/errorHandler';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const COUNTRIES = [
  'All Countries',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Canada',
  'Australia',
  'Singapore',
  'United Arab Emirates',
  'Switzerland',
  'Netherlands',
  'Spain'
];

const BUYER_TYPES = [
  'All Buyer Types',
  'Distributor',
  'Wholesaler',
  'Importer',
  'Healing Center',
  'Studio',
  'Retailer'
];

export const DiscoverBuyers = () => {
  const navigate = useNavigate();
  const { selectedProduct, setSelectedProduct, products } = useProduct();
  const [product, setProduct] = useState(selectedProduct?.name || 'Himalayan Sound Healing Bowls');
  const [country, setCountry] = useState('United States');
  const [buyerType, setBuyerType] = useState('Distributor');
  const [keywords, setKeywords] = useState('sound healing, meditation, wellness, singing bowls');
  const [limit, setLimit] = useState(25);
  
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchStage, setSearchStage] = useState('');
  const [configError, setConfigError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [searchStep, setSearchStep] = useState(1);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Synchronize when selectedProduct updates
  useEffect(() => {
    if (selectedProduct) {
      setProduct(selectedProduct.name);
      if (selectedProduct.keywords && selectedProduct.keywords.length > 0) {
        setKeywords(Array.isArray(selectedProduct.keywords) ? selectedProduct.keywords.join(', ') : selectedProduct.keywords);
      }
      if (selectedProduct.target_countries && selectedProduct.target_countries.length > 0) {
        setCountry(selectedProduct.target_countries[0]);
      }
      if (selectedProduct.buyer_types && selectedProduct.buyer_types.length > 0) {
        setBuyerType(selectedProduct.buyer_types[0]);
      }
    }
  }, [selectedProduct]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (searching) return;

    try {
      setSearching(true);
      setConfigError(null);
      setNotification({ type: '', message: '' });
      setSearchStep(1);
      setSearchStage('Searching international markets...');

      const payload = {
        product_id: selectedProduct?.id,
        product,
        country: country === 'All Countries' ? '' : country,
        buyer_type: buyerType === 'All Buyer Types' ? '' : buyerType,
        keywords,
        limit: Number(limit),
        auto_ingest: true
      };

      // Real-time progress animation steps with business-focused labels
      const t1 = setTimeout(() => {
        setSearchStep(2);
        setSearchStage('Connecting to global buyer directory...');
      }, 350);

      const t2 = setTimeout(() => {
        setSearchStep(3);
        setSearchStage('International businesses located...');
      }, 800);

      const t3 = setTimeout(() => {
        setSearchStep(4);
        setSearchStage('Evaluating company profiles...');
      }, 1400);

      const t4 = setTimeout(() => {
        setSearchStep(5);
        setSearchStage('Verifying contact details...');
      }, 2000);

      const t5 = setTimeout(() => {
        setSearchStep(6);
        setSearchStage('Preparing verified prospects...');
      }, 2600);

      const res = await apiService.searchBuyers(payload);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);

      setSearchStep(7);
      const discoveredBuyers = res.buyers || res.results || [];
      setResults(discoveredBuyers);
      
      const count = res.total_found ?? res.count ?? discoveredBuyers.length;
      setNotification({
        type: 'success',
        message: `Discovered ${count} potential international buyers.`
      });
    } catch (err) {
      const errDetail = err.response?.data?.detail;
      if (errDetail?.error === 'SEARCH_PROVIDER_NOT_CONFIGURED') {
        setConfigError('Buyer discovery is not connected yet. Please update your connection in Settings.');
      } else {
        setNotification({
          type: 'error',
          message: formatBusinessError(err, "Buyer discovery couldn't be completed. Please try again.")
        });
      }
    } finally {
      setSearching(false);
      setSearchStage('');
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const validEmails = results.filter(r => r.validation_status === 'valid').length;
  const missingEmails = results.filter(r => !r.email || r.validation_status === 'missing').length;

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)] shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC]">Discover International Buyers</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Find verified international buyers for export sales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto z-10">
          <button
            onClick={() => navigate('/classify')}
            disabled={results.length === 0}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Qualify Leads</span>
          </button>
        </div>
      </div>

      {/* Unconfigured Search Notice */}
      {configError && (
        <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>Buyer Discovery Needs Setup</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">
            {configError}
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md"
            >
              <span>Update Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search Configuration Grid */}
      <form onSubmit={handleSearch} className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Live Search Targeting Criteria</span>
          </div>
          <span className="text-[11px] text-slate-400">Target Export: <b className="text-purple-300">{selectedProduct?.name || 'All Products'}</b></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Export Product Line</span>
              <span className="text-[10px] text-purple-400">Catalog</span>
            </label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const found = products.find(p => p.id === e.target.value);
                if (found) setSelectedProduct(found);
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#050816] border border-[#1E293B] text-purple-300 font-semibold text-xs focus:outline-none focus:border-purple-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
              Search Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value={10}>10 Results</option>
              <option value={25}>25 Results</option>
              <option value={50}>50 Results</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Keywords
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="sound healing, meditation, wellness store, wholesale importer"
            className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400">
            * Queries configured live search provider. Zero simulated or fabricated records.
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>{searching ? 'Searching live sources...' : 'Discover Buyers'}</span>
          </button>
        </div>
      </form>

      {/* Discovery KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-slate-400 font-medium">Businesses Discovered</div>
          <div className="text-2xl font-bold text-white mt-1">{results.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-slate-400 font-medium">Valid Contact Data</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{validEmails}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-slate-400 font-medium">Email Unavailable</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{missingEmails}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-xs text-slate-400 font-medium">Target Regions</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {new Set(results.map(r => r.country)).size}
          </div>
        </div>
      </div>

      {/* Discovered Leads Section */}
      <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">
              {results.length > 0 ? `${results.length} Discovered Prospects` : 'Discovered Buyer Candidates'}
            </h2>
            <span className="text-xs text-slate-400">({results.length} results)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#080D1D] p-1 rounded-lg border border-[rgba(148,163,184,0.12)]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-xs font-semibold ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded text-xs font-semibold ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Card View
              </button>
            </div>
          </div>
        </div>

        {searching ? (
          <div className="p-8 rounded-xl bg-[#080D1D] border border-blue-500/30 text-center space-y-4 max-w-md mx-auto">
            <LoadingSpinner text={searchStage || 'Searching international markets...'} />
            <div className="text-left space-y-2 text-xs font-medium pt-3 border-t border-[rgba(148,163,184,0.12)]">
              <div className={`flex items-center gap-2 ${searchStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 1 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Searching international markets...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 2 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Connecting to global buyer directory...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 3 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>International businesses located</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 4 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 4 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Evaluating company profiles</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 5 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Verifying contact details</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 6 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 6 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Preparing verified prospects</span>
              </div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-center space-y-3 max-w-sm mx-auto">
            <Globe className="w-8 h-8 text-blue-400/60 mx-auto" />
            <div>
              <p className="text-sm font-bold text-[#F8FAFC]">No buyers discovered yet</p>
              <p className="text-xs text-[#94A3B8] mt-1">Use Discover Buyers to find real international prospects.</p>
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Discover Buyers</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-lg border border-[rgba(148,163,184,0.12)]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#080D1D] text-slate-300 border-b border-[rgba(148,163,184,0.12)] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Buyer Type</th>
                  <th className="p-3">Website</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Source URL</th>
                  <th className="p-3">AI Priority</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(148,163,184,0.12)] text-slate-200">
                {results.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span>{lead.company_name || lead.company}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {lead.contact_name || lead.name || 'Procurement Lead'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{lead.country}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium text-[11px]">
                        {lead.buyer_type}
                      </span>
                    </td>
                    <td className="p-3">
                      {lead.website ? (
                        <a 
                          href={lead.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-mono text-[11px] truncate max-w-[140px]"
                        >
                          <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unavailable</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.email ? (
                        <div className="font-mono text-emerald-300 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{lead.email}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Not found</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.source_url ? (
                        <a 
                          href={lead.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/70 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-medium"
                        >
                          <span>View Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">{lead.source || 'Web'}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.ai_score ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                          {lead.ai_score}/100
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Pending AI</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/classify')}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Qualify</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((lead, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-3 shadow-sm hover:border-blue-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>{lead.company_name || lead.company}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{lead.contact_name || lead.name || 'Procurement Lead'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {lead.buyer_type}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{lead.country}</span>
                  </div>
                  {lead.website && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <a 
                        href={lead.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 truncate"
                      >
                        {lead.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {lead.email ? (
                      <span className="text-emerald-300 truncate font-semibold">{lead.email}</span>
                    ) : (
                      <span className="text-slate-500 italic">Not found / unavailable</span>
                    )}
                  </div>
                  {lead.ai_score && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-bold text-purple-300">AI Priority: {lead.ai_score}/100</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[rgba(148,163,184,0.12)] flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {lead.source_url && (
                      <a 
                        href={lead.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-semibold"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/classify')}
                    className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Qualify</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsible outreach footer notice */}
      <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-[11px] text-slate-400 text-center">
        Use verified business contacts and comply with applicable privacy, anti-spam, and email outreach requirements.
      </div>
    </div>
  );
};

export default DiscoverBuyers;
