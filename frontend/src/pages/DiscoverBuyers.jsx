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
  Square,
  Ban,
  Copy
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';
import PipelineStepper from '../components/PipelineStepper';
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

  // Filter tab: 'valid_buyers' (DEFAULT) | 'excluded'
  const [activeTab, setActiveTab] = useState('valid_buyers');
  const [excludedSubFilter, setExcludedSubFilter] = useState('all'); // 'all' | 'missing' | 'invalid' | 'duplicate'
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  // Error & Empty States: null | 'unconfigured' | 'failed' | 'no_results'
  const [emptyStateType, setEmptyStateType] = useState(null);
  const [isDemoWorkflow, setIsDemoWorkflow] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  // Manual Edit Modal State
  const [editingLead, setEditingLead] = useState(null);
  const [editFormData, setEditFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    website: '',
    country: '',
    buyer_type: ''
  });
  const [savingLead, setSavingLead] = useState(false);

  // Re-enrichment State
  const [enrichingId, setEnrichingId] = useState(null);

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
        // Handled silently
      }
    };
    loadSavedLeads();
  }, [selectedProduct?.id]);

  // Helper for non-empty strings
  function strNotEmpty(val) {
    return val && String(val).trim() !== '' && String(val).toLowerCase() !== 'none' && String(val).toLowerCase() !== 'null' && String(val).toLowerCase() !== 'undefined';
  }

  // Helper to check if a lead has a valid email and passed validation
  const isValidBuyer = (lead) => {
    const hasEmail = strNotEmpty(lead.email);
    const isValidFormat = lead.email_status === 'valid' || lead.syntax_valid === true || lead.syntax_valid === 'True';
    const isNotDup = !(lead.is_duplicate === true || lead.is_duplicate === 'True');
    return hasEmail && isValidFormat && isNotDup;
  };

  // Helper to categorize excluded reasons
  const getExcludedReason = (lead) => {
    if (lead.is_duplicate === true || lead.is_duplicate === 'True') {
      return 'Duplicate Lead';
    }
    if (!strNotEmpty(lead.email) || lead.email_status === 'missing') {
      return 'Missing Email';
    }
    if (lead.email_status === 'invalid' || lead.syntax_valid === false || lead.syntax_valid === 'False') {
      return 'Invalid Email Syntax';
    }
    return 'Excluded';
  };

  // Execute Live Buyer Search via Serper
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
      setSearchStage('1. Querying Serper.dev live Google Search index...');

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
        setSearchStage('2. Extracting company & public contact details...');
      }, 500);

      const t2 = setTimeout(() => {
        setSearchStep(3);
        setSearchStage('3. Validating email RFC syntax (Valid vs Invalid vs Missing)...');
      }, 1200);

      const t3 = setTimeout(() => {
        setSearchStep(4);
        setSearchStage('4. Deduplicating prospects and filtering valid buyers...');
      }, 1900);

      const res = await apiService.searchBuyers(payload);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setSearchStep(5);
      const discoveredBuyers = res.buyers || res.results || [];
      setResults(discoveredBuyers);
      
      const count = res.total_found ?? res.count ?? discoveredBuyers.length;
      if (count === 0) {
        setEmptyStateType('no_results');
      } else {
        const validCount = discoveredBuyers.filter(isValidBuyer).length;
        setNotification({
          type: 'success',
          message: `Discovered ${count} prospects: ${validCount} valid buyers extracted and ready for qualification.`
        });
        
        // Auto-select valid buyers
        const autoSelected = new Set(
          discoveredBuyers
            .filter(isValidBuyer)
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

      // Auto-select valid demo buyers
      const autoSelected = new Set(
        sampleBuyers
          .filter(isValidBuyer)
          .map(b => b.lead_id || b.id)
      );
      setSelectedLeadIds(autoSelected);
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

  // Select all valid leads in view
  const toggleSelectAllValid = () => {
    const validInView = validBuyers.map(r => r.lead_id || r.id);
    const allSelected = validInView.length > 0 && validInView.every(id => selectedLeadIds.has(id));

    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        validInView.forEach(id => next.delete(id));
      } else {
        validInView.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Proceed to AI Qualification
  const handleProceedToQualification = () => {
    navigate('/classify');
  };

  // Proceed to campaign creation with selected valid leads
  const handleCreateCampaign = () => {
    if (selectedLeadIds.size === 0) {
      setNotification({
        type: 'warning',
        message: 'Please select at least one valid buyer to proceed with outreach.'
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

  // Re-Enrich Lead from website
  const handleEnrichLead = async (lead) => {
    const leadId = lead.lead_id || lead.id;
    try {
      setEnrichingId(leadId);
      const res = await apiService.enrichLead({
        company: lead.company_name || lead.company,
        website: lead.website,
        email: lead.email,
        buyer_name: lead.contact_name
      });
      if (res.success && res.email) {
        setNotification({
          type: 'success',
          message: `Public email extracted for ${lead.company_name || lead.company}: ${res.email}`
        });
        setResults(prev => prev.map(item => {
          if ((item.lead_id || item.id) === leadId) {
            return {
              ...item,
              email: res.email,
              email_status: 'valid',
              syntax_valid: true,
              valid: true
            };
          }
          return item;
        }));
      } else {
        setNotification({
          type: 'warning',
          message: res.message || 'No email could be found on the public website. You can add it manually.'
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Website extraction failed or reached timeout.'
      });
    } finally {
      setEnrichingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (lead) => {
    setEditingLead(lead);
    setEditFormData({
      company_name: lead.company_name || lead.company || '',
      contact_name: lead.contact_name || '',
      email: lead.email || '',
      website: lead.website || '',
      country: lead.country || 'United States',
      buyer_type: lead.buyer_type || 'Distributor'
    });
  };

  // Save Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.email || !editFormData.company_name) {
      setNotification({ type: 'warning', message: 'Company name and a valid email are required.' });
      return;
    }

    try {
      setSavingLead(true);
      const res = await apiService.updateLead({
        original_company: editingLead?.company_name || editingLead?.company,
        original_email: editingLead?.email,
        company_name: editFormData.company_name,
        contact_name: editFormData.contact_name,
        email: editFormData.email,
        website: editFormData.website,
        country: editFormData.country,
        buyer_type: editFormData.buyer_type
      });

      if (res.success) {
        setNotification({ type: 'success', message: 'Buyer contact information updated successfully.' });
        const updatedLead = res.lead;
        setResults(prev => prev.map(item => {
          if ((item.lead_id || item.id) === (editingLead.lead_id || editingLead.id)) {
            return { ...item, ...updatedLead };
          }
          return item;
        }));
        setEditingLead(null);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Failed to update buyer contact details.')
      });
    } finally {
      setSavingLead(false);
    }
  };

  // ==========================================
  // METRICS & FILTERED DATASETS
  // ==========================================
  const totalDiscovered = results.length;
  const extractedCount = results.filter(r => strNotEmpty(r.company_name || r.company) && (strNotEmpty(r.website) || strNotEmpty(r.source_url) || strNotEmpty(r.snippet))).length || totalDiscovered;
  
  // Valid buyers: email exists, syntax is valid, not duplicate
  const validBuyers = results.filter(isValidBuyer);
  const validEmailCount = validBuyers.length;

  // Excluded buyers breakdown
  const missingEmailBuyers = results.filter(r => !strNotEmpty(r.email) || r.email_status === 'missing');
  const missingEmailCount = missingEmailBuyers.length;

  const invalidEmailBuyers = results.filter(r => strNotEmpty(r.email) && (r.email_status === 'invalid' || r.syntax_valid === false || r.syntax_valid === 'False'));
  const invalidEmailCount = invalidEmailBuyers.length;

  const duplicateBuyers = results.filter(r => r.is_duplicate === true || r.is_duplicate === 'True');
  const duplicateCount = duplicateBuyers.length;

  const excludedBuyers = results.filter(r => !isValidBuyer(r));
  const excludedCount = excludedBuyers.length;

  // Active dataset based on tabs
  const displayedLeads = activeTab === 'valid_buyers' 
    ? validBuyers 
    : excludedBuyers.filter(lead => {
        if (excludedSubFilter === 'missing') return !strNotEmpty(lead.email) || lead.email_status === 'missing';
        if (excludedSubFilter === 'invalid') return strNotEmpty(lead.email) && (lead.email_status === 'invalid' || lead.syntax_valid === false || lead.syntax_valid === 'False');
        if (excludedSubFilter === 'duplicate') return lead.is_duplicate === true || lead.is_duplicate === 'True';
        return true;
      });

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Official 6-Stage Pipeline Stepper */}
      <PipelineStepper 
        currentStage={1} 
        stats={{ 
          total_leads: totalDiscovered,
          websites_processed: extractedCount,
          valid_emails: validEmailCount,
          qualified_buyers: validBuyers.filter(b => b.qualification_status === 'qualified').length,
          successful_sends: 0
        }} 
      />

      {/* Page Header */}
      <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#0B1220] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC]">Buyer Discovery & Extraction</h1>
              {isDemoWorkflow && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEMO DATA
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Live Search $\rightarrow$ Extraction $\rightarrow$ Validation $\rightarrow$ Only Valid Emails Enter Qualification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto z-10">
          <button
            onClick={handleProceedToQualification}
            disabled={validEmailCount === 0}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-200 border border-[#1E293B] text-xs font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Qualification</span>
          </button>

          <button
            onClick={handleCreateCampaign}
            disabled={selectedLeadIds.size === 0}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
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
              <span className="font-bold text-amber-300">DEMO DATA WORKFLOW:</span> Demonstration records for testing the validation and AI classification pipeline. Live emails cannot be sent to demo buyers.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsDemoWorkflow(false);
              setResults([]);
              setSelectedLeadIds(new Set());
            }}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 shrink-0 cursor-pointer"
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
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Discovery Parameters</h2>
          </div>
          <span className="text-[11px] text-[#94A3B8]">Targeting: <b className="text-[#F8FAFC]">{product}</b></span>
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
            <label className="block font-semibold text-slate-300 mb-1">Search Keywords</label>
            <input
              ref={searchInputRef}
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. sound healing bowl importer, singing bowl distributor, wellness wholesale"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-sans"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-[#94A3B8]">
              * Live Serper search extracts genuine contact details. Missing or invalid emails are filtered before qualification.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={searching || loadingSample}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{searching ? 'Discovering Buyers...' : 'Discover Buyers'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Official 6-Metric Display Summary */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-4 shadow-xl">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Discovery & Extraction Summary</span>
          <span className="text-slate-400 font-normal">Valid email is a hard gate for AI qualification</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8]">Total Discovered</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalDiscovered}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8]">Extracted</div>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">{extractedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-emerald-500/40 bg-emerald-950/15">
            <div className="text-[11px] text-emerald-400 font-bold">Valid Emails</div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{validEmailCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-amber-500/20 bg-amber-950/10">
            <div className="text-[11px] text-amber-400 font-medium">Missing Emails</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{missingEmailCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-rose-500/20 bg-rose-950/10">
            <div className="text-[11px] text-rose-400 font-medium">Invalid Emails</div>
            <div className="text-xl font-bold text-rose-300 mt-0.5">{invalidEmailCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#050816] border border-purple-500/20 bg-purple-950/10">
            <div className="text-[11px] text-purple-400 font-medium">Duplicates</div>
            <div className="text-xl font-bold text-purple-300 mt-0.5">{duplicateCount}</div>
          </div>
        </div>
      </div>

      {/* Discovered Leads Section */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
          {/* Primary View & Excluded Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('valid_buyers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'valid_buyers' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/40' 
                  : 'bg-[#050816] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valid Buyers ({validEmailCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('excluded')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'excluded' 
                  ? 'bg-rose-600/90 text-white shadow-md shadow-rose-600/25 border border-rose-400/40' 
                  : 'bg-[#050816] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>View Excluded ({excludedCount})</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            {activeTab === 'excluded' && (
              <div className="flex items-center gap-1 bg-[#050816] p-1 rounded-lg border border-[#1E293B] text-[11px]">
                <button
                  type="button"
                  onClick={() => setExcludedSubFilter('all')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${excludedSubFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                >
                  All ({excludedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExcludedSubFilter('missing')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${excludedSubFilter === 'missing' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                >
                  Missing ({missingEmailCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExcludedSubFilter('invalid')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${excludedSubFilter === 'invalid' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                >
                  Invalid ({invalidEmailCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExcludedSubFilter('duplicate')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${excludedSubFilter === 'duplicate' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                >
                  Duplicates ({duplicateCount})
                </button>
              </div>
            )}

            <div className="flex bg-[#050816] p-1 rounded-lg border border-[#1E293B]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${viewMode === 'table' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Card View
              </button>
            </div>
          </div>
        </div>

        {/* Primary Header Headline */}
        <div className="flex items-center justify-between">
          {activeTab === 'valid_buyers' ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-sm font-bold text-white">
                {validEmailCount} Valid Buyers Found
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                · Verified email syntax · Ready for AI Qualification
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <h2 className="text-sm font-bold text-rose-300">
                {excludedCount} Excluded Prospects
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                · Missing email, invalid format, or duplicate records excluded from campaign eligibility
              </span>
            </div>
          )}
        </div>

        {/* Real-time Progress Animation */}
        {searching ? (
          <div className="p-8 rounded-xl bg-[#050816] border border-purple-500/30 text-center space-y-4 max-w-md mx-auto">
            <LoadingSpinner text={searchStage || 'Searching international markets...'} />
            <div className="text-left space-y-2 text-xs font-medium pt-3 border-t border-[#1E293B]">
              <div className={`flex items-center gap-2 ${searchStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 1 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>1. Querying live Serper Google Search API...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 2 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>2. Extracting company & public contact details...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 3 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>3. Validating email RFC syntax (Valid vs Invalid vs Missing)...</span>
              </div>
              <div className={`flex items-center gap-2 ${searchStep >= 4 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {searchStep >= 4 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
                <span>4. Deduplicating and filtering valid email records...</span>
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
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Go to Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExploreSampleWorkflow}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              <h3 className="text-base font-bold text-[#F8FAFC]">Buyer discovery failed.</h3>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                External search request failed or timed out. Please verify your connection or try again.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={handleExploreSampleWorkflow}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Discover Buyers</span>
              </button>
              <button
                type="button"
                onClick={handleExploreSampleWorkflow}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore Sample Workflow</span>
              </button>
            </div>
          </div>
        ) : displayedLeads.length === 0 ? (
          /* Empty state for current tab */
          <div className="p-8 rounded-xl bg-[#050816] border border-[#1E293B] text-center space-y-3">
            <p className="text-xs text-slate-400">
              {activeTab === 'valid_buyers' 
                ? 'No valid email buyers found in the current search. Review excluded records or retry discovery.' 
                : 'No excluded prospects in this category.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#050816] text-slate-300 border-b border-[#1E293B] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  {activeTab === 'valid_buyers' && (
                    <th className="p-3 w-8">
                      <button
                        type="button"
                        onClick={toggleSelectAllValid}
                        title="Select all valid buyers"
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    </th>
                  )}
                  <th className="p-3">Company & Contact</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Buyer Type</th>
                  <th className="p-3">Website</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Email Status</th>
                  <th className="p-3">AI Qualification</th>
                  <th className="p-3">Pipeline Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {displayedLeads.map((lead) => {
                  const id = lead.lead_id || lead.id;
                  const isValid = isValidBuyer(lead);
                  const isSelected = selectedLeadIds.has(id);
                  const contactDisplay = lead.contact_name || 'Company Team';
                  const excludedReason = getExcludedReason(lead);

                  return (
                    <tr 
                      key={id} 
                      className={`hover:bg-[#050816]/60 transition-colors ${isSelected && isValid ? 'bg-purple-950/20' : ''}`}
                    >
                      {activeTab === 'valid_buyers' && (
                        <td className="p-3">
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
                        </td>
                      )}

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

                      <td className="p-3 text-slate-400">
                        {lead.website ? (
                          <a 
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 underline text-[11px] flex items-center gap-1"
                          >
                            <span>{lead.website.replace(/^https?:\/\//, '').slice(0, 20)}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        {lead.email ? (
                          <code className={`px-2 py-0.5 rounded border ${isValid ? 'text-emerald-300 bg-emerald-950/40 border-emerald-900/50' : 'text-rose-300 bg-rose-950/40 border-rose-900/50'}`}>
                            {lead.email}
                          </code>
                        ) : (
                          <span className="text-amber-400/80 italic font-sans text-xs">Missing Email</span>
                        )}
                      </td>

                      <td className="p-3">
                        {isValid ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Valid Email</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            <span>{excludedReason}</span>
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
                            Not Qualified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lead.qualification_status === 'needs_review' ? 'Needs Review' : 'Pending AI'}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {isValid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Validation Passed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Excluded
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isValid && lead.website && (
                            <button
                              type="button"
                              onClick={() => handleEnrichLead(lead)}
                              disabled={enrichingId === id}
                              title="Re-attempt website contact extraction"
                              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${enrichingId === id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lead)}
                            title="Edit contact details manually"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
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
            {displayedLeads.map((lead) => {
              const id = lead.lead_id || lead.id;
              const isValid = isValidBuyer(lead);
              const isSelected = selectedLeadIds.has(id);
              const contactDisplay = lead.contact_name || 'Company Team';
              const excludedReason = getExcludedReason(lead);

              return (
                <div 
                  key={id} 
                  className={`p-4 rounded-xl bg-[#050816] border space-y-3 shadow-sm transition-all ${
                    isSelected && isValid 
                      ? 'border-purple-500 bg-purple-950/15 shadow-md shadow-purple-500/10' 
                      : 'border-[#1E293B] hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2">
                      {isValid && (
                        <button
                          type="button"
                          onClick={() => toggleSelectLead(id)}
                          className="text-purple-400 hover:text-purple-300 mt-0.5 cursor-pointer"
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
                        <p className="text-xs text-slate-400 mt-0.5 pl-5">
                          {contactDisplay}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isValid ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Valid Email
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          {excludedReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#1E293B]">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">Market / Country</span>
                      <span className="text-slate-200 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{lead.country || 'International'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] block">Buyer Category</span>
                      <span className="text-purple-300 font-medium mt-0.5 block truncate">
                        {lead.buyer_type || 'Distributor'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs bg-[#080D1D] p-2.5 rounded-lg border border-[#1E293B]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Email:</span>
                      {lead.email ? (
                        <code className="text-emerald-300 font-mono text-[11px] truncate max-w-[170px]">
                          {lead.email}
                        </code>
                      ) : (
                        <span className="text-amber-400/80 italic text-[11px]">Missing</span>
                      )}
                    </div>

                    {lead.website && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Website:</span>
                        <a 
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline text-[11px] flex items-center gap-1 truncate max-w-[170px]"
                        >
                          <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="text-[11px] text-slate-400">
                      Score: <b className="text-purple-300">{lead.ai_score ?? '—'}</b>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isValid && lead.website && (
                        <button
                          type="button"
                          onClick={() => handleEnrichLead(lead)}
                          disabled={enrichingId === id}
                          className="px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold cursor-pointer"
                        >
                          Extract
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lead)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Contact Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Edit Buyer Contact Details</span>
              </h3>
              <button 
                onClick={() => setEditingLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.company_name}
                  onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Contact Name (Leave empty if unknown)</label>
                <input
                  type="text"
                  placeholder="Optional (defaults to 'Company Team')"
                  value={editFormData.contact_name}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. procurement@company.com"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={editFormData.country}
                    onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Buyer Category</label>
                  <input
                    type="text"
                    value={editFormData.buyer_type}
                    onChange={(e) => setEditFormData({ ...editFormData, buyer_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Website URL</label>
                <input
                  type="text"
                  placeholder="https://www.example.com"
                  value={editFormData.website}
                  onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingLead ? 'Saving...' : 'Save & Validate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverBuyers;
