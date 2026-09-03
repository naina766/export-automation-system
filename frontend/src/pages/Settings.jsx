import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  FileText,
  X,
  ExternalLink
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'products';
  const [activeTab, setActiveTab] = useState(initialTab); // 'products' | 'outreach' | 'security' | 'health'

  const { 
    products, 
    selectedProduct, 
    setSelectedProduct, 
    activeProduct, 
    refreshProducts, 
    activateProduct, 
    createProduct, 
    updateProduct, 
    deleteProduct 
  } = useProduct();

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

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingProductId, setEditingProductId] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    keywords: '',
    buyer_types: '',
    target_countries: '',
    email_subject_template: '',
    email_body_template: '',
    catalog_path: 'assets/company_presentation.pdf',
    active: false
  });
  const [submittingProduct, setSubmittingProduct] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['products', 'outreach', 'security', 'health'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

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

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification({ type: '', message: '' });
      await apiService.updateSettings(settings);
      setNotification({ type: 'success', message: 'Outreach parameters updated successfully.' });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Diagnostic Handlers
  const handleTestSMTP = async () => {
    try {
      setTestingSmtp(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testSMTPConnection();
      setDiagnosticTimestamps(prev => ({ ...prev, smtp: new Date().toLocaleTimeString() }));
      setNotification({ type: 'success', message: res.message || 'SMTP Handshake Successful!' });
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
      setNotification({ type: 'success', message: res.message || 'Gemini AI connection verified!' });
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
      setNotification({ type: 'success', message: res.message || 'Search provider connection verified!' });
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

  // Product CRUD Handlers
  const openCreateModal = () => {
    setModalMode('create');
    setEditingProductId(null);
    setProductFormData({
      name: '',
      description: '',
      keywords: '',
      buyer_types: 'Wholesale Importer, Distributor, Specialty Retailer',
      target_countries: 'United States, United Kingdom, Germany, Canada, Australia',
      email_subject_template: 'Export Partnership: {{product_name}} for {{company_name}}',
      email_body_template: 'Hello {{contact_name}},\n\nI am reaching out regarding {{company_name}} in {{country}}.\n\nAs an authentic direct exporter of {{product_name}}, we would welcome the opportunity to explore a wholesale partnership with your organization.\n\nPlease find our catalog attached.\n\nBest regards,\nExport Sales Team',
      catalog_path: 'assets/company_presentation.pdf',
      active: false
    });
    setProductModalOpen(true);
  };

  const openEditModal = (prod) => {
    setModalMode('edit');
    setEditingProductId(prod.id);
    setProductFormData({
      name: prod.name || '',
      description: prod.description || '',
      keywords: Array.isArray(prod.keywords) ? prod.keywords.join(', ') : (prod.keywords || ''),
      buyer_types: Array.isArray(prod.buyer_types) ? prod.buyer_types.join(', ') : (prod.buyer_types || ''),
      target_countries: Array.isArray(prod.target_countries) ? prod.target_countries.join(', ') : (prod.target_countries || ''),
      email_subject_template: prod.email_subject_template || '',
      email_body_template: prod.email_body_template || '',
      catalog_path: prod.catalog_path || 'assets/company_presentation.pdf',
      active: Boolean(prod.active)
    });
    setProductModalOpen(true);
  };

  const handleProductFormSubmit = async (e) => {
    e.preventDefault();
    setSubmittingProduct(true);
    setNotification({ type: '', message: '' });

    const payload = {
      name: productFormData.name.trim(),
      description: productFormData.description.trim(),
      keywords: productFormData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      buyer_types: productFormData.buyer_types.split(',').map(b => b.trim()).filter(Boolean),
      target_countries: productFormData.target_countries.split(',').map(c => c.trim()).filter(Boolean),
      email_subject_template: productFormData.email_subject_template.trim(),
      email_body_template: productFormData.email_body_template.trim(),
      catalog_path: productFormData.catalog_path.trim() || 'assets/company_presentation.pdf',
      active: Boolean(productFormData.active)
    };

    if (modalMode === 'create') {
      const res = await createProduct(payload);
      if (res.success) {
        setNotification({ type: 'success', message: `Product "${payload.name}" created successfully.` });
        setProductModalOpen(false);
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to create product.' });
      }
    } else {
      const res = await updateProduct(editingProductId, payload);
      if (res.success) {
        setNotification({ type: 'success', message: `Product "${payload.name}" updated successfully.` });
        setProductModalOpen(false);
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to update product.' });
      }
    }
    setSubmittingProduct(false);
  };

  const handleActivate = async (productId, productName) => {
    const res = await activateProduct(productId);
    if (res.success) {
      setNotification({ type: 'success', message: `"${productName}" is now the active export product.` });
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to activate product.' });
    }
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to remove "${productName}" from the product catalog?`)) {
      return;
    }
    const res = await deleteProduct(productId);
    if (res.success) {
      setNotification({ type: 'success', message: `Product "${productName}" removed.` });
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to delete product.' });
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-purple-400" />
            <span>Platform Configuration & Diagnostics</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Manage multi-product export configurations, outreach parameters, and diagnostic health.
          </p>
        </div>

        <div className="flex bg-[#0B1220] p-1 rounded-xl border border-[#1E293B] text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => handleTabChange('products')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'products' ? 'bg-purple-600 text-white shadow-md' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('outreach')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'outreach' ? 'bg-blue-600 text-white shadow-md' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Outreach Controls</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('security')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Environment Security</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('health')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'health' ? 'bg-emerald-600 text-white shadow-md' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-[#F8FAFC]">Multi-Product Catalog & Campaign Configuration</h2>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Configure distinct product lines, tailored search keywords, buyer segments, and personalized outreach templates.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {products.map((prod) => {
              const isActive = prod.active || (activeProduct?.id === prod.id);
              const isSelected = selectedProduct?.id === prod.id;

              return (
                <div
                  key={prod.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isActive 
                      ? 'bg-[#111827] border-purple-500/40 shadow-lg shadow-purple-950/20' 
                      : 'bg-[#0B1220] border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-bold text-[#F8FAFC]">{prod.name}</h3>
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Active System Default</span>
                          </span>
                        )}
                        {isSelected && !isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Currently Selected in View
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#64748B]">ID: {prod.id}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] max-w-3xl leading-relaxed">
                        {prod.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleActivate(prod.id, prod.name)}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Set as Active</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(prod)}
                        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B] transition-all"
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(prod.id, prod.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
                        Target Keywords
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(prod.keywords) && prod.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-[#050816] text-[#94A3B8] border border-[#1E293B] text-[11px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
                        Buyer Profiles
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(prod.buyer_types) && prod.buyer_types.map((bt, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px]">
                            {bt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
                        Target Export Markets
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(prod.target_countries) && prod.target_countries.map((tc, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-[#050816] text-[#94A3B8] border border-[#1E293B] text-[11px]">
                            {tc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1E293B]/60 text-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                      Email Subject Template
                    </span>
                    <code className="text-purple-300 font-mono text-[11px] bg-[#050816] px-2 py-1 rounded block truncate border border-[#1E293B]">
                      {prod.email_subject_template || 'Default template'}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: OUTREACH PARAMETERS */}
      {activeTab === 'outreach' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">Outreach & Rate-Limiting Controls</h3>
            </div>
            <p className="text-xs text-[#94A3B8] mb-5">
              Adjust business outreach parameters stored persistently in <code>data/settings.json</code>.
            </p>

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fallback Keyword
                </label>
                <input
                  type="text"
                  value={settings.SEARCH_KEYWORD || ''}
                  onChange={(e) => setSettings({ ...settings, SEARCH_KEYWORD: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Default fallback keyword if product is unassigned</span>
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
                    value={settings.SEND_DELAY ?? 1}
                    onChange={(e) => setSettings({ ...settings, SEND_DELAY: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Prevents SMTP rate-limits</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Max Emails Per Run
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.MAX_EMAILS_PER_RUN ?? 25}
                    onChange={(e) => setSettings({ ...settings, MAX_EMAILS_PER_RUN: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Batch dispatch cap</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Daily Send Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={settings.DAILY_SEND_LIMIT ?? 100}
                    onChange={(e) => setSettings({ ...settings, DAILY_SEND_LIMIT: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Account safety threshold</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.SMTP_PORT ?? 587}
                    onChange={(e) => setSettings({ ...settings, SMTP_PORT: parseInt(e.target.value) || 587 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">587 for TLS</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Parameters'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Active Credentials Overview</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">Search Provider:</span>
                  <span className="font-semibold text-slate-200">{serverData.search_provider || 'google_cse'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">Gemini Model:</span>
                  <span className="font-semibold text-slate-200">{serverData.gemini_model || 'gemini-1.5-flash'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Gmail Account:</span>
                  <span className="font-semibold text-slate-200 font-mono">{serverData.gmail_account_masked || 'Not configured'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ENVIRONMENT SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-[#F8FAFC]">Environment Security & Secrets Protection</h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Zero credential leakage policy. API keys, secrets, and passwords are never sent to or stored on the client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-2">
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

            <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-2">
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

            <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-2">
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
      )}

      {/* TAB 4: SYSTEM HEALTH & DIAGNOSTICS */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0B1220] border border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
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
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{testingAll ? 'Testing All Services...' : 'Test All Connections'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search Provider Diagnostics Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">Search Provider</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${searchConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {searchConfigured ? 'Connected' : 'Not Set'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Provider: <b className="text-slate-200">{serverData.search_provider || 'google_cse'}</b></div>
                  <div>Status: <b className="text-slate-200">{searchConfigured ? 'Valid API credentials' : 'Key missing'}</b></div>
                  <div className="text-[11px] text-slate-500 mt-2">Last check: {diagnosticTimestamps.search}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSearch}
                disabled={testingSearch || !searchConfigured}
                className="w-full py-2 px-3 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${testingSearch ? 'animate-spin' : ''}`} />
                <span>{testingSearch ? 'Verifying API...' : 'Test Search API'}</span>
              </button>
            </div>

            {/* Gemini AI Diagnostics Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">Gemini AI Engine</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${geminiConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {geminiConfigured ? 'Connected' : 'Not Set'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Model: <b className="text-slate-200">{serverData.gemini_model || 'gemini-1.5-flash'}</b></div>
                  <div>Capability: <b className="text-slate-200">Semantic Qualification</b></div>
                  <div className="text-[11px] text-slate-500 mt-2">Last check: {diagnosticTimestamps.gemini}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini || !geminiConfigured}
                className="w-full py-2 px-3 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${testingGemini ? 'animate-spin' : ''}`} />
                <span>{testingGemini ? 'Verifying AI...' : 'Test Gemini API'}</span>
              </button>
            </div>

            {/* Gmail SMTP Diagnostics Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">Gmail SMTP</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gmailConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {gmailConfigured ? 'Connected' : 'Not Set'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Host: <b className="text-slate-200">{serverData.smtp_host || 'smtp.gmail.com'}:587</b></div>
                  <div>Sender: <b className="text-slate-200">{serverData.gmail_account_masked || 'Not set'}</b></div>
                  <div className="text-[11px] text-slate-500 mt-2">Last check: {diagnosticTimestamps.smtp}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSMTP}
                disabled={testingSmtp || !gmailConfigured}
                className="w-full py-2 px-3 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${testingSmtp ? 'animate-spin' : ''}`} />
                <span>{testingSmtp ? 'Handshaking...' : 'Test SMTP Handshake'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  {modalMode === 'create' ? 'Add New Export Product' : `Edit "${productFormData.name}"`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  placeholder="e.g. Handcrafted Brass Singing Bowls"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  placeholder="Artisan craftsmanship, metal alloy formulation, therapy uses..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={productFormData.keywords}
                    onChange={(e) => setProductFormData({ ...productFormData, keywords: e.target.value })}
                    placeholder="singing bowls, meditation bowls wholesale"
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Buyer Profiles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={productFormData.buyer_types}
                    onChange={(e) => setProductFormData({ ...productFormData, buyer_types: e.target.value })}
                    placeholder="Distributor, Wholesale Importer, Sound Bath Studio"
                    className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Target Export Countries (comma-separated)
                </label>
                <input
                  type="text"
                  value={productFormData.target_countries}
                  onChange={(e) => setProductFormData({ ...productFormData, target_countries: e.target.value })}
                  placeholder="United States, United Kingdom, Germany, Canada, Australia"
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Email Subject Template</span>
                  <span className="text-[10px] text-purple-400 font-mono">Use {`{{product_name}}, {{company_name}}`}</span>
                </label>
                <input
                  type="text"
                  value={productFormData.email_subject_template}
                  onChange={(e) => setProductFormData({ ...productFormData, email_subject_template: e.target.value })}
                  placeholder="Export Supply Partnership: {{product_name}} for {{company_name}}"
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Email Body Template</span>
                  <span className="text-[10px] text-purple-400 font-mono">Variables: {`{{contact_name}}, {{company_name}}, {{country}}, {{product_name}}`}</span>
                </label>
                <textarea
                  rows={5}
                  value={productFormData.email_body_template}
                  onChange={(e) => setProductFormData({ ...productFormData, email_body_template: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prod_active"
                  checked={productFormData.active}
                  onChange={(e) => setProductFormData({ ...productFormData, active: e.target.checked })}
                  className="rounded border-[#1E293B] bg-[#050816] text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="prod_active" className="text-xs text-slate-300 cursor-pointer">
                  Set this product as the active system default immediately
                </label>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submittingProduct ? 'Saving...' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
