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

  // Dashboard
  getDashboard: async () => {
    const res = await apiClient.get('/dashboard');
    return res.data;
  },

  // Leads
  getLeads: async () => {
    const res = await apiClient.get('/leads');
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

  // Load Demo Data
  loadDemoData: async () => {
    const res = await apiClient.post('/load-demo');
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
  getClassification: async () => {
    const res = await apiClient.get('/classification');
    return res.data;
  },

  classifyLeads: async () => {
    const res = await apiClient.post('/classify');
    return res.data;
  },

  // Outreach Campaign
  sendCampaign: async (payload) => {
    const res = await apiClient.post('/send', payload);
    return res.data;
  },

  // Activity & Reports
  getActivity: async (limit = 100) => {
    const res = await apiClient.get(`/activity?limit=${limit}`);
    return res.data;
  },

  getReport: async () => {
    const res = await apiClient.get('/report');
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

  // Settings
  getSettings: async () => {
    const res = await apiClient.get('/settings');
    return res.data;
  },

  updateSettings: async (settingsData) => {
    const res = await apiClient.post('/settings', settingsData);
    return res.data;
  },

  // Search Demo
  searchDemo: async (keyword = 'Singing Bowls', limit = 5) => {
    const res = await apiClient.get(`/search/demo?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
    return res.data;
  }
};

export default apiService;
