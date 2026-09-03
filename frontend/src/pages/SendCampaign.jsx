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
  ArrowRight
} from 'lucide-react';
import apiService from '../services/api';
import Notification from '../components/Notification';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_SUBJECT = "Singing Bowls from Himalayan Craft Suppliers";
const DEFAULT_BODY = `Hello {{buyer_name}},

I’m reaching out regarding {{company_name}} in {{country}}.

We supply authentic handcrafted Himalayan Singing Bowls and meditation instruments suitable for wellness stores, distributors, retailers, and importers.

Please find our product catalog and export specifications attached.

Regards,
Export Sales Team
Himalayan Artisans Export Ltd.`;

export const SendCampaign = () => {
  const navigate = useNavigate();
  const [audience, setAudience] = useState('business');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [attachPdf, setAttachPdf] = useState(true);
  
  const [systemData, setSystemData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

  const emailMode = systemData?.email_mode || 'DEMO';

  // Calculate targeted count
  const getTargetCount = () => {
    if (audience === 'business') return classData?.business_count || 0;
    if (audience === 'individual') return classData?.individual_count || 0;
    return (classData?.business_count || 0) + (classData?.individual_count || 0);
  };

  // Live personalized preview sample
  const sampleBuyer = {
    name: 'Sarah Miller',
    company: 'Himalayan Wellness LLC',
    country: 'USA'
  };

  const previewSubject = subject
    .replace(/\{\{buyer_name\}\}/g, sampleBuyer.name)
    .replace(/\{\{company_name\}\}/g, sampleBuyer.company)
    .replace(/\{\{country\}\}/g, sampleBuyer.country);

  const previewBody = body
    .replace(/\{\{buyer_name\}\}/g, sampleBuyer.name)
    .replace(/\{\{company_name\}\}/g, sampleBuyer.company)
    .replace(/\{\{country\}\}/g, sampleBuyer.country);

  const handleSendCampaign = async () => {
    if (!subject.trim() || !body.trim()) {
      setNotification({ type: 'error', message: 'Subject and Body cannot be empty.' });
      return;
    }

    try {
      setSending(true);
      setNotification({ type: '', message: '' });
      setResults(null);

      const res = await apiService.sendCampaign({
        audience,
        subject,
        body_template: body,
        attach_presentation: attachPdf
      });

      setResults(res.results);
      if (res.results?.sent_count > 0) {
        setNotification({
          type: 'success',
          message: `Campaign executed successfully! Dispatched to ${res.results.sent_count} leads in [${res.results.mode}] mode.`
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

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Safety Mode Notice */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs font-medium ${emailMode === 'SMTP' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-blue-950/40 border-blue-500/40 text-blue-200'}`}>
        <div className="flex items-center gap-3">
          <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${emailMode === 'SMTP' ? 'text-emerald-400' : 'text-blue-400'}`} />
          <div>
            {emailMode === 'SMTP' ? (
              <span><b>🔒 LIVE SMTP MODE ACTIVE:</b> Real emails will be dispatched to external recipients via Gmail SMTP.</span>
            ) : (
              <span><b>🛡️ DEMO MODE ACTIVE:</b> No real emails will be sent. Outreach is safely simulated and logged to <code>data/sent_log.csv</code>.</span>
            )}
          </div>
        </div>
        <StatusBadge status={emailMode === 'SMTP' ? 'sent' : 'demo_sent'} text={`${emailMode} MODE`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Campaign Editor Form */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-white">✉️ Compose Outreach Campaign</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'business', label: '🏢 Business Only', count: classData?.business_count || 0 },
                { id: 'individual', label: '👤 Individual Only', count: classData?.individual_count || 0 },
                { id: 'all', label: '🌐 All Qualified', count: (classData?.business_count || 0) + (classData?.individual_count || 0) },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAudience(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${audience === item.id ? 'border-blue-500 bg-blue-500/15 text-white' : 'border-[#222f4c] bg-[#0b0f19] text-slate-400 hover:border-slate-500'}`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.count} Leads</div>
                </button>
              ))}
            </div>
          </div>

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
              <div className="text-[11px] text-blue-400 font-mono">
                &#123;&#123;buyer_name&#125;&#125; &#123;&#123;company_name&#125;&#125; &#123;&#123;country&#125;&#125;
              </div>
            </div>
            <textarea
              rows={7}
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
                <span>Attach Product Catalog (<code>assets/company_presentation.pdf</code>)</span>
              </span>
            </label>
            <span className="text-[10px] text-emerald-400 font-bold">2.4 MB Verified</span>
          </div>

          <button
            onClick={handleSendCampaign}
            disabled={sending || getTargetCount() === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Dispatching Campaign...' : `Launch ${emailMode === 'SMTP' ? 'Live SMTP Outreach' : 'Safe Demo Send'} (${getTargetCount()} Leads)`}</span>
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Personalization Preview</h3>
              </div>
              <span className="text-[11px] text-slate-400">Sample: Sarah Miller (USA)</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#222f4c] space-y-3 font-sans text-xs">
              <div className="border-b border-[#222f4c] pb-2.5">
                <div className="text-slate-400"><b>To:</b> sarah@himalayanwellness.example</div>
                <div className="text-blue-300 font-semibold mt-1"><b>Subject:</b> {previewSubject}</div>
              </div>
              <div className="whitespace-pre-wrap text-slate-200 leading-relaxed max-h-56 overflow-y-auto">
                {previewBody}
              </div>
              {attachPdf && (
                <div className="border-t border-[#222f4c] pt-2 flex items-center gap-2 text-slate-400 text-[11px]">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                  <span>company_presentation.pdf (Singing Bowls Catalog)</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#0b0f19]/70 border border-[#222f4c] text-[11px] text-slate-400">
            * Leads already contacted in previous runs are automatically skipped to prevent spamming.
          </div>
        </div>
      </div>

      {/* Results / Generated Previews Section */}
      {results && (
        <div className="bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">📬 Outreach Execution Summary</h2>
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
              <div className="text-xs text-slate-400">Dispatched</div>
              <div className="text-xl font-bold text-emerald-400">{results.sent_count}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-xs text-slate-400">Duplicates Skipped</div>
              <div className="text-xl font-bold text-amber-400">{results.skipped_duplicates}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c]">
              <div className="text-xs text-slate-400">Failed</div>
              <div className="text-xl font-bold text-rose-400">{results.failed_count}</div>
            </div>
          </div>

          {results.previews?.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Simulated Outbox Previews</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {results.previews.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{item.buyer_name} ({item.company})</span>
                      <StatusBadge status="demo_sent" text={item.status} />
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
