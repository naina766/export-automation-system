import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Check
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

  // Leads available for this campaign
  const [allLeads, setAllLeads] = useState([]);
  const [eligibleLeads, setEligibleLeads] = useState([]);
  const [excludedLeads, setExcludedLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set(location.state?.selectedLeadIds || []));
  
  // Single test recipient state
  const [isTestMode, setIsTestMode] = useState(false);
  const [customRecipient, setCustomRecipient] = useState({
    email: '',
    name: '',
    company: '',
    country: '',
    buyer_type: ''
  });
  
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Synchronize when selectedProduct updates
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
      const excluded = leadsList.filter(l => l.outreach_status !== 'eligible');
      setEligibleLeads(eligible);
      setExcludedLeads(excluded);

      // If location.state didn't pass specific IDs, default to selecting all eligible
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

  // Preview lead selection
  const targetedLeads = eligibleLeads.filter(l => selectedLeadIds.has(l.lead_id || l.id));
  const previewLead = isTestMode ? {
    contact_name: customRecipient.name.trim() || 'Valued Partner',
    company_name: customRecipient.company.trim() || 'Partner Organization',
    country: customRecipient.country.trim() || 'International',
    buyer_type: customRecipient.buyer_type.trim() || 'Wholesale Buyer',
    email: customRecipient.email.trim() || 'partner@organization.com'
  } : (targetedLeads[0] || {
    contact_name: 'Company Team',
    company_name: 'Targeted Buyer LLC',
    country: 'United States',
    buyer_type: 'Distributor',
    email: 'procurement@buyer.com'
  });

  const previewContact = previewLead.contact_name || 'Company Team';
  const previewCompany = previewLead.company_name || previewLead.company || 'your organization';
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
          recipient_name: customRecipient.name.trim() || 'Test Partner',
          company_name: customRecipient.company.trim() || 'Test Enterprise',
          country: customRecipient.country.trim() || 'International',
          buyer_type: customRecipient.buyer_type.trim() || 'Distributor',
          subject,
          body_template: body,
          attach_presentation: attachPdf
        };
        res = await apiService.sendTestEmail(payload);
        setResults({
          dispatched: res.dispatched || 1,
          failed: res.failed || 0,
          results: [{
            recipient: customRecipient.email.trim(),
            company_name: customRecipient.company.trim() || 'Test Enterprise',
            status: res.success ? 'sent' : 'failed',
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
        message: `Campaign dispatch completed: ${res.results?.dispatched || res.dispatched || 1} emails sent successfully.`
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

      {/* Official 6-Stage Pipeline Stepper */}
      <PipelineStepper 
        currentStage={5} 
        stats={{ 
          total_leads: allLeads.length,
          valid_emails: eligibleLeads.length + excludedLeads.length,
          qualified_buyers: eligibleLeads.length,
          successful_sends: (allLeads.filter(l => l.outreach_status === 'sent' || l.sent === true).length)
        }} 
      />

      {/* Header */}
      <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#0B1220] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#F8FAFC]">Campaign Outreach Dispatcher</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Personalized B2B email outreach with Gmail SMTP transport and product isolation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTestMode(!isTestMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isTestMode 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : 'bg-[#050816] text-slate-300 border-[#1E293B] hover:text-white'
            }`}
          >
            {isTestMode ? '✓ Test Mode Active' : 'Switch to Test Recipient'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Recipients */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Product & Target Summary Card */}
          <div className="p-4 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs border-b border-[#1E293B] pb-2.5">
              <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-400" />
                <span>Campaign Product (Isolated):</span>
              </span>
              <span className="font-bold text-white bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-800/40">
                {currentProductName}
              </span>
            </div>

            {/* Recipient Selection Mode */}
            {isTestMode ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Single Test Recipient Mode (Won't affect production records)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Recipient Email *</label>
                    <input
                      type="email"
                      value={customRecipient.email}
                      onChange={(e) => setCustomRecipient({ ...customRecipient, email: e.target.value })}
                      placeholder="e.g. your-test-email@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={customRecipient.company}
                      onChange={(e) => setCustomRecipient({ ...customRecipient, company: e.target.value })}
                      placeholder="e.g. Sample Wellness LLC"
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Selected Outreach-Eligible Buyers ({selectedLeadIds.size} of {eligibleLeads.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/discover')}
                    className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                  >
                    Discover more buyers
                  </button>
                </div>

                {eligibleLeads.length === 0 ? (
                  <div className="p-5 rounded-xl bg-[#050816] border border-amber-500/30 text-center space-y-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">0 AI-Qualified Recipients Found</div>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Buyers must have a valid email AND pass Stage 4 (AI Qualification) before entering Gmail outreach.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate('/classify')}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Run AI Qualification</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTestMode(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#0B1220] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer"
                      >
                        Send Single Test Email
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {eligibleLeads.map((lead) => {
                      const id = lead.lead_id || lead.id;
                      const isSelected = selectedLeadIds.has(id);
                      return (
                        <div
                          key={id}
                          onClick={() => toggleSelectLead(id)}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-purple-950/20 border-purple-500/50 text-white' 
                              : 'bg-[#050816] border-[#1E293B] text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded bg-[#050816] border-[#1E293B] text-purple-600 cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">{lead.company_name || lead.company}</div>
                              <div className="text-[10px] text-slate-400">{lead.email} • {lead.country}</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Eligible
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Template Editor */}
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Email Copy & Placeholders</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Body Template</label>
              <textarea
                ref={textareaRef}
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-y"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-400">Insert tag:</span>
                {[
                  { label: 'Product', tag: '{{product_name}}' },
                  { label: 'Company', tag: '{{company_name}}' },
                  { label: 'Contact', tag: '{{contact_name}}' },
                  { label: 'Country', tag: '{{country}}' },
                  { label: 'Buyer Type', tag: '{{buyer_type}}' },
                ].map(({ label, tag }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="px-2 py-0.5 rounded bg-[#050816] hover:bg-purple-950/40 text-purple-300 hover:text-purple-200 border border-[#1E293B] hover:border-purple-500/40 font-mono text-[10px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    title={`Click to insert ${tag} into email body`}
                  >
                    <span>+</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Presentation Attachment Toggle */}
            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Paperclip className="w-4 h-4 text-purple-400" />
                <div className="text-xs">
                  <div className="font-bold text-white">Attach Product Presentation Catalog (PDF)</div>
                  <div className="text-[11px] text-slate-400">assets/company_presentation.pdf (Wholesale catalog)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded bg-[#050816] border-[#1E293B] text-purple-600 cursor-pointer"
              />
            </div>

            {/* Launch Review Button */}
            <button
              type="button"
              onClick={handleOpenReview}
              disabled={sending || (!isTestMode && selectedLeadIds.size === 0)}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Review Campaign & Recipients ({isTestMode ? '1 Test' : selectedLeadIds.size})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Live Preview & Dispatch Results */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Live Personalization Preview</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Sample: {previewLead.company_name || previewLead.company}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-3 text-xs">
              <div className="border-b border-[#1E293B] pb-2 space-y-1">
                <div className="text-slate-400 text-[11px]">To: <code className="text-emerald-400 font-mono">{previewLead.email}</code></div>
                <div className="text-white font-bold">{previewSubject}</div>
              </div>

              <div className="text-slate-200 whitespace-pre-line leading-relaxed text-[11px] font-sans">
                {previewBody}
              </div>

              {attachPdf && (
                <div className="pt-2 border-t border-[#1E293B] flex items-center gap-2 text-[10px] text-purple-300">
                  <Paperclip className="w-3 h-3" />
                  <span>Attached: Himalayan_Singing_Bowls_Export_Catalog.pdf</span>
                </div>
              )}
            </div>
          </div>

          {/* Results Summary if Dispatched */}
          {results && (
            <div className="bg-[#0B1220] border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Outreach Dispatch Summary</span>
                </div>
                <span className="text-xs text-white">
                  <b>{results.dispatched || 0}</b> Sent • <b>{results.failed || 0}</b> Failed
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {(results.results || []).map((r, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                      r.status === 'sent' 
                        ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' 
                        : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{r.company_name || r.recipient}</div>
                      <div className="text-[10px] opacity-75 font-mono">{r.recipient}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                      r.status === 'sent' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
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

      {/* Campaign Review & Explicit Confirmation Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B1220] border border-purple-500/40 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Review Campaign Before Dispatch</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B] space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Product:</span>
                  <span className="font-bold text-white">{currentProductName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Recipients:</span>
                  <span className="font-bold text-emerald-400">
                    {isTestMode ? '1 Single Test Recipient' : `${selectedLeadIds.size} Outreach-Eligible Buyers`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attachment:</span>
                  <span className="text-slate-200">{attachPdf ? 'Product Catalog PDF' : 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Delivery Transport:</span>
                  <span className="text-purple-300 font-mono">Gmail SMTP (STARTTLS)</span>
                </div>
              </div>

              {!isTestMode && targetedLeads.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Recipients to be contacted:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-xl bg-[#050816] border border-[#1E293B] text-[11px]">
                    {targetedLeads.map(l => (
                      <div key={l.lead_id || l.id} className="flex items-center justify-between text-slate-300 py-0.5">
                        <span className="font-medium">{l.company_name || l.company}</span>
                        <code className="text-emerald-400 font-mono text-[10px]">{l.email}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-[#050816] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={sending}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Sending Emails...' : 'Confirm & Launch Outreach'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendCampaign;
