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
  ShieldAlert
} from 'lucide-react';
import apiService from '../services/api';
import Notification from '../components/Notification';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_SUBJECT = "Export Partnership: Himalayan Singing Bowls for {{company_name}}";
const DEFAULT_BODY = `Hello {{contact_name}},

I am reaching out regarding {{company_name}} in {{country}}.

As an established exporter of authentic, hand-hammered {{product}}, we would be delighted to explore a wholesale supply partnership with your organization.

Please find our product catalog and export specifications attached.

Best regards,
Export Sales Team
Himalayan Artisans Export Ltd.`;

export const SendCampaign = () => {
  const navigate = useNavigate();
  const [audience, setAudience] = useState('business');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [attachPdf, setAttachPdf] = useState(true);

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
      console.error(err);
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

  const previewSubject = subject
    .replace(/\{\{buyer_name\}\}/g, previewLead.name)
    .replace(/\{\{contact_name\}\}/g, previewLead.name)
    .replace(/\{\{company_name\}\}/g, previewLead.company)
    .replace(/\{\{country\}\}/g, previewLead.country)
    .replace(/\{\{buyer_type\}\}/g, previewLead.buyer_type)
    .replace(/\{\{product\}\}/g, targetProduct);

  const previewBody = body
    .replace(/\{\{buyer_name\}\}/g, previewLead.name)
    .replace(/\{\{contact_name\}\}/g, previewLead.name)
    .replace(/\{\{company_name\}\}/g, previewLead.company)
    .replace(/\{\{country\}\}/g, previewLead.country)
    .replace(/\{\{buyer_type\}\}/g, previewLead.buyer_type)
    .replace(/\{\{product\}\}/g, targetProduct);

  const handleOpenDispatchModal = () => {
    if (!gmailConfigured) {
      setNotification({
        type: 'error',
        message: 'Gmail Sending Unavailable. Configure GMAIL_EMAIL and GMAIL_APP_PASSWORD in the backend .env file.'
      });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setNotification({ type: 'error', message: 'Subject and Body cannot be empty.' });
      return;
    }
    if (audience === 'custom' && !customRecipient.email.trim()) {
      setNotification({ type: 'error', message: 'Please enter a target email address for the test dispatch.' });
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
          message: `Campaign executed successfully! Dispatched ${res.results.sent_count} live email(s) via Gmail SMTP.`
        });
      } else {
        setNotification({
          type: 'warning',
          message: 'Campaign completed with 0 dispatches. ' + (res.results?.messages?.join(' ') || '')
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to dispatch campaign.'
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner text="Preparing campaign dispatcher..." />;

  const targetCount = getTargetCount();

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Campaign Step Indicator */}
      <div className="flex items-center justify-between bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-xl p-3.5 overflow-x-auto gap-2 shadow-sm">
        {[
          { num: 1, label: 'Select Audience' },
          { num: 2, label: 'Compose' },
          { num: 3, label: 'Preview' },
          { num: 4, label: 'Confirm' },
          { num: 5, label: 'Send' },
        ].map((step, idx) => (
          <div key={step.num} className="flex items-center gap-2 flex-shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center">
              {step.num}
            </span>
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">{step.label}</span>
            {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 mx-2" />}
          </div>
        ))}
      </div>

      {/* Gmail Status Banner */}
      {!gmailConfigured ? (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-200 flex items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <b>Gmail Sending Unavailable:</b> Configure <code>GMAIL_EMAIL</code> and <code>GMAIL_APP_PASSWORD</code> in your backend environment to enable live email outreach.
            </div>
          </div>
          <StatusBadge status="missing" text="Not Configured" />
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 flex items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <b>Live Gmail SMTP Active:</b> Authenticated with STARTTLS port 587. Real emails will be transmitted to external prospect inboxes.
            </div>
          </div>
          <StatusBadge status="sent" text="SMTP Ready" />
        </div>
      )}

      {/* Pre-Campaign Summary Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Qualified Buyers</div>
          <div className="text-xl font-bold text-blue-400 mt-0.5">{classData?.business_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Valid Contacts</div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{classData?.business_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Already Contacted</div>
          <div className="text-xl font-bold text-amber-400 mt-0.5">0</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[rgba(148,163,184,0.12)]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Ready to Send</div>
          <div className="text-xl font-bold text-[#F8FAFC] mt-0.5">{targetCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Campaign Editor Form */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>✉️ Compose Outreach Campaign</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Audience Selection
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'business', label: '🏢 Business', count: `${classData?.business_count || 0} Leads` },
                { id: 'individual', label: '👤 Individual', count: `${classData?.individual_count || 0} Leads` },
                { id: 'all', label: '🌐 All Qualified', count: `${(classData?.business_count || 0) + (classData?.individual_count || 0)} Leads` },
                { id: 'custom', label: '🎯 Send Test Email', count: customRecipient.email.trim() ? '1 Custom' : 'Single' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAudience(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${audience === item.id ? 'border-blue-500 bg-blue-500/15 text-white shadow-sm' : 'border-[#222f4c] bg-[#0b0f19] text-slate-400 hover:border-slate-500'}`}
                >
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.count}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Single Test Recipient Inputs */}
          {audience === 'custom' && (
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <UserCheck className="w-4 h-4" />
                <span>Single Test Recipient Parameters</span>
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
                    placeholder="e.g. purchasing@partnerdomain.com"
                    className="w-full px-3 py-2 rounded-lg bg-[#131b2e] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
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
                    placeholder="e.g. Procurement Lead"
                    className="w-full px-3 py-2 rounded-lg bg-[#131b2e] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
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
                    placeholder="e.g. Alpine Sound Healing Ltd"
                    className="w-full px-3 py-2 rounded-lg bg-[#131b2e] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
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
                    className="w-full px-3 py-2 rounded-lg bg-[#131b2e] border border-[#222f4c] text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
              placeholder="Enter subject..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Body Template
              </label>
              <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1.5">
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-white text-sm focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#222f4c] flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
              />
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                <span>Attach Product Presentation (<code>assets/company_presentation.pdf</code>)</span>
              </span>
            </label>
            <div className="flex items-center gap-2">
              <a
                href={apiService.getCatalogUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline flex items-center gap-1"
              >
                <span>View Catalog</span>
              </a>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Brochure Ready</span>
              </span>
            </div>
          </div>

          {/* Sending Progress Bar Indicator */}
          {sending && (
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-blue-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                  <span>Connecting to smtp.gmail.com & dispatching...</span>
                </span>
                <span className="text-blue-400 font-mono">In Progress</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}

          <button
            onClick={handleOpenDispatchModal}
            disabled={sending || targetCount === 0 || !gmailConfigured}
            className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>
              {sending 
                ? 'Dispatching via SMTP...' 
                : audience === 'custom' 
                  ? 'Send Test Email' 
                  : `Launch Campaign — ${targetCount} Recipient${targetCount === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Personalization Preview</h3>
              </div>
              <span className="text-[11px] text-slate-400">{previewLead.name} ({previewLead.country})</span>
            </div>

            <div className="p-4 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-3 font-sans text-xs">
              <div className="border-b border-[rgba(148,163,184,0.12)] pb-2.5">
                <div className="text-slate-400"><b>To:</b> <span className="font-mono text-slate-200">{previewLead.email}</span></div>
                <div className="text-blue-300 font-semibold mt-1"><b>Subject:</b> {previewSubject}</div>
              </div>
              <div className="whitespace-pre-wrap text-slate-200 leading-relaxed max-h-56 overflow-y-auto">
                {previewBody}
              </div>
              {attachPdf && (
                <div className="border-t border-[rgba(148,163,184,0.12)] pt-2 flex items-center gap-2 text-slate-400 text-[11px]">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                  <span>company_presentation.pdf (Export Catalog)</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#080D1D]/70 border border-[rgba(148,163,184,0.12)] text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Responsible Outreach Note:</p>
            <p>Emails are dispatched directly to verified business domains via Gmail SMTP. Practice responsible commercial outreach.</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.16)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>Review Campaign</span>
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
                ⚠️ <b>Warning:</b> Emails will be sent to real external recipients.
              </div>

              <div className="bg-[#080D1D] p-3.5 rounded-xl border border-[rgba(148,163,184,0.12)] space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipients:</span>
                  <b className="text-white font-mono">{audience === 'custom' ? '1 (Test Recipient)' : `${targetCount} Prospects`}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valid contacts:</span>
                  <b className="text-emerald-400 font-mono">{audience === 'custom' ? customRecipient.email : `${targetCount} Verified`}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attachment:</span>
                  <b className={attachPdf ? 'text-blue-400' : 'text-slate-400'}>
                    {attachPdf ? 'company_presentation.pdf' : 'None'}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transport:</span>
                  <b className="text-white">Gmail SMTP</b>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSend}
                className="flex-1 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">📬 Campaign Dispatch Summary</h2>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-xs text-slate-400">Targeted</div>
              <div className="text-xl font-bold text-white">{results.total_targeted}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-xs text-slate-400">Delivered via SMTP</div>
              <div className="text-xl font-bold text-emerald-400">{results.sent_count}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-xs text-slate-400">Duplicates Skipped</div>
              <div className="text-xl font-bold text-amber-400">{results.skipped_duplicates}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-xs text-slate-400">Failed / Refused</div>
              <div className="text-xl font-bold text-rose-400">{results.failed_count}</div>
            </div>
          </div>

          {results.previews?.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Outbox Activity Log</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {results.previews.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{item.buyer_name} ({item.company})</span>
                      <StatusBadge status="sent" text="SENT (SMTP)" />
                    </div>
                    <div className="text-blue-300 font-mono text-[11px]">{item.email}</div>
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
