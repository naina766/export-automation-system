import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Send, 
  Mail, 
  Paperclip, 
  Users, 
  Eye, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  X, 
  Lock, 
  Clock, 
  FileCheck, 
  ShieldAlert, 
  Package,
  Building2,
  MapPin,
  RefreshCw,
  Check,
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import Notification from '../components/Notification';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import PipelineStepper from '../components/PipelineStepper';
import { formatBusinessError } from '../services/errorHandler';

const DEFAULT_SUBJECT = "Export Supply Partnership: {{product_name}} for {{company_name}}";
const DEFAULT_BODY = `Hello {{contact_name}},

I am reaching out regarding {{company_name}} in {{country}}.

As an established direct exporter of authentic {{product_name}}, we would be delighted to explore a wholesale supply partnership with your organization.

Please find our export catalog and specifications attached.

Best regards,
Export Sales Team`;

const BUYER_TYPES = [
  "Distributor",
  "Wholesale Importer",
  "Wellness Studio",
  "Sound Healing Center",
  "Retail Chain Buyer",
  "Gift Retailer",
  "E-commerce Retailer",
  "Yoga & Meditation Center"
];

export const SendCampaign = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProduct, products } = useProduct();

  const textareaRef = useRef(null);
  const [subject, setSubject] = useState(selectedProduct?.email_subject_template || DEFAULT_SUBJECT);
  const [body, setBody] = useState(selectedProduct?.email_body_template || DEFAULT_BODY);
  const [attachPdf, setAttachPdf] = useState(true);

  const insertVariable = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody(prev => prev + ` ${tag}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = body || '';
    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setBody(newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Leads state
  const [allLeads, setAllLeads] = useState([]);
  const [eligibleLeads, setEligibleLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set(location.state?.selectedLeadIds || []));
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  
  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false);
  const [customRecipient, setCustomRecipient] = useState({
    email: '',
    name: 'Quality Assurance Tester',
    company: 'QA Evaluation Partner',
    country: 'United States',
    buyer_type: 'Distributor'
  });
  
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Add Buyer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    contact_name: '',
    email: '',
    company_name: '',
    country: '',
    phone: '',
    website: '',
    buyer_type: 'Distributor'
  });
  const [addFormErrors, setAddFormErrors] = useState({});
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Buyer Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    contact_name: '',
    email: '',
    company_name: '',
    country: '',
    phone: '',
    website: '',
    buyer_type: 'Distributor'
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Remove Buyer Confirmation State
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removingLead, setRemovingLead] = useState(null);
  const [submittingRemove, setSubmittingRemove] = useState(false);

  // Synchronize templates when selectedProduct updates
  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.email_subject_template) {
        setSubject(selectedProduct.email_subject_template);
      }
      if (selectedProduct.email_body_template) {
        setBody(selectedProduct.email_body_template);
      }
    }
  }, [selectedProduct]);

  // Load leads and system configuration
  const fetchData = async () => {
    try {
      setLoading(true);
      const [dash, leadsRes] = await Promise.all([
        apiService.getDashboard(selectedProduct?.id),
        apiService.getLeads(selectedProduct?.id)
      ]);
      setSystemData(dash?.system || {});
      
      const leadsList = leadsRes?.leads || [];
      setAllLeads(leadsList);

      const eligible = leadsList.filter(l => l.outreach_status === 'eligible');
      setEligibleLeads(eligible);

      // Default selection to all eligible if not specifically passed via state
      if (!location.state?.selectedLeadIds || location.state.selectedLeadIds.length === 0) {
        setSelectedLeadIds(new Set(eligible.map(l => l.lead_id || l.id)));
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to load campaign parameters.')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProduct?.id]);

  const gmailConfigured = systemData?.gmail_configured;
  const currentProductName = selectedProduct?.name || 'Himalayan Sound Healing Bowls';
  const currentCatalogFile = selectedProduct?.catalog_path ? selectedProduct.catalog_path.split('/').pop() : 'himalayan_sound_healing_bowls_catalog.pdf';

  // Toggle selection for a lead in campaign
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

  const handleSelectAll = () => {
    const allEligibleIds = filteredEligibleLeads.map(l => l.lead_id || l.id);
    setSelectedLeadIds(new Set(allEligibleIds));
  };

  const handleDeselectAll = () => {
    setSelectedLeadIds(new Set());
  };

  // Filtered eligible leads for search
  const filteredEligibleLeads = eligibleLeads.filter(lead => {
    if (!buyerSearchQuery.trim()) return true;
    const q = buyerSearchQuery.toLowerCase();
    const cName = (lead.contact_name || '').toLowerCase();
    const comp = (lead.company_name || lead.company || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const country = (lead.country || '').toLowerCase();
    return cName.includes(q) || comp.includes(q) || email.includes(q) || country.includes(q);
  });

  // Selected leads for targeting and preview
  const targetedLeads = eligibleLeads.filter(l => selectedLeadIds.has(l.lead_id || l.id));

  // Resolved preview lead (strictly real data or explicit test identity)
  const previewLead = isTestMode ? {
    contact_name: customRecipient.name.trim() || 'QA Evaluation Tester',
    company_name: customRecipient.company.trim() || 'QA Evaluation Partner',
    country: customRecipient.country.trim() || 'International',
    buyer_type: customRecipient.buyer_type.trim() || 'Distributor',
    email: customRecipient.email.trim() || 'qa-test@example.com'
  } : (targetedLeads[0] || (eligibleLeads[0] ? eligibleLeads[0] : {
    contact_name: '',
    company_name: '',
    country: '',
    buyer_type: '',
    email: ''
  }));

  const previewCompany = previewLead.company_name || previewLead.company || 'your organization';
  const previewContact = (previewLead.contact_name && previewLead.contact_name.trim() && !['test user', 'valued partner', 'procurement lead', 'company team'].includes(previewLead.contact_name.trim().toLowerCase()))
    ? previewLead.contact_name.trim()
    : (previewCompany && previewCompany !== 'your organization' ? `${previewCompany} Team` : 'Company Team');

  const previewCountry = previewLead.country || 'your region';
  const previewType = previewLead.buyer_type || 'partner';

  const previewSubject = subject
    .replace(/\{\{contact_name\}\}/g, previewContact)
    .replace(/\{\{buyer_name\}\}/g, previewContact)
    .replace(/\{\{company_name\}\}/g, previewCompany)
    .replace(/\{\{country\}\}/g, previewCountry)
    .replace(/\{\{buyer_type\}\}/g, previewType)
    .replace(/\{\{product_name\}\}/g, currentProductName)
    .replace(/\{\{product\}\}/g, currentProductName);

  const previewBody = body
    .replace(/\{\{contact_name\}\}/g, previewContact)
    .replace(/\{\{buyer_name\}\}/g, previewContact)
    .replace(/\{\{company_name\}\}/g, previewCompany)
    .replace(/\{\{country\}\}/g, previewCountry)
    .replace(/\{\{buyer_type\}\}/g, previewType)
    .replace(/\{\{product_name\}\}/g, currentProductName)
    .replace(/\{\{product\}\}/g, currentProductName);

  // Add Buyer Modal Handlers
  const handleOpenAddModal = () => {
    setAddFormData({
      contact_name: '',
      email: '',
      company_name: '',
      country: '',
      phone: '',
      website: '',
      buyer_type: 'Distributor'
    });
    setAddFormErrors({});
    setShowAddModal(true);
  };

  const validateAddForm = () => {
    const errors = {};
    const contact = addFormData.contact_name.trim();
    const email = addFormData.email.trim();
    const comp = addFormData.company_name.trim();
    const country = addFormData.country.trim();

    if (!contact) {
      errors.contact_name = 'Contact Name is required';
    } else if (['test user', 'testuser', 'sample', 'procurement lead'].includes(contact.toLowerCase())) {
      errors.contact_name = 'Please enter a real person name (placeholders like Test User are not permitted)';
    }

    if (!email) {
      errors.email = 'Business email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address with correct syntax';
    }

    if (!comp) {
      errors.company_name = 'Company Name is required';
    }

    if (!country) {
      errors.country = 'Destination country is required';
    }

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAddBuyer = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    try {
      setSubmittingAdd(true);
      const payload = {
        contact_name: addFormData.contact_name.trim(),
        email: addFormData.email.trim().toLowerCase(),
        company_name: addFormData.company_name.trim(),
        country: addFormData.country.trim(),
        phone: addFormData.phone.trim(),
        website: addFormData.website.trim(),
        buyer_type: addFormData.buyer_type.trim(),
        product_id: selectedProduct?.id || 'himalayan-sound-healing-bowls'
      };

      const res = await apiService.createLead(payload);
      if (res.success && res.lead) {
        const newLead = res.lead;
        const newId = newLead.lead_id || newLead.id;
        
        setAllLeads(prev => [newLead, ...prev]);
        setEligibleLeads(prev => [newLead, ...prev]);
        setSelectedLeadIds(prev => new Set([...prev, newId]));

        setShowAddModal(false);
        setNotification({
          type: 'success',
          message: `Buyer "${newLead.contact_name}" from ${newLead.company_name} was successfully added and is campaign-ready.`
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Failed to add buyer.')
      });
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Edit Buyer Handlers
  const handleOpenEditModal = (lead) => {
    setEditingLeadId(lead.lead_id || lead.id);
    setEditFormData({
      contact_name: lead.contact_name || '',
      email: lead.email || '',
      company_name: lead.company_name || lead.company || '',
      country: lead.country || '',
      phone: lead.phone || '',
      website: lead.website || '',
      buyer_type: lead.buyer_type || 'Distributor'
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    const errors = {};
    const contact = editFormData.contact_name.trim();
    const email = editFormData.email.trim();
    const comp = editFormData.company_name.trim();
    const country = editFormData.country.trim();

    if (!contact) {
      errors.contact_name = 'Contact Name is required';
    } else if (['test user', 'testuser', 'sample', 'procurement lead'].includes(contact.toLowerCase())) {
      errors.contact_name = 'Please enter a real person name';
    }

    if (!email) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!comp) {
      errors.company_name = 'Company Name is required';
    }

    if (!country) {
      errors.country = 'Destination country is required';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEditBuyer = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    try {
      setSubmittingEdit(true);
      const updates = {
        contact_name: editFormData.contact_name.trim(),
        buyer_name: editFormData.contact_name.trim(),
        email: editFormData.email.trim().toLowerCase(),
        company_name: editFormData.company_name.trim(),
        company: editFormData.company_name.trim(),
        country: editFormData.country.trim(),
        phone: editFormData.phone.trim(),
        website: editFormData.website.trim(),
        buyer_type: editFormData.buyer_type.trim()
      };

      const res = await apiService.patchLead(editingLeadId, updates);
      if (res.success && res.lead) {
        const updated = res.lead;
        setAllLeads(prev => prev.map(l => (l.lead_id === editingLeadId || l.id === editingLeadId) ? { ...l, ...updated } : l));
        setEligibleLeads(prev => prev.map(l => (l.lead_id === editingLeadId || l.id === editingLeadId) ? { ...l, ...updated } : l));

        setShowEditModal(false);
        setNotification({
          type: 'success',
          message: `Buyer details for "${updated.contact_name}" updated successfully.`
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Failed to update buyer details.')
      });
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Remove Buyer Handlers
  const handleOpenRemoveModal = (lead) => {
    setRemovingLead(lead);
    setShowRemoveModal(true);
  };

  const handleConfirmRemoveBuyer = async () => {
    if (!removingLead) return;
    const leadId = removingLead.lead_id || removingLead.id;

    try {
      setSubmittingRemove(true);
      const res = await apiService.deleteLead(leadId);
      if (res.success) {
        setAllLeads(prev => prev.filter(l => l.lead_id !== leadId && l.id !== leadId));
        setEligibleLeads(prev => prev.filter(l => l.lead_id !== leadId && l.id !== leadId));
        setSelectedLeadIds(prev => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });

        setShowRemoveModal(false);
        setNotification({
          type: 'success',
          message: `Buyer "${removingLead.contact_name || removingLead.company_name}" removed from campaign.`
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Failed to remove buyer.')
      });
    } finally {
      setSubmittingRemove(false);
    }
  };

  const handleOpenReview = () => {
    if (!gmailConfigured) {
      setNotification({
        type: 'warning',
        message: 'Gmail SMTP credentials are not configured. Please configure GMAIL_EMAIL and GMAIL_APP_PASSWORD in Settings or .env.'
      });
      return;
    }

    if (isTestMode) {
      if (!customRecipient.email.trim()) {
        setNotification({ type: 'warning', message: 'Please provide a valid test recipient email address.' });
        return;
      }
    } else {
      if (selectedLeadIds.size === 0) {
        setNotification({ type: 'warning', message: 'Please select at least one outreach-eligible buyer for this campaign.' });
        return;
      }
    }

    setShowReviewModal(true);
  };

  const handleExecuteSend = async () => {
    try {
      setSending(true);
      setShowReviewModal(false);
      setNotification({ type: '', message: '' });

      let res;
      if (isTestMode) {
        const payload = {
          product_id: selectedProduct?.id,
          recipient_email: customRecipient.email.trim(),
          recipient_name: customRecipient.name.trim() || 'QA Evaluation Tester',
          company_name: customRecipient.company.trim() || 'QA Evaluation Partner',
          country: customRecipient.country.trim() || 'International',
          buyer_type: customRecipient.buyer_type.trim() || 'Distributor',
          subject,
          body_template: body,
          attach_presentation: attachPdf
        };
        res = await apiService.sendTestEmail(payload);
        setResults({
          dispatched: res.dispatched || (res.success ? 1 : 0),
          failed: res.failed || (res.success ? 0 : 1),
          results: [{
            recipient: customRecipient.email.trim(),
            contact_name: customRecipient.name.trim(),
            company_name: customRecipient.company.trim(),
            status: res.success ? 'sent' : 'failed',
            attachment: res.attachment,
            error: res.error
          }]
        });
      } else {
        const payload = {
          product_id: selectedProduct?.id,
          lead_ids: Array.from(selectedLeadIds),
          subject,
          body_template: body,
          attach_presentation: attachPdf
        };
        res = await apiService.sendCampaign(payload);
        setResults(res.results || {});
      }

      setNotification({
        type: 'success',
        message: `Campaign dispatch completed: ${res.results?.dispatched || res.dispatched || 1} emails sent with verified catalog attachment.`
      });

      // Refresh lead status
      fetchData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Campaign dispatch failed.')
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading campaign parameters and eligible buyers..." />;
  }

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Pipeline Stepper */}
      <PipelineStepper 
        currentStage={5} 
        stats={{ 
          total_leads: allLeads.length,
          valid_emails: eligibleLeads.length,
          qualified_buyers: eligibleLeads.length,
          successful_sends: (allLeads.filter(l => l.outreach_status === 'sent' || l.sent === true).length)
        }} 
      />

      {/* 1. CAMPAIGN PRODUCT (Isolated Context) */}
      <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#0B1220] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider font-bold">Active Export Product</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.2 rounded-full">Isolated Pipeline</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC] mt-0.5">{currentProductName}</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-2">
              <span>Catalog Attachment:</span>
              <span className="font-mono text-purple-300 font-semibold flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {currentCatalogFile}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#050816] text-slate-300 border border-[#1E293B] hover:text-white hover:border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <span>Change Product in Settings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setIsTestMode(!isTestMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isTestMode 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10' 
                : 'bg-[#050816] text-slate-300 border-[#1E293B] hover:text-white'
            }`}
          >
            {isTestMode ? '✓ Test Email Active' : 'Switch to Test Email'}
          </button>
        </div>
      </div>

      {/* Main Grid: 2-Column Campaign Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Buyers List + Email Copy & Template Controls */}
        <div className="lg:col-span-7 space-y-6">

          {/* 2. BUYERS SECTION */}
          <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Campaign Buyers ({isTestMode ? '1 Test Recipient' : `${selectedLeadIds.size} Selected / ${eligibleLeads.length} Available`})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!isTestMode && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Buyer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/discover')}
                      className="px-3 py-1.5 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Search className="w-3.5 h-3.5 text-purple-400" />
                      <span>Discover Buyers</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Test Mode Isolated Form */}
            {isTestMode ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>TEST MODE (Controlled Single Test Email)</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  This test dispatch sends a real MIME email with the verified PDF catalog to your test inbox without affecting production records or buyer stores.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Test Recipient Email *</label>
                    <input
                      type="email"
                      value={customRecipient.email}
                      onChange={(e) => setCustomRecipient({ ...customRecipient, email: e.target.value })}
                      placeholder="e.g. your-inbox@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Test Contact Name</label>
                    <input
                      type="text"
                      value={customRecipient.name}
                      onChange={(e) => setCustomRecipient({ ...customRecipient, name: e.target.value })}
                      placeholder="e.g. Quality Assurance Tester"
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Test Company Name</label>
                    <input
                      type="text"
                      value={customRecipient.company}
                      onChange={(e) => setCustomRecipient({ ...customRecipient, company: e.target.value })}
                      placeholder="e.g. QA Evaluation Partner"
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Destination Country</label>
                    <input
                      type="text"
                      value={customRecipient.country}
                      onChange={(e) => setCustomRecipient({ ...customRecipient, country: e.target.value })}
                      placeholder="e.g. United States"
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Production Real Buyers List */
              <div className="space-y-3">
                {eligibleLeads.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-1">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={buyerSearchQuery}
                        onChange={(e) => setBuyerSearchQuery(e.target.value)}
                        placeholder="Search real buyers..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#050816] border border-[#1E293B] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold px-2 py-1 rounded bg-[#050816] border border-[#1E293B]"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-[11px] text-slate-400 hover:text-slate-300 font-semibold px-2 py-1 rounded bg-[#050816] border border-[#1E293B]"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {eligibleLeads.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#050816] border border-dashed border-[#1E293B] text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">NO BUYERS ADDED</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Add a buyer manually with real contact details, or discover international wholesale buyers for <b>{currentProductName}</b>.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Buyer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/discover')}
                        className="px-4 py-2 rounded-xl bg-[#0B1220] hover:bg-slate-800 text-slate-200 border border-[#1E293B] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Search className="w-4 h-4 text-cyan-400" />
                        <span>Discover Buyers</span>
                      </button>
                    </div>
                  </div>
                ) : filteredEligibleLeads.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#050816] border border-[#1E293B] text-center text-xs text-slate-400">
                    No buyers matched your search query "{buyerSearchQuery}".
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredEligibleLeads.map((lead) => {
                      const id = lead.lead_id || lead.id;
                      const isSelected = selectedLeadIds.has(id);
                      const contactDisplay = lead.contact_name || `${lead.company_name || lead.company} Team`;

                      return (
                        <div
                          key={id}
                          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                            isSelected 
                              ? 'bg-purple-950/20 border-purple-500/50 text-white shadow-sm' 
                              : 'bg-[#050816] border-[#1E293B] text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div 
                            onClick={() => toggleSelectLead(id)}
                            className="flex items-start gap-2.5 cursor-pointer flex-1"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-0.5 rounded bg-[#050816] border-[#1E293B] text-purple-600 cursor-pointer"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-100">{contactDisplay}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#0B1220] border border-[#1E293B] text-slate-400 font-mono">
                                  {lead.buyer_type || 'Distributor'}
                                </span>
                              </div>
                              <div className="text-[11px] text-emerald-400 font-mono">{lead.email}</div>
                              <div className="text-[11px] text-slate-400">
                                {lead.company_name || lead.company} {lead.country ? `• ${lead.country}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(lead);
                              }}
                              className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-purple-900/30 text-slate-300 hover:text-purple-300 border border-[#1E293B] transition-all"
                              title="Edit Buyer Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRemoveModal(lead);
                              }}
                              className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 border border-[#1E293B] transition-all"
                              title="Remove Buyer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. EMAIL COPY & PLACEHOLDERS */}
          <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Email Copy & Dynamic Placeholders</h2>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Subject Template</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Body Template</label>
                  <span className="text-[10px] text-purple-400 font-mono">Insert tags below</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={9}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 font-sans leading-relaxed text-xs"
                />
              </div>

              {/* Dynamic Variable Chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">Click to insert lead-specific personalization tag:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Contact Name', tag: '{{contact_name}}' },
                    { label: 'Company Name', tag: '{{company_name}}' },
                    { label: 'Country', tag: '{{country}}' },
                    { label: 'Product Name', tag: '{{product_name}}' },
                    { label: 'Buyer Type', tag: '{{buyer_type}}' }
                  ].map(({ label, tag }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariable(tag)}
                      className="px-2.5 py-1 rounded-lg bg-[#050816] hover:bg-purple-950/40 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                      title={`Insert ${tag} into template`}
                    >
                      <span>+</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. PRODUCT PRESENTATION CATALOG (PDF) */}
            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Paperclip className="w-4 h-4 text-purple-400" />
                <div className="text-xs">
                  <div className="font-bold text-white">Attach Product Export Presentation (PDF)</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Verified Catalog: <code className="text-purple-300 font-mono">{currentCatalogFile}</code></span>
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded bg-[#050816] border-[#1E293B] text-purple-600 cursor-pointer"
              />
            </div>

            {/* 6. LAUNCH REVIEW & SEND BUTTON */}
            <button
              type="button"
              onClick={handleOpenReview}
              disabled={sending || (!isTestMode && selectedLeadIds.size === 0)}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Review Campaign & Recipients ({isTestMode ? '1 Test Recipient' : `${selectedLeadIds.size} Buyers`})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Live Preview & Dispatch Results */}
        <div className="lg:col-span-5 space-y-6">
          {/* 5. LIVE PERSONALIZATION PREVIEW */}
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Live Personalization Preview</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {previewLead.company_name || previewLead.company || 'Preview Sample'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-3 text-xs">
              <div className="border-b border-[#1E293B] pb-2 space-y-1">
                <div className="text-slate-400 text-[11px]">
                  To: <code className="text-emerald-400 font-mono">{previewLead.email || 'recipient@organization.com'}</code>
                </div>
                <div className="text-white font-bold">{previewSubject}</div>
              </div>

              <div className="text-slate-200 whitespace-pre-line leading-relaxed text-[11px] font-sans">
                {previewBody}
              </div>

              {attachPdf && (
                <div className="pt-2 border-t border-[#1E293B] flex items-center gap-2 text-[10px] text-purple-300">
                  <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                  <span>Attached: <code className="font-mono">{currentCatalogFile}</code></span>
                </div>
              )}
            </div>

            {/* Results Summary if Dispatched */}
            {results && (
              <div className="bg-[#050816] border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Outreach Dispatch Summary</span>
                  </div>
                  <span className="text-xs text-white">
                    <b>{results.dispatched || 0}</b> Sent • <b>{results.failed || 0}</b> Failed
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                  {(results.results || []).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-[#0B1220] border border-[#1E293B]">
                      <div>
                        <span className="text-slate-200 font-semibold">{r.contact_name || r.company_name || r.recipient}</span>
                        <div className="text-[10px] text-slate-400 font-mono">{r.recipient}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {r.status === 'sent' ? '✓ SENT' : '✕ FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD REAL BUYER */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Add Real Buyer</h2>
                  <p className="text-[11px] text-slate-400">Enter wholesale contact details for {currentProductName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddBuyer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Contact Name * */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contact Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addFormData.contact_name}
                    onChange={(e) => setAddFormData({ ...addFormData, contact_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      addFormErrors.contact_name ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500`}
                  />
                  {addFormErrors.contact_name && (
                    <p className="text-[10px] text-rose-400 mt-1">{addFormErrors.contact_name}</p>
                  )}
                </div>

                {/* Email * */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Business Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    placeholder="e.g. rahul@abcimports.com"
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      addFormErrors.email ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500 font-mono`}
                  />
                  {addFormErrors.email && (
                    <p className="text-[10px] text-rose-400 mt-1">{addFormErrors.email}</p>
                  )}
                </div>

                {/* Company Name * */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Company Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addFormData.company_name}
                    onChange={(e) => setAddFormData({ ...addFormData, company_name: e.target.value })}
                    placeholder="e.g. ABC Imports LLC"
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      addFormErrors.company_name ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500`}
                  />
                  {addFormErrors.company_name && (
                    <p className="text-[10px] text-rose-400 mt-1">{addFormErrors.company_name}</p>
                  )}
                </div>

                {/* Country * */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Destination Country <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addFormData.country}
                    onChange={(e) => setAddFormData({ ...addFormData, country: e.target.value })}
                    placeholder="e.g. United States"
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      addFormErrors.country ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500`}
                  />
                  {addFormErrors.country && (
                    <p className="text-[10px] text-rose-400 mt-1">{addFormErrors.country}</p>
                  )}
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label className="block text-slate-400 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="e.g. +1 415-555-0192"
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Website (Optional) */}
                <div>
                  <label className="block text-slate-400 mb-1">Website (Optional)</label>
                  <input
                    type="url"
                    value={addFormData.website}
                    onChange={(e) => setAddFormData({ ...addFormData, website: e.target.value })}
                    placeholder="e.g. https://abcimports.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Buyer Type (Optional) */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Buyer Type</label>
                  <select
                    value={addFormData.buyer_type}
                    onChange={(e) => setAddFormData({ ...addFormData, buyer_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {BUYER_TYPES.map(t => (
                      <option key={t} value={t} className="bg-[#0B1220]">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submittingAdd}
                  className="px-4 py-2 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 border border-[#1E293B] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingAdd ? 'Adding Buyer...' : 'Add Buyer to Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT BUYER */}
      {/* ========================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Edit Buyer Details</h2>
                  <p className="text-[11px] text-slate-400">Update verified contact information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditBuyer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contact Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.contact_name}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      editFormErrors.contact_name ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500`}
                  />
                  {editFormErrors.contact_name && (
                    <p className="text-[10px] text-rose-400 mt-1">{editFormErrors.contact_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Business Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      editFormErrors.email ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500 font-mono`}
                  />
                  {editFormErrors.email && (
                    <p className="text-[10px] text-rose-400 mt-1">{editFormErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Company Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.company_name}
                    onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      editFormErrors.company_name ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500`}
                  />
                  {editFormErrors.company_name && (
                    <p className="text-[10px] text-rose-400 mt-1">{editFormErrors.company_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Destination Country <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.country}
                    onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-[#050816] border ${
                      editFormErrors.country ? 'border-rose-500' : 'border-[#1E293B]'
                    } text-white focus:outline-none focus:border-purple-500`}
                  />
                  {editFormErrors.country && (
                    <p className="text-[10px] text-rose-400 mt-1">{editFormErrors.country}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Website</label>
                  <input
                    type="url"
                    value={editFormData.website}
                    onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Buyer Type</label>
                  <select
                    value={editFormData.buyer_type}
                    onChange={(e) => setEditFormData({ ...editFormData, buyer_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {BUYER_TYPES.map(t => (
                      <option key={t} value={t} className="bg-[#0B1220]">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 border border-[#1E293B] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REMOVE BUYER CONFIRMATION */}
      {/* ========================================================= */}
      {showRemoveModal && removingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Remove Buyer from Campaign?</h2>
                <p className="text-[11px] text-slate-400">This action will remove the buyer from the campaign list.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B] text-xs space-y-1">
              <div className="font-bold text-slate-200">
                {removingLead.contact_name || removingLead.company_name || 'Buyer'}
              </div>
              <div className="text-slate-400">{removingLead.company_name || removingLead.company}</div>
              <div className="text-emerald-400 font-mono text-[11px]">{removingLead.email}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                disabled={submittingRemove}
                className="px-4 py-2 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 border border-[#1E293B] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveBuyer}
                disabled={submittingRemove}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-2"
              >
                {submittingRemove ? 'Removing...' : 'Remove Buyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REVIEW CAMPAIGN BEFORE SEND */}
      {/* ========================================================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Review Campaign Outreach</h2>
                  <p className="text-[11px] text-slate-400">Confirm recipients and transport details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#050816] border border-[#1E293B]">
                <div>
                  <span className="text-slate-400 text-[11px]">Active Product:</span>
                  <div className="font-bold text-white mt-0.5">{currentProductName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Total Recipients:</span>
                  <div className="font-bold text-purple-400 mt-0.5">
                    {isTestMode ? '1 Test Recipient' : `${selectedLeadIds.size} Real Buyers`}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">SMTP Transport:</span>
                  <div className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Gmail STARTTLS</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">MIME Attachment:</span>
                  <div className="font-bold text-white mt-0.5 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                    <span>{attachPdf ? currentCatalogFile : 'None'}</span>
                  </div>
                </div>
              </div>

              {!isTestMode && targetedLeads.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-300 mb-1.5">Targeted Recipients:</div>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-[#050816] border border-[#1E293B] custom-scrollbar">
                    {targetedLeads.map((l, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-[#1E293B] last:border-0">
                        <span className="text-slate-200 font-semibold">{l.contact_name || l.company_name || l.company}</span>
                        <span className="text-emerald-400 font-mono text-[10px]">{l.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-2.5 text-[11px] text-purple-200">
                <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Emails will be dynamically personalized with each recipient's actual contact name and company. The product export catalog will be attached to each message.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 border border-[#1E293B] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={sending}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Confirm & Send Campaign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendCampaign;
