import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Key, 
  Mail, 
  ShieldCheck, 
  Lock,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import apiService from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Settings = () => {
  const [settings, setSettings] = useState({
    SEARCH_KEYWORD: 'Singing Bowls',
    EMAIL_MODE: 'demo',
    SEND_DELAY: 2,
    MAX_EMAILS_PER_RUN: 50,
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587
  });
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiService.getSettings();
      setSettings(res.settings || {});
      setStatus(res.status || {});
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
      setNotification({ type: 'success', message: 'Settings saved to data/settings.json successfully.' });
      setStatus(prev => ({ ...prev, email_mode: settings.EMAIL_MODE }));
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading system settings..." />;

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">⚙️ Platform & Outreach Parameters</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Non-sensitive runtime configurations are stored in <code>data/settings.json</code>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Export Keyword / Product
              </label>
              <input
                type="text"
                value={settings.SEARCH_KEYWORD || ''}
                onChange={(e) => setSettings({ ...settings, SEARCH_KEYWORD: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default keyword used for lead discovery & email headings</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Dispatch Mode
              </label>
              <select
                value={settings.EMAIL_MODE || 'demo'}
                onChange={(e) => setSettings({ ...settings, EMAIL_MODE: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="demo">🛡️ Demo Mode (Safe Simulated Sending)</option>
                <option value="smtp">🔒 Gmail SMTP Mode (Live Outbox Dispatch)</option>
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                In Demo Mode, emails are recorded to <code>data/sent_log.csv</code> without contacting real mailboxes.
              </span>
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
                  value={settings.SEND_DELAY || 2}
                  onChange={(e) => setSettings({ ...settings, SEND_DELAY: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Max Emails Per Run
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settings.MAX_EMAILS_PER_RUN || 50}
                  onChange={(e) => setSettings({ ...settings, MAX_EMAILS_PER_RUN: parseInt(e.target.value) || 10 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 mt-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save Settings to data/settings.json'}</span>
            </button>
          </form>
        </div>

        {/* Security & Secrets Card */}
        <div className="lg:col-span-5 bg-[#131b2e] border border-[#222f4c] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">🔐 Credentials & Environment (.env)</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Sensitive passwords and API keys remain securely guarded in the server environment.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>Gemini AI API Key</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Automated B2B Lead Classification</div>
                </div>
                <StatusBadge 
                  status={status.gemini_configured ? 'valid' : 'missing'} 
                  text={status.gemini_configured ? 'Configured' : 'Demo Fallback'} 
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gmail App Credentials</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {status.masked_gmail ? status.masked_gmail : 'GMAIL_EMAIL & App Password'}
                  </div>
                </div>
                <StatusBadge 
                  status={status.gmail_configured ? 'valid' : 'missing'} 
                  text={status.gmail_configured ? 'Configured' : 'Safe Demo'} 
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-[#0b0f19] border border-[#222f4c] text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">To configure live credentials:</div>
            <pre className="text-blue-300 font-mono text-[10px] bg-black/40 p-2 rounded">
EMAIL_MODE=demo
GEMINI_API_KEY=
GMAIL_EMAIL=
GMAIL_APP_PASSWORD=
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
