import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import apiService from './services/api';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Dashboard from './pages/Dashboard';
import DiscoverBuyers from './pages/DiscoverBuyers';
import Upload from './pages/Upload';
import Classification from './pages/Classification';
import SendCampaign from './pages/SendCampaign';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="w-full"
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discover" element={<DiscoverBuyers />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/classify" element={<Classification />} />
          <Route path="/send" element={<SendCampaign />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const PageLayout = ({ children, systemStatus }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { 
          title: 'Export Outreach Dashboard', 
          subtitle: 'Himalayan Singing Bowls B2B Export Automation' 
        };
      case '/discover':
        return { 
          title: 'Discover International Buyers', 
          subtitle: 'Find real potential buyers using live search APIs.' 
        };
      case '/upload':
        return { 
          title: 'Import Leads', 
          subtitle: 'Import an existing external lead dataset when needed.' 
        };
      case '/classify':
        return { 
          title: 'AI Lead Qualification', 
          subtitle: 'Gemini semantic evaluation & wholesale prospect segmentation' 
        };
      case '/send':
        return { 
          title: 'Send Campaign', 
          subtitle: 'Targeted outreach dispatch via authenticated Gmail SMTP' 
        };
      case '/reports':
        return { 
          title: 'Campaign Analytics & Reports', 
          subtitle: 'Audit trail, delivery results, and lead qualification metrics' 
        };
      case '/settings':
        return { 
          title: 'System Configuration', 
          subtitle: 'Outreach parameters, environment security, and diagnostic health' 
        };
      default:
        return { 
          title: 'Export Automation', 
          subtitle: 'Himalayan Sound Healing Bowls Platform' 
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="relative min-h-screen bg-[#050816] text-[#F8FAFC] flex overflow-x-hidden">
      {/* Ambient Animated Radial Glow Orbs */}
      <div 
        className="fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none z-0 animate-ambient-glow-blue" 
        aria-hidden="true" 
      />
      <div 
        className="fixed top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none z-0 animate-ambient-glow-purple" 
        aria-hidden="true" 
      />
      <div 
        className="fixed -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px] pointer-events-none z-0 animate-ambient-glow-cyan" 
        aria-hidden="true" 
      />

      {/* Sidebar Navigation */}
      <Sidebar 
        systemStatus={systemStatus} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 z-10 relative">
        <Navbar 
          title={title} 
          subtitle={subtitle}
          searchKeyword={systemStatus?.search_keyword || 'Himalayan Singing Bowls'}
          systemStatus={systemStatus}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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
        <AnimatedRoutes />
      </PageLayout>
    </BrowserRouter>
  );
};

export default App;
