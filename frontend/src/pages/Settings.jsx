import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Save, 
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
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  FileText,
  X,
  ExternalLink,
  Building,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import apiService from '../services/api';
import { useProduct } from '../context/ProductContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';
import { formatBusinessError } from '../services/errorHandler';

export const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'catalog';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { 
    products, 
    selectedProduct, 
    setSelectedProduct, 
    activeProduct, 
    activateProduct, 
    createProduct, 
    updateProduct, 
    deleteProduct 
  } = useProduct();

  const [settings, setSettings] = useState({
    COMPANY_NAME: 'Authentic Himalayan Exports',
    SENDER_NAME: 'Export Outreach Team',
    EMAIL_SIGNATURE: 'Export Sales Department\nAuthentic Himalayan Crafts & Wellness Products',
    SEARCH_KEYWORD: 'Himalayan Sound Healing Bowls',
    SEND_DELAY: 2,
    MAX_EMAILS_PER_RUN: 25,
    DAILY_SEND_LIMIT: 100,
    ATTACH_CATALOG: true
  });
  
  const [serverData, setServerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Connection testing states
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testingDiscovery, setTestingDiscovery] = useState(false);
  const [testingAll, setTestingAll] = useState(false);

  const [testStatus, setTestStatus] = useState({
    discovery: 'Not verified yet',
    ai: 'Not verified yet',
    email: 'Not verified yet'
  });

  const [notification, setNotification] = useState({ type: '', message: '' });

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
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
    if (tabParam && ['catalog', 'general', 'email', 'discovery', 'ai', 'system'].includes(tabParam)) {
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
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
      setServerData(res);
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to load settings right now.')
      });
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
      setNotification({ type: 'success', message: 'Preferences updated successfully.' });
    } catch (err) {
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Failed to update preferences.')
      });
    } finally {
      setSaving(false);
    }
  };

  // Connection Test Handlers
  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testSMTPConnection();
      setTestStatus(prev => ({ ...prev, email: 'Connected' }));
      setNotification({ type: 'success', message: 'Email account connected and ready for outreach.' });
    } catch (err) {
      setTestStatus(prev => ({ ...prev, email: 'Connection Issue' }));
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to connect to email account. Please check your credentials.')
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestAi = async () => {
    try {
      setTestingAi(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testGeminiConnection();
      setTestStatus(prev => ({ ...prev, ai: 'Connected' }));
      setNotification({ type: 'success', message: 'AI Qualification service verified and ready.' });
    } catch (err) {
      setTestStatus(prev => ({ ...prev, ai: 'Connection Issue' }));
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to connect to AI service. Please check your credentials.')
      });
    } finally {
      setTestingAi(false);
    }
  };

  const handleTestDiscovery = async () => {
    try {
      setTestingDiscovery(true);
      setNotification({ type: '', message: '' });
      const res = await apiService.testSearchConnection();
      setTestStatus(prev => ({ ...prev, discovery: 'Connected' }));
      setNotification({ type: 'success', message: 'Buyer discovery verified and ready for live search.' });
    } catch (err) {
      setTestStatus(prev => ({ ...prev, discovery: 'Connection Issue' }));
      setNotification({
        type: 'error',
        message: formatBusinessError(err, 'Unable to connect to buyer discovery. Please check your credentials.')
      });
    } finally {
      setTestingDiscovery(false);
    }
  };

  const handleTestAll = async () => {
    setTestingAll(true);
    await handleTestDiscovery();
    await handleTestAi();
    await handleTestEmail();
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
      buyer_types: 'Wholesale Importer, Distributor, Wellness Center',
      target_countries: 'United States, United Kingdom, Germany, Canada, Australia',
      email_subject_template: 'Export Supply Partnership: {{product_name}} for {{company_name}}',
      email_body_template: 'Hello {{contact_name}},\n\nI am reaching out regarding {{company_name}} in {{country}}.\n\nAs an established direct exporter of {{product_name}}, we would welcome the opportunity to explore a wholesale partnership with your organization.\n\nPlease find our catalog attached.\n\nBest regards,\nExport Sales Team',
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
        setNotification({ type: 'success', message: `Product line "${payload.name}" added successfully.` });
        setProductModalOpen(false);
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to create product.' });
      }
    } else {
      const res = await updateProduct(editingProductId, payload);
      if (res.success) {
        setNotification({ type: 'success', message: `Product line "${payload.name}" updated successfully.` });
        setProductModalOpen(false);
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to update product.' });
      }
    }
    setSubmittingProduct(false);
  };

  const [activatingId, setActivatingId] = useState(null);

  const handleActivate = async (productId, productName) => {
    if (activatingId !== null) return;
    try {
      setActivatingId(productId);
      const res = await activateProduct(productId);
      if (res.success) {
        setNotification({ type: 'success', message: 'Product switched successfully.' });
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to switch product.' });
      }
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to remove "${productName}" from your export catalog?`)) {
      return;
    }
    const res = await deleteProduct(productId);
    if (res.success) {
      setNotification({ type: 'success', message: `Product "${productName}" removed.` });
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to delete product.' });
    }
  };

  if (loading) return <LoadingSpinner text="Loading preferences..." />;

  const searchOk = Boolean(serverData.search_configured);
  const aiOk = Boolean(serverData.gemini_configured);
  const emailOk = Boolean(serverData.gmail_configured);
  const allReady = searchOk && aiOk && emailOk;

  const tabs = [
    { id: 'catalog', label: 'Product Catalog', icon: Package },
    { id: 'general', label: 'General & Company', icon: Building },
    { id: 'email', label: 'Email Outreach', icon: Mail },
    { id: 'discovery', label: 'Buyer Discovery', icon: Globe },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'system', label: 'System Readiness', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Settings Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-purple-400" />
            <span>Platform Settings</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Configure export products, email outreach, buyer discovery, and system readiness.
          </p>
        </div>

        <div className="flex bg-[#0B1220] p-1 rounded-xl border border-[#1E293B] text-xs font-semibold overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-md font-bold' 
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-[#F8FAFC]">Export Product Catalog</h2>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Manage export product lines, targeted keywords, buyer profiles, and outreach email templates.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Export Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {products.map((prod) => {
              const isActive = prod.active || (activeProduct?.id === prod.id);
              const isSelected = selectedProduct?.id === prod.id;

              return (
                <div
                  key={prod.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#0B1220] border-purple-500/50 shadow-md shadow-purple-950/20 ring-1 ring-purple-500/20' 
                      : 'bg-[#0B1220] border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-bold text-[#F8FAFC]">{prod.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                        {isSelected && !isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Currently Selected in View
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] max-w-3xl leading-relaxed">
                        {prod.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? (
                        <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-purple-400" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={activatingId !== null}
                          onClick={() => handleActivate(prod.id, prod.name)}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {activatingId === prod.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Activating...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Set as Active</span>
                            </>
                          )}
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
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                        Target Keywords
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(prod.keywords) && prod.keywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-[#050816] text-[#94A3B8] border border-[#1E293B] text-xs font-medium leading-normal">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                        Buyer Profiles
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(prod.buyer_types) && prod.buyer_types.map((bt, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium leading-normal">
                            {bt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                        Target Export Markets
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(prod.target_countries) && prod.target_countries.map((tc, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-[#050816] text-[#94A3B8] border border-[#1E293B] text-xs font-medium leading-normal">
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

      {/* TAB 2: GENERAL & COMPANY */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Company & Brand Profile</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Your organization's export identity and default product focus.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={settings.COMPANY_NAME || ''}
                  onChange={(e) => setSettings({ ...settings, COMPANY_NAME: e.target.value })}
                  placeholder="e.g. Himalayan Artisan Exports Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Default Export Line</label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) setSelectedProduct(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-purple-300 text-sm focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0B1220] text-white">{p.name}</option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">The default product used when discovering and qualifying prospects.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Primary Export Markets</label>
                <input
                  type="text"
                  value={Array.isArray(selectedProduct?.target_countries) ? selectedProduct.target_countries.join(', ') : 'United States, United Kingdom, Germany, Canada, Australia'}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-slate-400 text-xs focus:outline-none cursor-default"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Configured automatically by your active product line in the Product Catalog.</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Company Details'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Export Profile Summary</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">Total Products:</span>
                  <span className="font-semibold text-white">{products.length} Active Lines</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">Default Line:</span>
                  <span className="font-semibold text-purple-300 truncate max-w-[140px]">{activeProduct?.name || 'Singing Bowls'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Global Markets:</span>
                  <span className="font-semibold text-emerald-400">Worldwide</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMAIL OUTREACH */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Email Outreach Configuration</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Sender profile, delivery limits, and attachments for buyer campaigns.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={settings.SENDER_NAME || ''}
                  onChange={(e) => setSettings({ ...settings, SENDER_NAME: e.target.value })}
                  placeholder="e.g. Export Outreach Team"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Signature</label>
                <textarea
                  rows={3}
                  value={settings.EMAIL_SIGNATURE || ''}
                  onChange={(e) => setSettings({ ...settings, EMAIL_SIGNATURE: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Send Delay (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.SEND_DELAY ?? 2}
                    onChange={(e) => setSettings({ ...settings, SEND_DELAY: parseInt(e.target.value) || 2 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Delay between individual emails</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Daily Send Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={settings.DAILY_SEND_LIMIT ?? 100}
                    onChange={(e) => setSettings({ ...settings, DAILY_SEND_LIMIT: parseInt(e.target.value) || 100 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Safety limit for account protection</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B] flex items-center justify-between">
                <span className="text-slate-300 font-medium">Attach Wholesale Product Presentation (PDF)</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Ready
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Email Preferences'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Email Account Status</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${emailOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {emailOk ? 'Connected' : 'Connection Required'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Outreach emails are dispatched directly to verified business domains with personal buyer salutations.
              </p>

              <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B] text-xs space-y-1">
                <div className="text-slate-400">Sending Status: <b className="text-white">{emailOk ? 'Ready for Dispatch' : 'Setup Required'}</b></div>
                <div className="text-slate-400 text-[11px]">Last verified: {testStatus.email}</div>
              </div>

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail || !emailOk}
                className="w-full py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingEmail ? 'animate-spin' : ''}`} />
                <span>{testingEmail ? 'Verifying Account...' : 'Test Email Connection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BUYER DISCOVERY */}
      {activeTab === 'discovery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Buyer Discovery Preferences</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Parameters for discovering international wholesale importers and distributors.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Default Discovery Product</label>
                <input
                  type="text"
                  value={settings.SEARCH_KEYWORD || ''}
                  onChange={(e) => setSettings({ ...settings, SEARCH_KEYWORD: e.target.value })}
                  placeholder="e.g. Himalayan Sound Healing Bowls"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Max Prospects Per Discovery Run</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.MAX_EMAILS_PER_RUN ?? 25}
                  onChange={(e) => setSettings({ ...settings, MAX_EMAILS_PER_RUN: parseInt(e.target.value) || 25 })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Discovery Preferences'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Discovery Readiness</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${searchOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {searchOk ? 'Connected' : 'Connection Required'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Connects to international business search to locate commercial distributors and retailers in target export markets.
              </p>

              <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B] text-xs space-y-1">
                <div className="text-slate-400">Discovery Status: <b className="text-white">{searchOk ? 'Live Search Ready' : 'Setup Required'}</b></div>
                <div className="text-slate-400 text-[11px]">Last verified: {testStatus.discovery}</div>
              </div>

              <button
                type="button"
                onClick={handleTestDiscovery}
                disabled={testingDiscovery || !searchOk}
                className="w-full py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDiscovery ? 'animate-spin' : ''}`} />
                <span>{testingDiscovery ? 'Verifying...' : 'Test Buyer Discovery'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI ASSISTANT */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0B1220] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">AI Qualification Criteria</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Rules used by the AI assistant to evaluate commercial suitability.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-2">
                <div className="font-semibold text-white">Target Qualification Criteria</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Wholesale buyers, importers, and regional distributors</li>
                  <li>Specialty yoga, meditation, and sound healing studios</li>
                  <li>Luxury wellness, spa, and metaphysical boutiques</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#050816] border border-[#1E293B] space-y-2">
                <div className="font-semibold text-white">Exclusion Guardrails</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Non-commercial individual inquiries</li>
                  <li>Incomplete contact details or invalid addresses</li>
                  <li>Previously engaged buyer accounts (suppression policy)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Assistant Status</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${aiOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {aiOk ? 'Connected' : 'Connection Required'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluates buyer website and business activity against your product catalog to assign commercial fit scores.
              </p>

              <div className="p-3 rounded-xl bg-[#050816] border border-[#1E293B] text-xs space-y-1">
                <div className="text-slate-400">Assistant Status: <b className="text-white">{aiOk ? 'Ready for Qualification' : 'Setup Required'}</b></div>
                <div className="text-slate-400 text-[11px]">Last verified: {testStatus.ai}</div>
              </div>

              <button
                type="button"
                onClick={handleTestAi}
                disabled={testingAi || !aiOk}
                className="w-full py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : ''}`} />
                <span>{testingAi ? 'Verifying AI...' : 'Test AI Connection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM READINESS */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#0B1220] border border-[#1E293B]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Overall System Status</h3>
              </div>
              <p className="text-xs text-slate-400">
                {allReady 
                  ? 'All outreach systems are operational and ready for live commercial discovery.' 
                  : 'Some outreach services require configuration before launching campaigns.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestAll}
              disabled={testingAll || testingEmail || testingAi || testingDiscovery}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{testingAll ? 'Verifying Services...' : 'Verify All Connections'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Buyer Discovery Readiness Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">Buyer Discovery</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${searchOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {searchOk ? 'Connected' : 'Connection Required'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Capability: <b className="text-slate-200">Live B2B Search</b></div>
                  <div>Status: <b className="text-slate-200">{searchOk ? 'Ready for discovery' : 'Setup required'}</b></div>
                  <div className="text-[11px] text-slate-500 mt-2">Last check: {testStatus.discovery}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestDiscovery}
                disabled={testingDiscovery || !searchOk}
                className="w-full py-2 px-3 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDiscovery ? 'animate-spin' : ''}`} />
                <span>{testingDiscovery ? 'Verifying...' : 'Verify Discovery'}</span>
              </button>
            </div>

            {/* AI Assistant Readiness Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">AI Qualification</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${aiOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {aiOk ? 'Connected' : 'Connection Required'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Capability: <b className="text-slate-200">Commercial Fit Scoring</b></div>
                  <div>Status: <b className="text-slate-200">{aiOk ? 'Ready for qualification' : 'Setup required'}</b></div>
                  <div className="text-[11px] text-slate-500 mt-2">Last check: {testStatus.ai}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestAi}
                disabled={testingAi || !aiOk}
                className="w-full py-2 px-3 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : ''}`} />
                <span>{testingAi ? 'Verifying...' : 'Verify AI'}</span>
              </button>
            </div>

            {/* Email Outreach Readiness Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Email Outreach</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${emailOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {emailOk ? 'Connected' : 'Connection Required'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>Capability: <b className="text-slate-200">Direct Buyer Dispatch</b></div>
                  <div>Status: <b className="text-slate-200">{emailOk ? 'Ready to send' : 'Setup required'}</b></div>
                  <div className="text-[11px] text-slate-500 mt-2">Last check: {testStatus.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail || !emailOk}
                className="w-full py-2 px-3 rounded-xl bg-[#050816] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-[#1E293B] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingEmail ? 'animate-spin' : ''}`} />
                <span>{testingEmail ? 'Verifying...' : 'Verify Email'}</span>
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
                  {modalMode === 'create' ? 'Add Export Product Line' : `Edit "${productFormData.name}"`}
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
                  Product Line Name *
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
                  placeholder="Artisan craftsmanship, metal alloy formulation, meditation uses..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050816] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Target Keywords (comma-separated)
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
                  Set this product line as default immediately
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
                  <span>{submittingProduct ? 'Saving...' : modalMode === 'create' ? 'Create Product Line' : 'Save Changes'}</span>
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
