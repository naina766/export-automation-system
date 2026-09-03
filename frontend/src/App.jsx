import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import apiService from './services/api';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Classification from './pages/Classification';
import SendCampaign from './pages/SendCampaign';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const PageLayout = ({ children, systemStatus }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Dashboard Overview', subtitle: 'Singing Bowls B2B Export Pipeline Performance' };
      case '/upload':
        return { title: 'Lead Ingestion & Verification', subtitle: 'CSV Ingest, Column Normalization, & Deduplication' };
      case '/classify':
        return { title: 'AI Lead Classification', subtitle: 'Gemini 1.5 Semantic B2B vs Individual Segmentation' };
      case '/send':
        return { title: 'Campaign Outreach Dispatcher', subtitle: 'Personalized Email Generation & Safe Dispatch' };
      case '/reports':
        return { title: 'Campaign Performance Reports', subtitle: 'Detailed Outreach Audit Trail & KPI Reports' };
      case '/settings':
        return { title: 'System Configuration', subtitle: 'Runtime Settings, Mode Selectors, & Credential Status' };
      default:
        return { title: 'Export Automation', subtitle: 'Singing Bowls Platform' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      <Sidebar 
        systemStatus={systemStatus} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar 
          title={title} 
          subtitle={subtitle}
          searchKeyword={systemStatus?.search_keyword || 'Singing Bowls'}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  const [systemStatus, setSystemStatus] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await apiService.getDashboard();
      setSystemStatus(res.system);
    } catch (err) {
      console.error('Failed to load system status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <BrowserRouter>
      <PageLayout systemStatus={systemStatus}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/classify" element={<Classification />} />
          <Route path="/send" element={<SendCampaign />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
};

export default App;
