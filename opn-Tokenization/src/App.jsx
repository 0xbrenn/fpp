// src/App.jsx
// ✅ FIXED - Landing page preference persisted in localStorage
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Web3Provider } from './contexts/Web3Context';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/sidebar';
import Notification from './components/common/Notification';
import MarketplaceView from './components/marketplace/MarketplaceView';
import SecondaryMarketplace from './components/marketplace/SecondaryMarketplace';
import PropertyView from './components/property/PropertyView';
import PropertyDetailWrapper from './components/property/PropertyDetailWrapper';
import CreateView from './components/create/CreateView';
import PortfolioView from './components/portfolio/PortfolioView';
import ComplianceView from './components/compliance/ComplianceView';
import AdminDashboard from './components/admin/AdminDashboard';
import LandingPage from './components/landing/LandingPage';
import ToninoLamborghiniView from './components/partners/ToninoLamborghiniView';
import MansoryView from './components/partners/MansoryView';

// Import AppKit configuration
import './config/appkit';

// Main App Layout Component
function AppLayout({ showLanding, setShowLanding }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check screen size on mount and set sidebar state accordingly
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setIsSidebarCollapsed(isMobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Handle entering app - saves preference to localStorage
  const handleEnterApp = () => {
    localStorage.setItem('opn_has_entered_app', 'true');
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className={`${
          isMobileMenuOpen ? 'hidden' : 'md:hidden'
        } fixed top-4 left-4 z-40 p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors`}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/realestate" replace />} />
          
          {/* Real Estate routes */}
          <Route path="/realestate" element={<PropertyView />} />
          <Route path="/realestate/:assetId" element={<PropertyDetailWrapper />} />
          
          {/* Marketplace routes */}
          <Route path="/marketplace" element={<MarketplaceView />} />
          <Route path="/marketplace/:assetId" element={<PropertyDetailWrapper />} />
          
          {/* P2P Market routes */}
          <Route path="/p2p" element={<SecondaryMarketplace />} />
          <Route path="/p2p/:assetId" element={<PropertyDetailWrapper />} />
          
          {/* Other main routes */}
          <Route path="/portfolio" element={<PortfolioView />} />
          <Route path="/create" element={<CreateView />} />
          <Route path="/compliance" element={<ComplianceView />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Partner routes */}
          <Route path="/tonino-lamborghini" element={<ToninoLamborghiniView />} />
          <Route path="/tonino-lamborghini/:assetId" element={<PropertyDetailWrapper />} />
          <Route path="/mansory" element={<MansoryView />} />
          <Route path="/mansory/:assetId" element={<PropertyDetailWrapper />} />
          
          {/* 404 - redirect to default */}
          <Route path="*" element={<Navigate to="/realestate" replace />} />
        </Routes>

        <Notification />
      </div>
    </div>
  );
}

// Root App Component
export default function App() {
  // ✅ FIX: Initialize from localStorage, default to true for first-time users
  const [showLanding, setShowLanding] = useState(() => {
    const hasEnteredApp = localStorage.getItem('opn_has_entered_app');
    return hasEnteredApp !== 'true';
  });

  return (
    <BrowserRouter>
      <Web3Provider>
        <AppProvider>
          <AppLayout showLanding={showLanding} setShowLanding={setShowLanding} />
        </AppProvider>
      </Web3Provider>
    </BrowserRouter>
  );
}