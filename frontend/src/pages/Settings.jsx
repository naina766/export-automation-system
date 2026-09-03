import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Key, 
  Mail, 
  ShieldCheck, 
  Lock,
  Sliders,
  CheckCircle2,
  Globe,
  Sparkles,
  Zap,
  RefreshCw,
  Activity,
  AlertTriangle,
  Server,
  Cpu
} from 'lucide-react';
import apiService from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Settings = () => {
  const [settings, setSettings] = useState({
    SEARCH_KEYWORD: 'Himalayan Sound Healing Bowls',
    SEND_DELAY: 1,
    MAX_EMAILS_PER_RUN: 25,
    DAILY_SEND_LIMIT: 100,
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587
  });
  const [serverData, setServerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('outreach'); // 'outreach' | 'health'

  // Diagnostic states
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingSearch, setTestingSearch] = useState(false);
  const [testingAll, setTestingAll] = useState(false);

  const [diagnosticTimestamps, setDiagnosticTimestamps] = useState({
    search: 'Not checked yet',
    gemini: 'Not checked yet',
    smtp: 'Not checked yet'
  });

  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiService.getSettings();
      setSettings(res.settings || {});
      setServerData(res);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to load system settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.updateSettings(settings);
      setNotification({ type: 'success', message: 'Outreach settings saved successfully to data/settings.json.' });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    try {
      setTestingSmtp(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testSMTPConnection();
      setDiagnosticTimestamps(prev => ({ ...prev, smtp: new Date().toLocaleTimeString() }));
      setNotification({
        type: 'success',
        message: res.message || 'SMTP Handshake Successful!'
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || 'SMTP connection handshake failed.');
      setNotification({ type: 'error', message: msg });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestGemini = async () => {
    try {
      setTestingGemini(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testGeminiConnection();
      setDiagnosticTimestamps(prev => ({ ...prev, gemini: new Date().toLocaleTimeString() }));
      setNotification({
        type: 'success',
        message: res.message || 'Gemini AI connection verified!'
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || 'Gemini API test failed.');
      setNotification({ type: 'error', message: msg });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestSearch = async () => {
    try {
      setTestingSearch(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testSearchConnection();
      setDiagnosticTimestamps(prev => ({ ...prev, search: new Date().toLocaleTimeString() }));
      setNotification({
        type: 'success',
        message: res.message || 'Search provider connection verified!'
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || 'Search API test failed.');
      setNotification({ type: 'error', message: msg });
    } finally {
      setTestingSearch(false);
    }
  };

  const handleTestAll = async () => {
    setTestingAll(true);
    await handleTestSearch();
    await handleTestGemini();
    await handleTestSMTP();
    setTestingAll(false);
  };

  if (loading) return <LoadingSpinner text="Loading system settings & diagnostics..." />;

  const searchConfigured = Boolean(serverData.search_configured);
  const geminiConfigured = Boolean(serverData.gemini_configured);
  const gmailConfigured = Boolean(serverData.gmail_configured);

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Navigation Tabs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[rgba(148,163,184,0.12)] pb-4">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
            <span>Platform Configuration & Diagnostics</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Manage operational parameters, environmental security, and external API health.
          </p>
        </div>

        <div className="flex bg-[#080D1D] p-1 rounded-xl border border-[rgba(148,163,184,0.12)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('outreach')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'outreach' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Outreach Parameters</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'security' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Environment Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'health' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </div>
      </div>

      {activeTab === 'outreach' ? (
        /* Outreach Configuration Form & Quick Security Overview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Outreach & Runtime Parameters</h3>
            </div>
            <p className="text-xs text-[#94A3B8] mb-5">
              Adjust business outreach parameters stored persistently in <code>data/settings.json</code>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Export Product / HS Keyword
                </label>
                <input
                  type="text"
                  value={settings.SEARCH_KEYWORD || ''}
                  onChange={(e) => setSettings({ ...settings, SEARCH_KEYWORD: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Default keyword used for buyer discovery & personalization fallbacks</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Send Delay (Seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={settings.SEND_DELAY || 1}
                    onChange={(e) => setSettings({ ...settings, SEND_DELAY: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Pause between recipient emails</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Max Emails Per Run
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={settings.MAX_EMAILS_PER_RUN || 25}
                    onChange={(e) => setSettings({ ...settings, MAX_EMAILS_PER_RUN: parseInt(e.target.value) || 10 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Batch quota guard</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.SMTP_HOST || 'smtp.gmail.com'}
                    onChange={(e) => setSettings({ ...settings, SMTP_HOST: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.SMTP_PORT || 587}
                    onChange={(e) => setSettings({ ...settings, SMTP_PORT: parseInt(e.target.value) || 587 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 mt-2 active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Environment Security</h3>
              </div>
              <p className="text-xs text-[#94A3B8] mb-4">
                API credentials, tokens, and passwords remain strictly on the backend server in <code>.env</code>.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Search Engine API</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${searchConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {searchConfigured ? 'Guarded' : 'Key Missing'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Provider: <b>{serverData.search_provider || 'google_cse'}</b></div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Gemini AI Engine</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${geminiConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {geminiConfigured ? 'Guarded' : 'Key Missing'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Model: <b>{serverData.gemini_model || 'gemini-1.5-flash'}</b></div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Gmail Transport (STARTTLS)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gmailConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {gmailConfigured ? 'Authenticated' : 'Credentials Missing'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Account: <b>{serverData.gmail_account_masked || 'Not configured'}</b></div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[rgba(148,163,184,0.12)] flex justify-between items-center text-xs">
              <span className="text-slate-400">Detailed diagnostics:</span>
              <button
                type="button"
                onClick={() => setActiveTab('health')}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
              >
                <span>Switch to System Health</span>
                <Activity className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'security' ? (
        /* Full Environment Security Tab */
        <div className="bg-[#0F172A] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Environment Security & Secrets Protection</h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Zero credential leakage policy. API keys, secrets, and passwords are never sent to or stored on the client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">SEARCH_API_KEY</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${searchConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {searchConfigured ? 'Configured (Masked)' : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Required for real-time international buyer search without HTML scraping.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">GEMINI_API_KEY</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${geminiConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {geminiConfigured ? 'Configured (Masked)' : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Used for semantic buyer evaluation and personalized B2B outreach generation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080D1D] border border-[rgba(148,163,184,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">GMAIL_APP_PASSWORD</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gmailConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {gmailConfigured ? 'Configured (Masked)' : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Used for authenticated SMTP transport. Sender: <code>{serverData.gmail_account_masked || 'None'}</code>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* System Health Detailed Diagnostics Section */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#131b2e] border border-[#222f4c]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Infrastructure & API Diagnostics</h3>
                <p className="text-xs text-slate-400">Run live handshake verifications against external service endpoints.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestAll}
              disabled={testingAll || testingSmtp || testingGemini || testingSearch}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{testingAll ? 'Testing All Services...' : 'Test All Connections'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search Provider Diagnostics Card */}
            <div className="bg-[#131b2e] border border-[#222f4c] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-bold text-white">Search Provider</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    searchConfigured ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {searchConfigured ? 'Connected' : 'Not Configured'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Provider:</span>
                    <b className="text-white">{serverData.search_provider || 'google_cse'}</b>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">API Key:</span>
                    <span className="font-mono text-slate-400">{searchConfigured ? '••••••••••••••••' : 'Not Set'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Last Checked:</span>
                    <span className="text-slate-400 font-mono text-[11px]">{diagnosticTimestamps.search}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSearch}
                disabled={testingSearch || !searchConfigured}
                className="w-full py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 text-blue-400 hover:text-blue-300 border border-[#222f4c] text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{testingSearch ? 'Verifying...' : 'Test Search Connection'}</span>
              </button>
            </div>

            {/* Gemini AI Diagnostics Card */}
            <div className="bg-[#131b2e] border border-[#222f4c] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">Gemini AI Engine</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    geminiConfigured ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {geminiConfigured ? 'Connected' : 'Not Configured'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Model:</span>
                    <b className="text-white font-mono text-[11px]">{serverData.gemini_model || 'gemini-1.5-flash'}</b>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">API Key:</span>
                    <span className="font-mono text-slate-400">{geminiConfigured ? '••••••••••••••••' : 'Not Set'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Last Checked:</span>
                    <span className="text-slate-400 font-mono text-[11px]">{diagnosticTimestamps.gemini}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini || !geminiConfigured}
                className="w-full py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 text-purple-400 hover:text-purple-300 border border-[#222f4c] text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{testingGemini ? 'Verifying...' : 'Test Gemini Connection'}</span>
              </button>
            </div>

            {/* Gmail SMTP Diagnostics Card */}
            <div className="bg-[#131b2e] border border-[#222f4c] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Gmail SMTP</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    gmailConfigured ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {gmailConfigured ? 'Connected' : 'Not Configured'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Account:</span>
                    <b className="text-white font-mono text-[11px]">{serverData.gmail_account_masked || 'Not Configured'}</b>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Security:</span>
                    <span className="text-emerald-400 font-semibold">STARTTLS (Port 587)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Last Checked:</span>
                    <span className="text-slate-400 font-mono text-[11px]">{diagnosticTimestamps.smtp}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSMTP}
                disabled={testingSmtp || !gmailConfigured}
                className="w-full py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-[#222f4c] text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{testingSmtp ? 'Testing Handshake...' : 'Test SMTP Handshake'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
