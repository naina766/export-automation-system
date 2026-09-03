import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import apiService from './services/api';
import { ProductProvider, useProduct } from './context/ProductContext';

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
        transition={{ duration: 0.28, ease: 'easeOut' }}
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
  const { selectedProduct } = useProduct();

  const getPageInfo = () => {
    const prodName = selectedProduct ? selectedProduct.name : 'Singing Bowls';
    switch (location.pathname) {
      case '/':
        return { 
          title: 'Sales & Outreach Dashboard', 
          subtitle: `${prodName} · B2B Export Performance` 
        };
      case '/discover':
        return { 
          title: 'Discover International Buyers', 
          subtitle: `Find verified international buyers for ${prodName}` 
        };
      case '/upload':
        return { 
          title: 'Import Buyers', 
          subtitle: 'Already have a buyer list? Import it here.' 
        };
      case '/classify':
        return { 
          title: 'Buyer Qualification', 
          subtitle: `AI-assisted commercial fit evaluation for ${prodName}` 
        };
      case '/send':
        return { 
          title: 'Launch Outreach', 
          subtitle: `Personalized email outreach for ${prodName}` 
        };
      case '/reports':
        return { 
          title: 'Sales Analytics & Reports', 
          subtitle: 'Buyer interest, delivery results, and qualification performance' 
        };
      case '/settings':
        return { 
          title: 'Platform Settings', 
          subtitle: 'Product catalog, outreach preferences, and account readiness' 
        };
      default:
        return { 
          title: 'Export Sales Platform', 
          subtitle: `${prodName}` 
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="relative min-h-screen bg-[#050816] text-[#F8FAFC] flex overflow-x-hidden">
      {/* Ambient Animated Radial Glow Orbs with Purple & Cyan palette */}
      <div 
        className="fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none z-0" 
        aria-hidden="true" 
      />
      <div 
        className="fixed top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-cyan-500/8 blur-[140px] pointer-events-none z-0" 
        aria-hidden="true" 
      />
      <div 
        className="fixed -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[130px] pointer-events-none z-0" 
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

const AppContent = () => {
  const [systemStatus, setSystemStatus] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await apiService.getDashboard();
      setSystemStatus(res.system);
    } catch {
      // Handled quietly without exposing developer logs
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <PageLayout systemStatus={systemStatus}>
      <AnimatedRoutes />
    </PageLayout>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <ProductProvider>
        <AppContent />
      </ProductProvider>
    </BrowserRouter>
  );
};

export default App;
