// src/components/admin/AdminManagement.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { ethers } from 'ethers';
import { 
  Shield, Plus, Trash2, Loader2, Copy, Check, AlertCircle, Users 
} from 'lucide-react';

const AdminManagement = () => {
  const { address, isConnected } = useWeb3();
  const { tokenization } = useContract();
  const { showNotification } = useApp();
  
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!tokenization || !address) return;
      
      try {
        const isAdmin = await tokenization.isAdmin(address);
        setIsCurrentUserAdmin(isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdmin();
  }, [tokenization, address]);

  // Fetch all admins
  useEffect(() => {
    const fetchAdmins = async () => {
      if (!tokenization || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const adminList = await tokenization.getAllAdmins();
        setAdmins(adminList);
      } catch (error) {
        console.error('Error fetching admins:', error);
        showNotification('Failed to fetch admin list', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [tokenization, isConnected, showNotification]);

  // Add new admin
  const handleAddAdmin = async () => {
    if (!newAdminAddress) {
      showNotification('Please enter an address', 'error');
      return;
    }

    // Validate address
    if (!ethers.utils.isAddress(newAdminAddress)) {
      showNotification('Invalid Ethereum address', 'error');
      return;
    }

    try {
      setAddingAdmin(true);
      const tx = await tokenization.addAdmin(newAdminAddress);
      await tx.wait();

      // Refresh admin list
      const adminList = await tokenization.getAllAdmins();
      setAdmins(adminList);
      
      setNewAdminAddress('');
      showNotification('Admin added successfully', 'success');
    } catch (error) {
      console.error('Error adding admin:', error);
      
      if (error.message.includes('Already an admin')) {
        showNotification('Address is already an admin', 'error');
      } else {
        showNotification('Failed to add admin', 'error');
      }
    } finally {
      setAddingAdmin(false);
    }
  };

  // Remove admin
  const handleRemoveAdmin = async (adminAddress) => {
    if (adminAddress.toLowerCase() === address.toLowerCase()) {
      showNotification('You cannot remove yourself', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove this admin?\n\n${adminAddress}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setRemovingAdmin(adminAddress);
      const tx = await tokenization.removeAdmin(adminAddress);
      await tx.wait();

      // Refresh admin list
      const adminList = await tokenization.getAllAdmins();
      setAdmins(adminList);
      
      showNotification('Admin removed successfully', 'success');
    } catch (error) {
      console.error('Error removing admin:', error);
      showNotification('Failed to remove admin', 'error');
    } finally {
      setRemovingAdmin(null);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Format address for display
  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-black border border-neutral-900 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
        <p className="text-neutral-400 font-light">
          Please connect your wallet to manage admins
        </p>
      </div>
    );
  }

  if (!isCurrentUserAdmin) {
    return (
      <div className="bg-black border border-neutral-900 p-8 text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-light text-white mb-2">Access Denied</h2>
        <p className="text-neutral-400 font-light">
          Only administrators can manage admin accounts
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-black border border-neutral-900 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black border border-neutral-900 p-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-white" />
          <h2 className="text-2xl font-light text-white">Admin Management</h2>
        </div>
        <p className="text-neutral-400 font-light">
          Manage administrator accounts who can create and manage assets
        </p>
      </div>

      {/* Add New Admin */}
      <div className="bg-black border border-neutral-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Administrator
        </h3>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="0x... (Ethereum address)"
            value={newAdminAddress}
            onChange={(e) => setNewAdminAddress(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-neutral-700 font-mono text-sm"
          />
          
          <button
            onClick={handleAddAdmin}
            disabled={addingAdmin || !newAdminAddress}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {addingAdmin ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Admin
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-neutral-500 mt-2">
          New admins will be able to create assets, manage proposals, and add other admins
        </p>
      </div>

      {/* Admin List */}
      <div className="bg-black border border-neutral-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Current Administrators ({admins.length})
        </h3>

        {admins.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No administrators found
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => {
              const isCurrentUser = admin.toLowerCase() === address.toLowerCase();
              const isRemoving = removingAdmin === admin;

              return (
                <div
                  key={admin}
                  className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Shield className="w-5 h-5 text-neutral-500" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {formatAddress(admin)}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 font-mono mt-1">
                        {admin}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyAddress(admin)}
                      className="p-2 hover:bg-neutral-900 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === admin ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>

                    {!isCurrentUser && (
                      <button
                        onClick={() => handleRemoveAdmin(admin)}
                        disabled={isRemoving}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove admin"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-neutral-400">
            <p className="font-medium text-neutral-300 mb-1">Important Notes:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Admins can create and manage all assets on the platform</li>
              <li>Admins can add or remove other administrators</li>
              <li>You cannot remove yourself as an admin</li>
              <li>Always verify addresses before adding new admins</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;