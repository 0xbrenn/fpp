// src/components/layout/sidebar.jsx
// ✅ UPDATED WITH REACT ROUTER - Uses NavLink for proper URL navigation
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, Package, PlusCircle, Briefcase, Shield, Users, ShoppingBag,
  ChevronLeft, ChevronRight, Wallet, Copy, ExternalLink, LogOut, X, Check,
  Building2, Crown, Star
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useAppKitAccount } from "@reown/appkit/react";
import { ethers } from 'ethers';

const Sidebar = ({ isCollapsed, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { address, isConnected, signer } = useWeb3();
  const { status } = useAppKitAccount();
  const { assetRegistry } = useContract();
  const location = useLocation();
  
  const [balance, setBalance] = useState('0');
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isContractAdmin, setIsContractAdmin] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location, setIsMobileMenuOpen]);

  // Check if user is admin via smart contract
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!assetRegistry || !address || !isConnected) {
        setIsContractAdmin(false);
        return;
      }

      try {
        const admins = await assetRegistry.getAllAdmins();
        const isAdmin = admins.some(admin => admin.toLowerCase() === address.toLowerCase());
        setIsContractAdmin(isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsContractAdmin(false);
      }
    };

    checkAdminStatus();
  }, [assetRegistry, address, isConnected]);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && signer && address) {
        try {
          const balanceWei = await signer.getBalance();
          const balanceEth = ethers.utils.formatEther(balanceWei);
          setBalance(parseFloat(balanceEth).toFixed(2));
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance('0');
        }
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isConnected, signer, address]);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`https://explorer.cor3innovations.io/address/${address}`, '_blank');
    }
  };

  const disconnect = async () => {
    if (window.appKit) {
      await window.appKit.disconnect();
      setShowWalletMenu(false);
    }
  };

  const triggerWalletConnect = () => {
    if (window.appKit) {
      window.appKit.open({ view: 'Connect' });
    }
  };

  // ✅ FEATURED PARTNERS - Uses to prop for navigation
  const featuredPartners = [
    {
      id: 'tonino-lamborghini',
      name: 'Tonino Lamborghini',
      path: '/tonino-lamborghini',
      icon: Crown,
      color: '#FFD700',
      bgGradient: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)'
    },
    {
      id: 'mansory',
      name: 'Mansory Collection',
      path: '/mansory',
      icon: Star,
      color: '#FFEB3B',
      bgGradient: 'linear-gradient(135deg, rgba(255, 235, 59, 0.1) 0%, rgba(255, 235, 59, 0.05) 100%)'
    }
  ];

  // ✅ REGULAR NAVIGATION - Uses to prop for navigation
  const navigation = [
    { id: 'property', label: 'Real Estate', icon: Building2, path: '/realestate' },
    { id: 'marketplace', label: 'Marketplace', icon: Package, path: '/marketplace' },
    { id: 'secondary', label: 'P2P Market', icon: ShoppingBag, path: '/p2p' },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, path: '/portfolio' },
    { id: 'create', label: 'Create Asset', icon: PlusCircle, path: '/create', adminOnly: true },
    { id: 'compliance', label: 'Compliance', icon: Shield, path: '/compliance', adminOnly: true },
    { id: 'admin', label: 'Admin Panel', icon: Users, path: '/admin', adminOnly: true }
  ];

  // Filter navigation based on admin status
  const visibleNavigation = navigation.filter(item => 
    !item.adminOnly || isContractAdmin
  );

  return (
    <>
      <aside
        className={`
          fixed top-0 left-0 h-screen z-40
          bg-black border-r border-neutral-900
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 hover:bg-neutral-900 rounded-sm transition-colors z-50"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-900">
          {(!isCollapsed || isMobileMenuOpen) && (
            <span className="text-lg font-semibold text-white tracking-tight">
              OPN
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="hidden md:block p-1.5 hover:bg-neutral-900 rounded-sm transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* FEATURED PARTNERS SECTION */}
          <div className="p-3 border-b border-neutral-800">
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Featured Showcase
                </span>
              </div>
            )}
            
            <div className="space-y-2">
              {featuredPartners.map((partner) => {
                const Icon = partner.icon;
                const isActive = location.pathname === partner.path;
                const showText = !isCollapsed || isMobileMenuOpen;
                
                return (
                  <NavLink
                    key={partner.id}
                    to={partner.path}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-sm
                      transition-all duration-200 relative overflow-hidden group
                      ${isActive 
                        ? 'text-white' 
                        : 'text-neutral-300 hover:text-white'
                      }
                      ${!showText ? 'justify-center' : ''}
                    `}
                    style={{
                      background: isActive ? partner.bgGradient : 'transparent',
                      border: `1px solid ${isActive ? partner.color + '40' : 'transparent'}`,
                    }}
                    title={!showText ? partner.name : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: partner.color }} />
                    {showText && (
                      <>
                        <span className="text-sm font-normal">{partner.name}</span>
                        <div
                          className={`
                            ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded
                            ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            transition-opacity duration-200
                          `}
                          style={{ 
                            backgroundColor: partner.color + '20',
                            color: partner.color,
                            border: `1px solid ${partner.color}40`
                          }}
                        >
                          VIP
                        </div>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* REGULAR NAVIGATION */}
          <nav className="p-3 space-y-1">
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="px-1 mb-3">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Platform
                </span>
              </div>
            )}
            
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showText = !isCollapsed || isMobileMenuOpen;
              
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                    transition-all duration-150
                    ${isActive 
                      ? 'bg-neutral-900 text-white' 
                      : 'text-neutral-400 hover:bg-neutral-900/50 hover:text-white'
                    }
                    ${!showText ? 'justify-center' : ''}
                  `}
                  title={!showText ? item.label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {showText && (
                    <>
                      <span className="text-sm font-normal">{item.label}</span>
                      {item.adminOnly && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                          Admin
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Wallet Section */}
        <div className="border-t border-neutral-900 p-3">
          {isConnected && address ? (
            <>
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2.5 
                  bg-neutral-900 hover:bg-neutral-800 
                  transition-colors rounded-sm relative
                  ${(!isCollapsed || isMobileMenuOpen) ? '' : 'justify-center'}
                `}
                title={(!isCollapsed || isMobileMenuOpen) ? '' : address.slice(0, 6) + '...' + address.slice(-4)}
              >
                <Wallet className="w-5 h-5 flex-shrink-0 text-white" />
                {(!isCollapsed || isMobileMenuOpen) && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white truncate">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {balance} OPN
                    </p>
                  </div>
                )}
              </button>

              {showWalletMenu && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-neutral-900 border border-neutral-800 rounded-sm shadow-xl overflow-hidden z-50">
                  <button
                    onClick={copyAddress}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                  <button
                    onClick={openExplorer}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </button>
                  <button
                    onClick={() => {
                      if (window.appKit) {
                        window.appKit.open({ view: 'Account' });
                        setShowWalletMenu(false);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors border-t border-neutral-800"
                  >
                    <Wallet className="w-4 h-4" />
                    Wallet Details
                  </button>
                  <button
                    onClick={disconnect}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-neutral-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </>
          ) : status === 'connecting' ? (
            <div className="flex items-center justify-center py-3">
              {(!isCollapsed || isMobileMenuOpen) ? (
                <div className="text-center w-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs text-neutral-500">Connecting...</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              )}
            </div>
          ) : (
            <button
              onClick={triggerWalletConnect}
              className={`
                w-full flex items-center gap-2 px-3 py-2.5 
                bg-white text-black hover:bg-neutral-200 
                transition-colors rounded-sm font-normal text-sm
                ${(!isCollapsed || isMobileMenuOpen) ? '' : 'justify-center'}
              `}
              title={(!isCollapsed || isMobileMenuOpen) ? '' : 'Connect Wallet'}
            >
              <Wallet className="w-5 h-5 flex-shrink-0" />
              {(!isCollapsed || isMobileMenuOpen) && <span>Connect Wallet</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}
    </>
  );
};

export default Sidebar;