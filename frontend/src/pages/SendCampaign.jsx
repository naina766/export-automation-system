import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Package
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import Notification from '../components/Notification';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
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
  const { selectedProduct, setSelectedProduct, products } = useProduct();
  const [audience, setAudience] = useState('business');
  const [subject, setSubject] = useState(selectedProduct?.email_subject_template || DEFAULT_SUBJECT);
  const [body, setBody] = useState(selectedProduct?.email_body_template || DEFAULT_BODY);
  const [attachPdf, setAttachPdf] = useState(true);

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

  // Single test recipient state
  const [customRecipient, setCustomRecipient] = useState({
    email: '',
    name: '',
    company: '',
    country: '',
    buyer_type: ''
  });
  
  const [systemData, setSystemData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dash, cls] = await Promise.all([
        apiService.getDashboard(),
        apiService.getClassification()
      ]);
      setSystemData(dash?.system || {});
      setClassData(cls || {});
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
  }, []);

  const gmailConfigured = systemData?.gmail_configured;
  const targetProduct = systemData?.search_keyword || 'Himalayan Sound Healing Bowls';

  // Calculate targeted count
  const getTargetCount = () => {
    if (audience === 'custom') return customRecipient.email.trim() ? 1 : 0;
    if (audience === 'business') return classData?.business_count || 0;
    if (audience === 'individual') return classData?.individual_count || 0;
    return (classData?.business_count || 0) + (classData?.individual_count || 0);
  };

  // Preview lead selection from actual classified data or neutral fallbacks
  const firstLead = (classData?.business_leads && classData.business_leads[0]) || (classData?.leads && classData.leads[0]) || {};
  const previewLead = audience === 'custom' ? {
    name: customRecipient.name.trim() || 'Valued Partner',
    company: customRecipient.company.trim() || 'Partner Organization',
    country: customRecipient.country.trim() || 'International',
    buyer_type: customRecipient.buyer_type.trim() || 'Wholesale Buyer',
    email: customRecipient.email.trim() || 'partner@organization.com'
  } : {
    name: firstLead.name || firstLead.buyer_name || 'Valued Partner',
    company: firstLead.company || firstLead.company_name || 'Partner Organization',
    country: firstLead.country || 'International',
    buyer_type: firstLead.buyer_type || 'Wholesale Buyer',
    email: firstLead.email || 'partner@organization.com'
  };

  const currentProductName = selectedProduct?.name || targetProduct;

  const previewSubject = subject
    .replace(/\{\{buyer_name\}\}/g, previewLead.name)
    .replace(/\{\{contact_name\}\}/g, previewLead.name)
    .replace(/\{\{company_name\}\}/g, previewLead.company)
    .replace(/\{\{country\}\}/g, previewLead.country)
    .replace(/\{\{buyer_type\}\}/g, previewLead.buyer_type)
    .replace(/\{\{product_name\}\}/g, currentProductName)
    .replace(/\{\{product\}\}/g, currentProductName);

  const previewBody = body
    .replace(/\{\{buyer_name\}\}/g, previewLead.name)
    .replace(/\{\{contact_name\}\}/g, previewLead.name)
    .replace(/\{\{company_name\}\}/g, previewLead.company)
    .replace(/\{\{country\}\}/g, previewLead.country)
    .replace(/\{\{buyer_type\}\}/g, previewLead.buyer_type)
    .replace(/\{\{product_name\}\}/g, currentProductName)
    .replace(/\{\{product\}\}/g, currentProductName);

  const handleOpenDispatchModal = () => {
    if (!gmailConfigured) {
      setNotification({
        type: 'error',
        message: 'Email service connection required. Please connect your email account in Settings.'
      });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setNotification({ type: 'error', message: 'Subject and Message cannot be empty.' });
      return;
    }
    if (audience === 'custom' && !customRecipient.email.trim()) {
      setNotification({ type: 'error', message: 'Please enter a target email address for the test email.' });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmAndSend = async () => {
    setShowConfirmModal(false);
    try {
      setSending(true);
      setNotification({ type: '', message: '' });
      setResults(null);

      const payload = {
        product_id: selectedProduct?.id,
        audience,
        subject,
        body_template: body,
        attach_presentation: attachPdf,
        custom_email: audience === 'custom' ? customRecipient.email.trim() : undefined,
        custom_buyer_name: audience === 'custom' ? customRecipient.name.trim() : undefined,
        custom_company_name: audience === 'custom' ? customRecipient.company.trim() : undefined,
        custom_country: audience === 'custom' ? customRecipient.country.trim() : undefined,
        custom_buyer_type: audience === 'custom' ? customRecipient.buyer_type.trim() : undefined,
      };

      const res = await apiService.sendCampaign(payload);
      setResults(res.results);

      if (res.results?.sent_count > 0) {
        setNotification({
          type: 'success',
          message: `Outreach completed! Dispatched ${res.results.sent_count} personalized email(s).`
        });
      } else {
        setNotification({
          type: 'warning',
          message: 'Outreach run completed. ' + (res.results?.messages?.join(' ') || '')
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to send outreach campaign. Please check your email connection and try again.')
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner text="Preparing outreach dashboard..." />;

  const targetCount = getTargetCount();

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Campaign Step Indicator */}
      <div className="flex items-center justify-between bg-[#0B1220] border border-[#1E293B] rounded-xl p-3.5 overflow-x-auto gap-2 shadow-sm">
        {[
          { num: 1, label: 'Select Recipients' },
          { num: 2, label: 'Compose Message' },
          { num: 3, label: 'Personalization' },
          { num: 4, label: 'Review & Launch' },
          { num: 5, label: 'Results' },
        ].map((step, idx) => (
          <div key={step.num} className="flex items-center gap-2 flex-shrink-0">
            <span className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold flex items-center justify-center">
              {step.num}
            </span>
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">{step.label}</span>
            {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 mx-2" />}
          </div>
        ))}
      </div>

      {/* Email Account Readiness Banner */}
      {!gmailConfigured ? (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-200 flex items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <b>Email Account Setup Required:</b> Connect your sending account in Settings to enable direct buyer outreach.
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0"
          >
            Connect Account
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 flex items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <b>Email Account Connected:</b> Ready to send personalized outreach directly to verified buyer inboxes.
            </div>
          </div>
          <StatusBadge status="valid" text="Connected" />
        </div>
      )}

      {/* Pre-Campaign Summary Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Qualified Buyers</div>
          <div className="text-xl font-bold text-purple-400 mt-0.5">{classData?.business_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Valid Contacts</div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{classData?.business_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Already Contacted</div>
          <div className="text-xl font-bold text-amber-400 mt-0.5">0</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Ready to Send</div>
          <div className="text-xl font-bold text-[#F8FAFC] mt-0.5">{targetCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Campaign Editor Form */}
        <div className="lg:col-span-7 bg-[#0B1220] border border-[#1E293B] rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>✉️ Compose Outreach Message</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Recipients
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'business', label: '🏢 Business Buyers', count: `${classData?.business_count || 0} Leads` },
                { id: 'individual', label: '👤 Individuals', count: `${classData?.individual_count || 0} Leads` },
                { id: 'all', label: '🌐 All Qualified', count: `${(classData?.business_count || 0) + (classData?.individual_count || 0)} Leads` },
                { id: 'custom', label: '🎯 Send Test Email', count: customRecipient.email.trim() ? '1 Custom' : 'Single' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAudience(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${audience === item.id ? 'border-purple-500 bg-purple-500/15 text-white shadow-sm' : 'border-[#1E293B] bg-[#050816] text-slate-400 hover:border-slate-500'}`}
                >
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.count}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Single Test Recipient Inputs */}
          {audience === 'custom' && (
            <div className="p-4 rounded-xl bg-[#050816] border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                <UserCheck className="w-4 h-4" />
                <span>Test Email Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customRecipient.email}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, email: e.target.value })}
                    placeholder="e.g. partner@organization.com"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={customRecipient.name}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, name: e.target.value })}
                    placeholder="e.g. Procurement Director"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={customRecipient.company}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, company: e.target.value })}
                    placeholder="e.g. Sound Wellness LLC"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Country / Region
                  </label>
                  <input
                    type="text"
                    value={customRecipient.country}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, country: e.target.value })}
                    placeholder="e.g. United States"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
              placeholder="Enter subject..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Message Body
              </label>
              <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1.5">
                <span>&#123;&#123;contact_name&#125;&#125;</span>
                <span>&#123;&#123;company_name&#125;&#125;</span>
                <span>&#123;&#123;country&#125;&#125;</span>
                <span>&#123;&#123;product&#125;&#125;</span>
              </div>
            </div>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
            />

            {/* Template Variable Helper */}
            {(subject.includes('{{product_name}}') || subject.includes('{{product}}') || body.includes('{{product_name}}') || body.includes('{{product}}')) && (
              <div className="mt-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-300">Using active product: </span>
                    <b className="text-white">{currentProductName}</b>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">Need to change the product used in this message?</span>
                  <button
                    type="button"
                    onClick={() => navigate('/settings?tab=catalog')}
                    className="text-purple-400 hover:text-purple-300 font-bold underline inline-flex items-center gap-0.5 shrink-0"
                  >
                    <span>Manage Product Settings</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B] flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700"
              />
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                <span>Attach Product Presentation Catalog (PDF)</span>
              </span>
            </label>
            <div className="flex items-center gap-2">
              <a
                href={apiService.getCatalogUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold underline flex items-center gap-1"
              >
                <span>View Catalog</span>
              </a>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Brochure Ready</span>
              </span>
            </div>
          </div>

          {/* Sending Progress Indicator */}
          {sending && (
            <div className="p-4 rounded-xl bg-[#050816] border border-purple-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400 animate-spin" />
                  <span>Connecting and dispatching outreach...</span>
                </span>
                <span className="text-purple-400 font-mono">In Progress</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}

          <button
            onClick={handleOpenDispatchModal}
            disabled={sending || targetCount === 0 || !gmailConfigured}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>
              {sending 
                ? 'Dispatching outreach...' 
                : audience === 'custom' 
                  ? 'Send Test Email' 
                  : `Launch Outreach — ${targetCount} Recipient${targetCount === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>

        {/* Live Personalization Preview Card */}
        <div className="lg:col-span-5 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Personalization Preview</h3>
              </div>
              <span className="text-[11px] text-slate-400">{previewLead.name} ({previewLead.country})</span>
            </div>

            <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-3 font-sans text-xs">
              <div className="border-b border-[#1E293B] pb-2.5">
                <div className="text-slate-400"><b>To:</b> <span className="font-mono text-slate-200">{previewLead.email}</span></div>
                <div className="text-purple-300 font-semibold mt-1"><b>Subject:</b> {previewSubject}</div>
              </div>
              <div className="whitespace-pre-wrap text-slate-200 leading-relaxed max-h-56 overflow-y-auto">
                {previewBody}
              </div>
              {attachPdf && (
                <div className="border-t border-[#1E293B] pt-2 flex items-center gap-2 text-slate-400 text-[11px]">
                  <Paperclip className="w-3.5 h-3.5 text-purple-400" />
                  <span>Product_Export_Catalog.pdf</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#050816]/70 border border-[#1E293B] text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Commercial Outreach Standard:</p>
            <p>Emails are dispatched directly to verified business contacts. Dynamic fields ensure personal relevance for each buyer.</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>Review & Launch Outreach</span>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
                ⚠️ <b>Notice:</b> Emails will be sent to selected external buyers.
              </div>

              <div className="bg-[#050816] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipients:</span>
                  <b className="text-white font-mono">{audience === 'custom' ? '1 (Test Recipient)' : `${targetCount} Buyers`}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verified contacts:</span>
                  <b className="text-emerald-400 font-mono">{audience === 'custom' ? customRecipient.email : `${targetCount} Verified`}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attachment:</span>
                  <b className={attachPdf ? 'text-purple-400' : 'text-slate-400'}>
                    {attachPdf ? 'Product Presentation Catalog' : 'None'}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Delivery Channel:</span>
                  <b className="text-white">Direct Email Outreach</b>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSend}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all"
              >
                Launch Outreach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">📬 Outreach Results Summary</h2>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B]">
              <div className="text-xs text-slate-400">Targeted</div>
              <div className="text-xl font-bold text-white">{results.total_targeted}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B]">
              <div className="text-xs text-slate-400">Successfully Dispatched</div>
              <div className="text-xl font-bold text-emerald-400">{results.sent_count}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B]">
              <div className="text-xs text-slate-400">Previously Contacted / Skipped</div>
              <div className="text-xl font-bold text-amber-400">{results.skipped_duplicates}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B]">
              <div className="text-xs text-slate-400">Undeliverable</div>
              <div className="text-xl font-bold text-rose-400">{results.failed_count}</div>
            </div>
          </div>

          {results.previews?.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dispatched Messages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {results.previews.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#050816] border border-[#1E293B] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{item.buyer_name} ({item.company})</span>
                      <StatusBadge status="valid" text="Delivered" />
                    </div>
                    <div className="text-purple-300 font-mono text-[11px]">{item.email}</div>
                    <div className="text-slate-300 font-medium">Subject: {item.subject}</div>
                    <div className="text-slate-400 text-[11px] truncate">{item.body.substring(0, 100)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SendCampaign;
