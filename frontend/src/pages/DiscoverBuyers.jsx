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
  Send,
  RefreshCw,
  Edit3,
  X,
  AlertTriangle,
  CheckSquare,
  Square
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
  const { selectedProduct } = useProduct();
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

  // Filter tab: 'eligible' | 'all' | 'valid_email' | 'no_email' | 'qualified' | 'rejected'
  const [activeFilter, setActiveFilter] = useState('eligible');
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

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

  // Load existing leads for this product on initial mount
  useEffect(() => {
    const loadSavedLeads = async () => {
      try {
        const res = await apiService.getLeads(selectedProduct?.id);
        if (res && res.leads && res.leads.length > 0) {
          setResults(res.leads);
        }
      } catch (e) {
        // Ignore initial load error
      }
    };
    loadSavedLeads();
  }, [selectedProduct?.id]);

  // Execute Live Buyer Search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (searching) return;

    try {
      setSearching(true);
      setEmptyStateType(null);
      setIsDemoWorkflow(false);
      setSelectedLeadIds(new Set());
      setNotification({ type: '', message: '' });
      setSearchStep(1);
      setSearchStage('Querying global search API...');

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
        setSearchStage('Analyzing B2B search results...');
      }, 400);

      const t2 = setTimeout(() => {
        setSearchStep(3);
        setSearchStage('Extracting public company details...');
      }, 900);

      const t3 = setTimeout(() => {
        setSearchStep(4);
        setSearchStage('Validating email formats (RFC syntax)...');
      }, 1500);

      const t4 = setTimeout(() => {
        setSearchStep(5);
        setSearchStage('Deduplicating & checking historical outreach...');
      }, 2100);

      const t5 = setTimeout(() => {
        setSearchStep(6);
        setSearchStage('Preparing outreach candidates...');
      }, 2700);

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
        const eligibleCount = discoveredBuyers.filter(b => b.outreach_status === 'eligible').length;
        setNotification({
          type: 'success',
          message: `Discovered ${count} international prospects (${eligibleCount} ready for qualification & outreach).`
        });
        // Auto-select eligible leads
        const autoSelected = new Set(
          discoveredBuyers
            .filter(b => b.outreach_status === 'eligible')
            .map(b => b.lead_id || b.id)
        );
        setSelectedLeadIds(autoSelected);
      }
    } catch (err) {
      const errDetail = err.response?.data?.detail;
      if (
        errDetail?.error === 'SEARCH_PROVIDER_NOT_CONFIGURED' || 
        errDetail?.error === 'UNSUPPORTED_SEARCH_PROVIDER' || 
        err.response?.status === 422
      ) {
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
      setSelectedLeadIds(new Set());
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

  // Toggle selection for a lead
  const toggleSelectLead = (id) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all eligible leads in view
  const toggleSelectAllEligible = () => {
    const eligibleInView = filteredResults.filter(r => r.outreach_status === 'eligible').map(r => r.lead_id || r.id);
    const allSelected = eligibleInView.every(id => selectedLeadIds.has(id));

    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        eligibleInView.forEach(id => next.delete(id));
      } else {
        eligibleInView.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Proceed to campaign creation with selected eligible leads
  const handleCreateCampaign = () => {
    if (selectedLeadIds.size === 0) {
      setNotification({
        type: 'warning',
        message: 'Please select at least one outreach-eligible buyer to create a campaign.'
      });
      return;
    }

    if (isDemoWorkflow) {
      setNotification({
        type: 'warning',
        message: 'Demo records cannot enter production campaigns. Connect your search service for real buyer outreach.'
      });
      return;
    }

    navigate('/send', {
      state: {
        selectedLeadIds: Array.from(selectedLeadIds),
        productId: selectedProduct?.id
      }
    });
  };

  // Computed summary metrics
  const totalDiscovered = results.length;
  const withEmailCount = results.filter(r => r.email && strNotEmpty(r.email)).length;
  const validEmailCount = results.filter(r => r.email_status === 'valid' || r.syntax_valid === true).length;
  const aiQualifiedCount = results.filter(r => r.qualification_status === 'qualified').length;
  const outreachEligibleCount = results.filter(r => r.outreach_status === 'eligible').length;
  const excludedCount = totalDiscovered - outreachEligibleCount;

  function strNotEmpty(val) {
    return val && String(val).trim() !== '' && String(val).toLowerCase() !== 'none' && String(val).toLowerCase() !== 'null';
  }

  // Filtered results based on active tab
  const filteredResults = results.filter(r => {
    if (activeFilter === 'eligible') {
      return r.outreach_status === 'eligible';
    }
    if (activeFilter === 'valid_email') {
      return r.email_status === 'valid' || r.syntax_valid === true;
    }
    if (activeFilter === 'no_email') {
      return !r.email || r.email_status === 'missing' || r.email_status === 'invalid';
    }
    if (activeFilter === 'qualified') {
      return r.qualification_status === 'qualified';
    }
    if (activeFilter === 'rejected') {
      return r.qualification_status === 'rejected' || r.qualification_status === 'needs_review';
    }
    return true; // 'all'
  });

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
              Live B2B lead discovery: Search $\rightarrow$ Email Syntax Check $\rightarrow$ AI Qualification $\rightarrow$ Outreach.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto z-10">
          <button
            onClick={() => navigate('/classify')}
            disabled={results.length === 0}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-200 border border-[#1E293B] text-xs font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Qualification</span>
          </button>

          <button
            onClick={handleCreateCampaign}
            disabled={selectedLeadIds.size === 0}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Create Campaign ({selectedLeadIds.size})</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
              setSelectedLeadIds(new Set());
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
          <span className="text-[11px] text-[#94A3B8]">Targeting Product: <b className="text-[#F8FAFC]">{product}</b></span>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Target Country / Market</label>
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-[#94A3B8]">
              * Discovers active commercial buyers and extracts verified public business contact points.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={searching || loadingSample}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>{searching ? 'Discovering Buyers...' : 'Discover Buyers'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Outreach Pipeline Summary Bar */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-4 shadow-xl">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Outreach Eligibility Funnel</span>
          <span className="text-slate-400 font-normal">Strict Pipeline: Only valid & qualified buyers reach outreach</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8]">Total Discovered</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalDiscovered}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8]">With Email</div>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">{withEmailCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8]">Syntax Valid</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{validEmailCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8]">AI Qualified</div>
            <div className="text-xl font-bold text-purple-400 mt-0.5">{aiQualifiedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-emerald-500/30 bg-emerald-950/10">
            <div className="text-[11px] text-emerald-400 font-semibold">Outreach Eligible</div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{outreachEligibleCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-rose-500/20 bg-rose-950/10">
            <div className="text-[11px] text-rose-400">Excluded (No Mail/Fit)</div>
            <div className="text-xl font-bold text-rose-300 mt-0.5">{excludedCount}</div>
          </div>
        </div>
      </div>

      {/* Discovered Leads Section */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#050816] p-1 rounded-xl border border-[#1E293B]">
            <button
              type="button"
              onClick={() => setActiveFilter('eligible')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'eligible' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Outreach Eligible ({outreachEligibleCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'all' 
                  ? 'bg-purple-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Discovered ({totalDiscovered})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('valid_email')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'valid_email' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Syntax Valid ({validEmailCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('no_email')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'no_email' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Missing / Invalid ({excludedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('qualified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'qualified' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AI Qualified ({aiQualifiedCount})
            </button>
          </div>

          {/* View Mode Toggle */}
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
                <span>Querying global search API...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 2 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Analyzing B2B search results...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 3 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Extracting public company details...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 4 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 4 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Validating email formats (RFC syntax)...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 5 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Deduplicating & checking historical outreach...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 6 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 6 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>Preparing outreach candidates...</span>
              </div>
            </div>
          </div>
        ) : emptyStateType === 'unconfigured' ? (
          /* STATE A: Search Provider unconfigured */
          <div className="p-8 rounded-2xl bg-[#050816] border border-purple-500/30 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Search API Key Required</h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Configure your <code className="text-purple-300">SEARCH_API_KEY</code> in Settings or backend environment.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/settings')}
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
                External search request failed or timed out. Please verify your connection or try again.
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
        ) : emptyStateType === 'no_results' || results.length === 0 ? (
          /* STATE C: No results / Ready state */
          <div className="p-8 rounded-2xl bg-[#050816] border border-[#1E293B] text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Ready to Discover Buyers</h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                Configure your target market and click <b>Discover Buyers</b> to locate verified international prospects.
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
          /* Table View */
          <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#050816] text-slate-300 border-b border-[#1E293B] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-8">
                    <button
                      type="button"
                      onClick={toggleSelectAllEligible}
                      title="Select all outreach-eligible in view"
                      className="text-slate-400 hover:text-white"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="p-3">Company & Contact</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Buyer Type</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Email Status</th>
                  <th className="p-3">AI Qualification</th>
                  <th className="p-3">Outreach Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {filteredResults.map((lead) => {
                  const id = lead.lead_id || lead.id;
                  const isEligible = lead.outreach_status === 'eligible';
                  const isSelected = selectedLeadIds.has(id);
                  const contactDisplay = lead.contact_name || 'Company Team';

                  return (
                    <tr 
                      key={id} 
                      className={`hover:bg-[#050816]/60 transition-colors ${isSelected ? 'bg-purple-950/20' : ''}`}
                    >
                      <td className="p-3">
                        {isEligible ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectLead(id)}
                            className="text-purple-400 hover:text-purple-300 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        ) : (
                          <span title="Not eligible for email campaign" className="text-slate-700 cursor-not-allowed">
                            <Square className="w-4 h-4" />
                          </span>
                        )}
                      </td>

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
                        <div className="text-[11px] text-slate-400 pl-5.5">{contactDisplay}</div>
                      </td>

                      <td className="p-3 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{lead.country || 'International'}</span>
                        </div>
                      </td>

                      <td className="p-3 text-purple-300 font-medium">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
                          {lead.buyer_type || 'Distributor'}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        {lead.email ? (
                          <code className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                            {lead.email}
                          </code>
                        ) : (
                          <span className="text-slate-500 italic">Missing</span>
                        )}
                      </td>

                      <td className="p-3">
                        {lead.email_status === 'valid' || lead.syntax_valid === true ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Syntax Valid
                          </span>
                        ) : lead.email_status === 'invalid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Invalid Syntax
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Missing
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {lead.qualification_status === 'qualified' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Qualified ({lead.ai_score ?? 85})
                          </span>
                        ) : lead.qualification_status === 'rejected' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lead.qualification_status === 'needs_review' ? 'Needs Review' : 'Pending AI'}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {isEligible ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>OUTREACH ELIGIBLE</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Not Eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResults.map((lead) => {
              const id = lead.lead_id || lead.id;
              const isEligible = lead.outreach_status === 'eligible';
              const isSelected = selectedLeadIds.has(id);
              const contactDisplay = lead.contact_name || 'Company Team';

              return (
                <div 
                  key={id} 
                  className={`p-4 rounded-xl bg-[#050816] border space-y-3 shadow-sm transition-all ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-950/10' 
                      : 'border-[#1E293B] hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2">
                      {isEligible && (
                        <button
                          type="button"
                          onClick={() => toggleSelectLead(id)}
                          className="text-purple-400 hover:text-purple-300 mt-0.5"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          <span>{lead.company_name || lead.company}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{contactDisplay}</p>
                      </div>
                    </div>
                    {lead.is_demo ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        DEMO
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
                        <span className="text-slate-500 italic">Email Missing</span>
                      )}
                    </div>
                  </div>

                  {/* Status Badges Row */}
                  <div className="pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    {isEligible ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ELIGIBLE</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Not Eligible
                      </span>
                    )}

                    {lead.qualification_status === 'qualified' && (
                      <span className="text-[10px] text-purple-300 font-bold">
                        Score: {lead.ai_score ?? 85}/100
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar when Leads are selected */}
      {selectedLeadIds.size > 0 && (
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-[#0B1220]/95 backdrop-blur border border-purple-500/40 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span><b>{selectedLeadIds.size}</b> outreach-eligible buyer{selectedLeadIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <button
            onClick={handleCreateCampaign}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Create Campaign ({selectedLeadIds.size})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscoverBuyers;
