import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const apiService = {
  // Health
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Products Catalog API
  getProducts: async () => {
    const res = await apiClient.get('/products');
    return res.data;
  },

  createProduct: async (productData) => {
    const res = await apiClient.post('/products', productData);
    return res.data;
  },

  updateProduct: async (id, productData) => {
    const res = await apiClient.put(`/products/${id}`, productData);
    return res.data;
  },

  deleteProduct: async (id) => {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data;
  },

  activateProduct: async (id) => {
    const res = await apiClient.post(`/products/${id}/activate`);
    return res.data;
  },

  // Dashboard
  getDashboard: async (productId = null) => {
    const url = productId ? `/dashboard?product_id=${encodeURIComponent(productId)}` : '/dashboard';
    const res = await apiClient.get(url);
    return res.data;
  },

  // Leads
  getLeads: async (productId = null) => {
    const url = productId ? `/leads?product_id=${encodeURIComponent(productId)}` : '/leads';
    const res = await apiClient.get(url);
    return res.data;
  },

  getInvalidLeads: async () => {
    const res = await apiClient.get('/leads/invalid');
    return res.data;
  },

  // Upload CSV
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // Validate Single Email
  validateEmail: async (email) => {
    const formData = new FormData();
    formData.append('email', email);
    const res = await apiClient.post('/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // Classification
  getClassification: async (productId = null) => {
    const url = productId ? `/classification?product_id=${encodeURIComponent(productId)}` : '/classification';
    const res = await apiClient.get(url);
    return res.data;
  },

  classifyLeads: async (payload = null) => {
    const res = await apiClient.post('/classify', payload || {});
    return res.data;
  },

  // Outreach Campaign
  sendCampaign: async (payload) => {
    const res = await apiClient.post('/send', payload);
    return res.data;
  },

  sendTestEmail: async (payload) => {
    const res = await apiClient.post('/send/test', payload);
    return res.data;
  },

  // Activity & Reports
  getActivity: async (limit = 100) => {
    const res = await apiClient.get(`/activity?limit=${limit}`);
    return res.data;
  },

  getReport: async (productId = null) => {
    const url = productId ? `/report?product_id=${encodeURIComponent(productId)}` : '/report';
    const res = await apiClient.get(url);
    return res.data;
  },

  downloadReport: async () => {
    const res = await apiClient.get('/report/download', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'singing_bowls_export_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Catalog URL for in-browser PDF preview / download
  getCatalogUrl: () => `${API_BASE_URL}/catalog`,

  // Settings & Diagnostics
  getSettings: async () => {
    const res = await apiClient.get('/settings');
    return res.data;
  },

  updateSettings: async (settingsData) => {
    const res = await apiClient.post('/settings', settingsData);
    return res.data;
  },

  testSMTPConnection: async () => {
    const res = await apiClient.post('/settings/test-smtp');
    return res.data;
  },

  testGeminiConnection: async () => {
    const res = await apiClient.post('/settings/test-gemini');
    return res.data;
  },

  testSearchConnection: async () => {
    const res = await apiClient.post('/settings/test-search');
    return res.data;
  },

  // Live Buyer Discovery Search
  searchBuyers: async (searchPayload) => {
    const res = await apiClient.post('/search', searchPayload);
    return res.data;
  },

  // Sample Workflow Demonstration
  getSampleBuyers: async (productId = null) => {
    const url = productId ? `/sample-buyers?product_id=${encodeURIComponent(productId)}` : '/sample-buyers';
    const res = await apiClient.get(url);
    return res.data;
  },

  // Email Enrichment & Manual Editing
  enrichLead: async (payload) => {
    const res = await apiClient.post('/leads/enrich', payload);
    return res.data;
  },

  updateLead: async (payload) => {
    const res = await apiClient.post('/leads/update', payload);
    return res.data;
  }
};

export default apiService;
