// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { ethers } from 'ethers';
import { 
  LayoutDashboard, Plus, Settings, Shield, FileText, Users,
  TrendingUp, DollarSign, Package, Loader2
} from 'lucide-react';
import AdminManagement from './AdminManagement';

const AdminDashboard = () => {
  const { isConnected, address } = useWeb3();
  const { tokenization } = useContract();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalRevenue: 0,
    totalInvestors: 0
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!tokenization || !address || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        const adminStatus = await tokenization.isAdmin(address);
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
          // Fetch admin stats
          await fetchAdminStats();
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [tokenization, address, isConnected]);

  const fetchAdminStats = async () => {
    try {
      const [assetIds] = await tokenization.getActiveAssets(0, 1000);
      
      let totalRev = 0;
      let totalInv = 0;

      for (const assetId of assetIds) {
        const asset = await tokenization.assetDetails(assetId);
        totalRev += parseFloat(ethers.utils.formatEther(asset.totalRevenue));
        totalInv += asset.totalInvestors.toNumber();
      }

      setStats({
        totalAssets: assetIds.length,
        totalRevenue: totalRev,
        totalInvestors: totalInv
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">
            Please connect your wallet to access the admin dashboard
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Access Denied</h2>
          <p className="text-neutral-400 font-light">
            You don't have administrator privileges
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'admins', label: 'Admin Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white mb-2">Admin Dashboard</h1>
          <p className="text-neutral-400 font-light">
            Manage assets, admins, and platform settings
          </p>
        </div>

        {/* Stats Cards - Only show on overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-black border border-neutral-900 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-normal text-neutral-500 uppercase tracking-wider">
                  Total Assets
                </h3>
                <Package className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-semibold text-white">{stats.totalAssets}</p>
            </div>

            <div className="bg-black border border-neutral-900 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-normal text-neutral-500 uppercase tracking-wider">
                  Total Revenue
                </h3>
                <DollarSign className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-semibold text-white">
                {stats.totalRevenue.toFixed(2)} OPN
              </p>
            </div>

            <div className="bg-black border border-neutral-900 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-normal text-neutral-500 uppercase tracking-wider">
                  Total Investors
                </h3>
                <TrendingUp className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-semibold text-white">{stats.totalInvestors}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-neutral-900 mb-8">
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm transition-all duration-300 border-b-2
                    ${activeTab === tab.id
                      ? 'text-white border-white font-semibold'
                      : 'text-neutral-500 border-transparent hover:text-neutral-300 font-normal'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-black border border-neutral-900 p-8">
                <h2 className="text-2xl font-light text-white mb-4">Welcome, Admin</h2>
                <p className="text-neutral-400 font-light mb-6">
                  Use the tabs above to create new assets, manage existing ones, add administrators, or adjust platform settings.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveView('create')}
                    className="p-4 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg text-left transition-colors group"
                  >
                    <Plus className="w-6 h-6 text-white mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-white mb-1">Create Asset</h3>
                    <p className="text-sm text-neutral-500">
                      Go to Create view to tokenize a new asset
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('admins')}
                    className="p-4 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg text-left transition-colors group"
                  >
                    <Users className="w-6 h-6 text-white mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-white mb-1">Admin Management</h3>
                    <p className="text-sm text-neutral-500">
                      Add or remove administrators who can manage the platform
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className="p-4 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-lg text-left transition-colors group"
                  >
                    <Settings className="w-6 h-6 text-white mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-semibold text-white mb-1">Platform Settings</h3>
                    <p className="text-sm text-neutral-500">
                      Configure fees, payment addresses, and other settings
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admins' && <AdminManagement />}
          
          {activeTab === 'settings' && (
            <div className="bg-black border border-neutral-900 p-8">
              <h2 className="text-2xl font-light text-white mb-4">Platform Settings</h2>
              <p className="text-neutral-400 font-light">
                Settings panel coming soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;