import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Globe, 
  MapPin, 
  Building2, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  ArrowRight, 
  Sparkles,
  ExternalLink,
  Table,
  LayoutGrid,
  Clock,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Package,
  RefreshCw,
  Edit3,
  X,
  AlertTriangle
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';
import { formatBusinessError } from '../services/errorHandler';

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'Canada',
  'Australia',
  'France',
  'Netherlands',
  'Singapore',
  'Japan',
  'All Countries'
];

const BUYER_TYPES = [
  'Distributor',
  'Wholesale Importer',
  'Specialty Retailer',
  'Wellness Center',
  'Spa & Resort',
  'Sound Bath Studio',
  'Healing Center',
  'All Buyer Types'
];

export const DiscoverBuyers = () => {
  const navigate = useNavigate();
  const { selectedProduct, products } = useProduct();
  const searchInputRef = useRef(null);

  const [product, setProduct] = useState(selectedProduct?.name || 'Himalayan Sound Healing Bowls');
  const [country, setCountry] = useState('United States');
  const [buyerType, setBuyerType] = useState('Distributor');
  const [keywords, setKeywords] = useState('sound healing, meditation, wellness, singing bowls');
  const [limit, setLimit] = useState(25);
  
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchStage, setSearchStage] = useState('');
  const [searchStep, setSearchStep] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Error & Empty States: null | 'unconfigured' | 'failed' | 'no_results'
  const [emptyStateType, setEmptyStateType] = useState(null);
  const [isDemoWorkflow, setIsDemoWorkflow] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

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

  // Execute Live Buyer Search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (searching) return;

    try {
      setSearching(true);
      setEmptyStateType(null);
      setIsDemoWorkflow(false);
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
      if (count === 0) {
        setEmptyStateType('no_results');
      } else {
        setNotification({
          type: 'success',
          message: `Discovered ${count} potential international buyers.`
        });
      }
    } catch (err) {
      const errDetail = err.response?.data?.detail;
      if (errDetail?.error === 'SEARCH_PROVIDER_NOT_CONFIGURED' || err.response?.status === 422) {
        setEmptyStateType('unconfigured');
      } else {
        setEmptyStateType('failed');
      }
    } finally {
      setSearching(false);
      setSearchStage('');
    }
  };

  // Explicit User-Triggered Sample Workflow
  const handleExploreSampleWorkflow = async () => {
    try {
      setLoadingSample(true);
      setEmptyStateType(null);
      setNotification({ type: '', message: '' });

      const res = await apiService.getSampleBuyers(selectedProduct?.id);
      const sampleBuyers = res.buyers || res.results || [];
      setResults(sampleBuyers);
      setIsDemoWorkflow(true);

      setNotification({
        type: 'info',
        message: 'Sample Workflow active. These are demonstration buyer records to explore the qualification and review pipeline.'
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to load sample workflow.')
      });
    } finally {
      setLoadingSample(false);
    }
  };

  const handleAdjustSearch = () => {
    setEmptyStateType(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const validEmails = results.filter(r => r.email && (r.email_status === 'valid' || r.validation_status === 'valid')).length;
  const missingEmails = results.filter(r => !r.email || r.email_status === 'missing' || r.validation_status === 'missing').length;

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Page Header */}
      <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#0B1220] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC]">Discover International Buyers</h1>
              {isDemoWorkflow && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEMO DATA
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Find verified international buyers for export sales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto z-10">
          <button
            onClick={() => {
              if (isDemoWorkflow) {
                setNotification({
                  type: 'warning',
                  message: 'Demo buyers cannot enter live outreach campaigns. Connect your discovery service in Settings for real buyers.'
                });
                return;
              }
              navigate('/classify');
            }}
            disabled={results.length === 0}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Qualify Buyers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prominent Sample Data Notice Banner if Demo Workflow Active */}
      {isDemoWorkflow && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-300">DEMO DATA WORKFLOW:</span> These are sample buyer records for testing the qualification interface. Live outreach cannot be sent to demonstration records.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsDemoWorkflow(false);
              setResults([]);
            }}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 shrink-0"
          >
            Exit Sample Workflow
          </button>
        </div>
      )}

      {/* Search Criteria Controls Panel */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Search Parameters</h2>
          </div>
          <span className="text-[11px] text-[#94A3B8]">Targeting: <b className="text-[#F8FAFC]">{product}</b></span>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Target Country / Region</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0B1220]">{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Buyer Category</label>
              <select
                value={buyerType}
                onChange={(e) => setBuyerType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {BUYER_TYPES.map(b => <option key={b} value={b} className="bg-[#0B1220]">{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Max Prospects</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value={10} className="bg-[#0B1220]">10 Prospects</option>
                <option value={25} className="bg-[#0B1220]">25 Prospects</option>
                <option value={50} className="bg-[#0B1220]">50 Prospects</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Keywords</label>
            <input
              ref={searchInputRef}
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. wholesale importer, sound healing, distributor"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#94A3B8]">
              * Discovers active commercial buyers and extracts verified business contact points.
            </span>
            <button
              type="submit"
              disabled={searching || loadingSample}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>{searching ? 'Discovering Buyers...' : 'Discover Buyers'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Discovery KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Businesses Discovered</div>
          <div className="text-2xl font-bold text-white mt-1">{results.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Valid Contact Data</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{validEmails}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Email Unavailable</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{missingEmails}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-xs text-[#94A3B8] font-medium">Target Regions</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {new Set(results.map(r => r.country)).size}
          </div>
        </div>
      </div>

      {/* Discovered Leads Section */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">
              {results.length > 0 ? `${results.length} Discovered Prospects` : 'Discovered Buyer Candidates'}
            </h2>
            {isDemoWorkflow && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DEMO DATA
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#050816] p-1 rounded-lg border border-[#1E293B]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${viewMode === 'cards' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Card View
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Progress Animation */}
        {searching ? (
          <div className="p-8 rounded-xl bg-[#050816] border border-purple-500/30 text-center space-y-4 max-w-md mx-auto">
            <LoadingSpinner text={searchStage || 'Searching international markets...'} />
            <div className="text-left space-y-2 text-xs font-medium pt-3 border-t border-[#1E293B]">
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
        ) : emptyStateType === 'unconfigured' ? (
          /* STATE A: No search configuration */
          <div className="p-8 rounded-2xl bg-[#050816] border border-amber-500/30 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Buyer discovery isn't connected yet.</h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Connect your buyer discovery service in Settings to find real buyers.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/settings?tab=discovery')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>Go to Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExploreSampleWorkflow}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore Sample Workflow</span>
              </button>
            </div>
          </div>
        ) : emptyStateType === 'failed' ? (
          /* STATE B: Search failed */
          <div className="p-8 rounded-2xl bg-[#050816] border border-rose-500/30 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Unable to discover buyers right now.</h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Buyer discovery is currently unavailable.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={handleExploreSampleWorkflow}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore Sample Workflow</span>
              </button>
            </div>
          </div>
        ) : emptyStateType === 'no_results' ? (
          /* STATE C: No results */
          <div className="p-8 rounded-2xl bg-[#050816] border border-[#1E293B] text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">No matching buyers found.</h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Try different countries, keywords, or buyer profiles.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdjustSearch}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <span>Adjust Search</span>
              </button>
            </div>
          </div>
        ) : results.length === 0 ? (
          /* Initial Empty State */
          <div className="p-8 rounded-2xl bg-[#050816] border border-[#1E293B] text-center space-y-4 max-w-md mx-auto">
            <Globe className="w-10 h-10 text-purple-400/60 mx-auto" />
            <div>
              <p className="text-base font-bold text-[#F8FAFC]">Ready to Discover Buyers</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Configure your target market and click Discover Buyers to search verified international prospects.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center justify-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Discover Buyers</span>
              </button>
              <button
                type="button"
                onClick={handleExploreSampleWorkflow}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] transition-all inline-flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore Sample Workflow</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View of Results */
          <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#050816] text-slate-300 border-b border-[#1E293B] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Buyer Type</th>
                  <th className="p-3">Website</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Data Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {results.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-[#050816]/60 transition-colors">
                    <td className="p-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span>{lead.company_name || lead.company}</span>
                        {lead.is_demo && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 pl-5.5">{lead.contact_name || lead.buyer_name || 'Procurement Lead'}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{lead.country || 'International'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-purple-300 font-medium">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
                        {lead.buyer_type || 'Commercial Buyer'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {lead.website ? (
                        <a 
                          href={lead.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 max-w-[140px] truncate"
                        >
                          <span>{lead.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {lead.email ? (
                        <code className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                          {lead.email}
                        </code>
                      ) : (
                        <span className="text-slate-500 italic">Not found</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.is_demo ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          DEMO DATA
                        </span>
                      ) : lead.email ? (
                        <StatusBadge status="valid" text="Verified" />
                      ) : (
                        <StatusBadge status="missing" text="No Contact" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View of Results */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((lead, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-3 shadow-sm hover:border-purple-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span>{lead.company_name || lead.company}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{lead.contact_name || lead.buyer_name || 'Procurement Lead'}</p>
                  </div>
                  {lead.is_demo ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DEMO DATA
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {lead.buyer_type}
                    </span>
                  )}
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
                        className="text-cyan-400 hover:text-cyan-300 truncate"
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
                      <span className="text-slate-500 italic">Not found</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-2 text-[11px]">
                  {lead.website && (
                    <a 
                      href={lead.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-semibold"
                    >
                      <span>Visit Site</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {lead.is_demo ? (
                    <span className="text-[10px] text-amber-400 italic">Demo record</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/classify')}
                      className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Qualify</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer notice */}
      <div className="p-3 rounded-xl bg-[#0B1220] border border-[#1E293B] text-[11px] text-slate-400 text-center">
        Direct commercial buyer discovery with verified public business contact points.
      </div>
    </div>
  );
};

export default DiscoverBuyers;
