import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  Building2,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Edit3,
  X,
  Save,
  Globe
} from 'lucide-react';
import apiService from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';
import { formatBusinessError } from '../services/errorHandler';

export const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Persisted Leads State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Optional CSV Import toggle
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Email Enrichment & Editing State
  const [enrichingIndex, setEnrichingIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingLead, setEditingLead] = useState({
    buyer_name: '',
    company_name: '',
    email: '',
    website: '',
    country: '',
    buyer_type: '',
    original_company: '',
    original_email: ''
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await apiService.getLeads();
      setLeads(res.leads || []);
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to load buyers right now.')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Retry Email Enrichment
  const handleRetryEnrichment = async (row, idx) => {
    if (enrichingIndex !== null) return; // Prevent duplicate requests
    try {
      setEnrichingIndex(idx);
      setNotification({ type: '', message: '' });

      const payload = {
        company: row.company_name || row.company,
        website: row.website,
        email: row.email,
        buyer_name: row.buyer_name || row.name
      };

      const res = await apiService.enrichLead(payload);

      if (res.success && res.email) {
        setNotification({
          type: 'success',
          message: `Email found for ${row.company_name || row.company}`
        });
        // Update matching lead in state
        setLeads(prev => prev.map((l, i) => {
          if (i === idx || (l.company_name && l.company_name === row.company_name)) {
            return { ...l, email: res.email, email_status: 'valid', valid: 'True' };
          }
          return l;
        }));
      } else {
        setNotification({
          type: 'info',
          message: 'Email could not be found. You can add it manually.'
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Email could not be found. You can add it manually.'
      });
    } finally {
      setEnrichingIndex(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (row) => {
    setEditingLead({
      buyer_name: row.buyer_name || row.name || '',
      company_name: row.company_name || row.company || '',
      email: row.email || '',
      website: row.website || '',
      country: row.country || 'International',
      buyer_type: row.buyer_type || 'Distributor',
      original_company: row.company_name || row.company || '',
      original_email: row.email || ''
    });
    setEditModalOpen(true);
  };

  // Save Manual Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const emailToVerify = editingLead.email.trim();
    if (!emailToVerify || !emailToVerify.includes('@') || !emailToVerify.includes('.')) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid email address.'
      });
      return;
    }

    try {
      setSavingEdit(true);
      setNotification({ type: '', message: '' });

      const res = await apiService.updateLead(editingLead);
      if (res.success) {
        setNotification({
          type: 'success',
          message: 'Buyer information updated.'
        });
        // Update local state
        setLeads(prev => prev.map(l => {
          if ((editingLead.original_company && (l.company_name === editingLead.original_company || l.company === editingLead.original_company)) ||
              (editingLead.original_email && l.email === editingLead.original_email)) {
            return { ...l, ...editingLead, email_status: 'valid', valid: 'True' };
          }
          return l;
        }));
        setEditModalOpen(false);
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Unable to update buyer.'
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to update buyer information.')
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // CSV Drag and Drop Upload Handler
  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotification({ type: 'error', message: 'Please upload a standard CSV file.' });
      return;
    }

    try {
      setUploading(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.uploadCSV(file);
      setLeads(res.leads || []);
      setNotification({
        type: 'success',
        message: `Successfully imported ${res.leads?.length || 0} buyer records.`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Failed to import CSV file.')
      });
    } finally {
      setUploading(false);
    }
  };

  const displayedLeads = leads.filter(r => {
    if (viewFilter === 'valid') {
      return (r.email_status === 'valid' || r.valid === 'True' || r.valid === true) && 
             (r.is_duplicate !== 'True' && r.is_duplicate !== true);
    }
    if (viewFilter === 'invalid') {
      return r.email_status === 'invalid' || 
             r.email_status === 'missing' || 
             !r.email || 
             r.is_duplicate === 'True' || 
             r.is_duplicate === true;
    }
    return true;
  });

  const columns = [
    {
      header: 'Buyer & Company',
      accessor: 'company_name',
      render: (row) => (
        <div>
          <div className="font-semibold text-white flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>{row.company_name || row.company || '—'}</span>
          </div>
          <div className="text-[11px] text-slate-400 pl-5">{row.buyer_name || row.name || 'Procurement Lead'}</div>
          {row.website && (
            <div className="text-[10px] text-cyan-400 pl-5 font-mono truncate max-w-[180px]">
              <a href={row.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {row.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Email Address & Enrichment',
      accessor: 'email',
      render: (row, rowIdx) => {
        const hasEmail = Boolean(row.email && row.email.trim());
        const isMissingOrUnverified = !hasEmail || row.email_status === 'missing' || row.email_status === 'invalid';

        if (hasEmail && !isMissingOrUnverified) {
          return (
            <div className="flex items-center gap-2">
              <code className="text-xs text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50 font-mono">
                {row.email}
              </code>
              <button
                type="button"
                onClick={() => openEditModal(row)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                title="Edit contact"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500 italic">Not found / unavailable</div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={enrichingIndex !== null}
                onClick={() => handleRetryEnrichment(row, rowIdx)}
                className="px-2 py-0.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-semibold transition-all inline-flex items-center gap-1 disabled:opacity-40"
              >
                {enrichingIndex === rowIdx ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Finding email...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Retry Enrichment</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => openEditModal(row)}
                className="px-2 py-0.5 rounded-lg bg-[#050816] hover:bg-slate-800 text-slate-300 text-[10px] font-semibold border border-[#1E293B] transition-all inline-flex items-center gap-1"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Country',
      accessor: 'country',
      render: (row) => <span className="text-slate-300">{row.country || 'International'}</span>,
    },
    {
      header: 'Category',
      accessor: 'buyer_type',
      render: (row) => (
        <span className="text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
          {row.buyer_type || 'Commercial Buyer'}
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
          return <StatusBadge status="invalid" text="Needs Email" />;
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
      <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#0B1220] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Import Buyers & Contact Data</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Review imported contacts, retry missing emails, and manage buyer profiles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/classify')}
            disabled={leads.length === 0}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Qualify Buyers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional CSV Import Accordion */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div 
          onClick={() => setShowCsvImport(!showCsvImport)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Import Existing Buyer Spreadsheet (Optional)
            </h3>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCsvImport ? 'rotate-180' : ''}`} />
        </div>

        {showCsvImport && (
          <div className="pt-3 border-t border-[#1E293B] space-y-3 animate-in fade-in duration-150">
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
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                ${isDragOver 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-[#1E293B] bg-[#050816]/50 hover:border-slate-500 hover:bg-[#050816]'}
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
                <UploadCloud className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-semibold text-white">
                  Drop CSV file here or <span className="text-purple-400 underline">browse</span>
                </span>
                <span className="text-[11px] text-slate-500">(Spreadsheet format: name, company, email, website, country)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discovered Lead Store & Verification Table */}
      <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">👥 Buyer List & Contact Verification</h2>
            <p className="text-xs text-slate-400">{displayedLeads.length} displayed ({leads.length} total)</p>
          </div>

          <div className="flex bg-[#050816] p-1 rounded-xl border border-[#1E293B] text-xs font-semibold">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewFilter === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              All Buyers ({leads.length})
            </button>
            <button
              onClick={() => setViewFilter('valid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewFilter === 'valid' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Verified Contacts ({leads.filter(r => (r.email_status === 'valid' || r.valid === 'True' || r.valid === true) && (r.is_duplicate !== 'True' && r.is_duplicate !== true)).length})
            </button>
            <button
              onClick={() => setViewFilter('invalid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewFilter === 'invalid' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Needs Email ({leads.filter(r => !r.email || r.email_status === 'missing' || r.email_status === 'invalid').length})
            </button>
          </div>
        </div>

        {viewFilter === 'invalid' && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <b>Contact Guardrail:</b> Buyers without verified email addresses are paused from campaign outreach until an email is found or manually provided.
            </span>
          </div>
        )}

        {loading ? (
          <LoadingSpinner text="Loading buyers..." />
        ) : (
          <DataTable
            columns={columns}
            data={displayedLeads}
            emptyMessage={leads.length === 0 ? "No buyers in pipeline yet. Use Discover Buyers to find prospects." : "No buyers matching selected filter."}
          />
        )}
      </div>

      {/* Manual Contact Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Edit Buyer Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editingLead.company_name}
                    onChange={(e) => setEditingLead({ ...editingLead, company_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={editingLead.buyer_name}
                    onChange={(e) => setEditingLead({ ...editingLead, buyer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Email Address * <span className="text-purple-400 font-normal">(Format validated)</span>
                </label>
                <input
                  type="email"
                  required
                  value={editingLead.email}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  placeholder="e.g. procurement@organization.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-emerald-300 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Website</label>
                  <input
                    type="text"
                    value={editingLead.website}
                    onChange={(e) => setEditingLead({ ...editingLead, website: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Country / Region</label>
                  <input
                    type="text"
                    value={editingLead.country}
                    onChange={(e) => setEditingLead({ ...editingLead, country: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
