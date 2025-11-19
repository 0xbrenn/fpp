// src/components/portfolio/SellSharesModal.jsx
// PREMIUM THEMED VERSION - Modern dark theme with rounded corners

import React, { useState, useMemo, useEffect } from 'react';
import { X, Loader2, TrendingDown, AlertCircle, DollarSign, Shield, Tag, BarChart3, ArrowRight } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';

const SellSharesModal = ({ isOpen, onClose, asset, onSellComplete }) => {
  const { secondaryMarket, positionNFT } = useContract();
  const { address } = useWeb3();
  const { showNotification } = useApp();
  
  const [amount, setAmount] = useState('');
  const [selling, setSelling] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [approving, setApproving] = useState(false);
  
  // Determine if this is a weighted model asset
  const isWeighted = useMemo(() => {
    return asset?.model === 1 || asset?.model === 'WEIGHTED';
  }, [asset]);
  
  // Calculate holdings based on model
  const { maxAmount, displayAmount, unitLabel, totalAssetValue } = useMemo(() => {
    if (!asset) return { maxAmount: 0, displayAmount: '0', unitLabel: 'shares', totalAssetValue: 0 };
    
    const shares = parseFloat(asset.shares || 0);
    
    if (isWeighted) {
      // ✅ FIXED: Convert wei-units to percentage
      const percentageOwned = parseFloat(ethers.utils.formatUnits(shares.toString(), 16));
      
      // ✅ ROBUST: Try multiple ways to get total asset value
      let assetValue = 0;
      
      // Try 1: asset.totalValue (could be BigNumber, string, or number from PortfolioView)
      if (asset.totalValue) {
        if (ethers.BigNumber.isBigNumber(asset.totalValue)) {
          // It's a BigNumber from blockchain - this is the TOTAL asset value
          assetValue = parseFloat(ethers.utils.formatEther(asset.totalValue));
        } else {
          // It's a number/string from PortfolioView - this is the USER'S value, not total!
          // Skip this and let Try 3 calculate the total
          console.log('⚠️ asset.totalValue is user position value, not total asset value');
        }
      }
      
      // Try 2: asset.currentValue (might be a number)
      if (assetValue === 0 && asset.currentValue) {
        assetValue = parseFloat(asset.currentValue);
      }
      
      // Try 3: Calculate from percentage owned and user's position value
      if (assetValue === 0 && percentageOwned > 0) {
        // User's position value is in asset.totalValue (confusing name!)
        // If user owns 0.010% worth 10 OPN, total = (10 / 0.010) * 100 = 100,000
        const userPositionValue = parseFloat(asset.totalValue || asset.currentValue || 0);
        if (userPositionValue > 0) {
          assetValue = (userPositionValue / percentageOwned) * 100;
        }
      }
      
      console.log('🔍 SellSharesModal - Asset Value Calculation:', {
        percentageOwned,
        assetValue,
        asset_totalValue: asset.totalValue?.toString(),
        asset_currentValue: asset.currentValue
      });
      
      return {
        maxAmount: percentageOwned,
        displayAmount: percentageOwned.toFixed(3) + '%',
        unitLabel: '% ownership',
        totalAssetValue: assetValue
      };
    } else {
      // FIXED MODEL
      const pricePerShare = parseFloat(asset.pricePerShare || 0);
      
      return {
        maxAmount: shares,
        displayAmount: shares.toString(),
        unitLabel: 'shares',
        totalAssetValue: shares * pricePerShare
      };
    }
  }, [asset, isWeighted]);
  
  // Check if SecondaryMarket is approved
 useEffect(() => {
  const checkApproval = async () => {
    if (!positionNFT || !secondaryMarket || !address || !isOpen) {
      setCheckingApproval(false);
      return;
    }

    const positionId = asset?.positionIds?.[0];
    if (!positionId) {
      setCheckingApproval(false);
      return;
    }

    try {
      setCheckingApproval(true);
      // ✅ Check if this specific position is approved
      const approvedAddress = await positionNFT.getApproved(positionId);
      const approved = approvedAddress.toLowerCase() === secondaryMarket.address.toLowerCase();
      setIsApproved(approved);
    } catch (error) {
      console.error('Error checking approval:', error);
      setIsApproved(false);
    } finally {
      setCheckingApproval(false);
    }
  };

  checkApproval();
}, [positionNFT, secondaryMarket, address, isOpen, asset]);
  
  // Calculate value based on amount entered
  const calculatedValue = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '0.00';
    
    if (isWeighted) {
      // ✅ FIXED: Calculate value as percentage of total asset value
      const percentageAmount = parseFloat(amount);
      
      if (totalAssetValue === 0) {
        console.warn('⚠️ Total asset value is 0, cannot calculate listing value');
        return '0.00';
      }
      
      const value = (percentageAmount / 100) * totalAssetValue;
      
      console.log('💰 Calculated Value:', {
        percentageAmount,
        totalAssetValue,
        calculatedValue: value
      });
      
      return value.toFixed(2);
    } else {
      // FIXED MODEL
      const pricePerShare = parseFloat(asset?.pricePerShare || 0);
      return (parseFloat(amount) * pricePerShare).toFixed(2);
    }
  }, [amount, isWeighted, totalAssetValue, asset]);

  // Handle approval
 // Handle approval - SINGLE POSITION ONLY
const handleApprove = async () => {
  if (!positionNFT || !secondaryMarket) {
    showNotification('Contracts not loaded', 'error');
    return;
  }

  // Get the position ID to approve
  const positionId = asset.positionIds?.[0];
  if (!positionId) {
    showNotification('No position ID found', 'error');
    return;
  }

  try {
    setApproving(true);
    
    // ✅ Approve ONLY this specific position NFT
    const tx = await positionNFT.approve(secondaryMarket.address, positionId);
    showNotification('Approval transaction sent...', 'info');
    
    await tx.wait();
    
    setIsApproved(true);
    showNotification('✅ Position approved! You can now list it for sale.', 'success');
  } catch (error) {
    console.error('Approval error:', error);
    if (error.code === 'ACTION_REJECTED') {
      showNotification('Approval cancelled', 'info');
    } else {
      showNotification('Failed to approve position: ' + error.message, 'error');
    }
  } finally {
    setApproving(false);
  }
};

  // Handle listing
  const handleList = async () => {
    if (!amount || !listingPrice) {
      showNotification('Please enter amount and price', 'error');
      return;
    }

    if (parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount) {
      showNotification('Invalid amount', 'error');
      return;
    }

    if (parseFloat(listingPrice) <= 0) {
      showNotification('Price must be greater than 0', 'error');
      return;
    }

    if (!isApproved) {
      showNotification('Please approve the marketplace first', 'error');
      return;
    }

    try {
      setSelling(true);

      // Get the position ID to list
      const positionId = asset.positionIds?.[0];
      if (!positionId) {
        throw new Error('No position ID found');
      }

      // ✅ FIXED: Convert amount to proper format
      let amountToList;
      if (isWeighted) {
        // User enters percentage (e.g., 0.010), convert to wei-units
        amountToList = ethers.utils.parseUnits(amount.toString(), 16);
        console.log('📤 Listing wei-units:', amountToList.toString());
      } else {
        amountToList = Math.floor(parseFloat(amount));
      }

      const priceInWei = ethers.utils.parseEther(listingPrice);

      const tx = await secondaryMarket.listPosition(
        positionId,
        amountToList,
        priceInWei
      );

      showNotification('Listing transaction sent...', 'info');
      await tx.wait();

      showNotification(
        `✅ Successfully listed ${amount} ${unitLabel} for ${listingPrice} OPN!`,
        'success'
      );

      if (onSellComplete) {
        onSellComplete();
      }

      onClose();
    } catch (error) {
      console.error('Listing error:', error);
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Listing cancelled', 'info');
      } else {
        showNotification('Failed to list position: ' + error.message, 'error');
      }
    } finally {
      setSelling(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Premium Header */}
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-light text-white">List Asset for Sale</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Asset Preview Card */}
          <div className="bg-black/50 border border-neutral-800 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-4">
              {asset.assetImageUrl ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 flex-shrink-0">
                  <img
                    src={asset.assetImageUrl}
                    alt={asset.assetName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-8 h-8 text-neutral-600" />
                </div>
              )}
              
              <div className="flex-1">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                  {asset.assetType}
                </p>
                <h3 className="text-lg font-medium text-white mb-1">{asset.assetName}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-blue-400">
                    You own: <span className="font-medium">{displayAmount}</span>
                  </p>
                  {isWeighted && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-md">
                      Weighted
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Approval Status - Subtle indicators */}
          {checkingApproval ? (
            <div className="bg-black/30 border border-neutral-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                <p className="text-sm text-neutral-400">Checking marketplace approval...</p>
              </div>
            </div>
          ) : !isApproved ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-500">
                    Approval Required
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    First approve the marketplace to list this asset
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-500">Marketplace approved ✓</p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Amount Input - Themed */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Amount to Sell
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isWeighted ? "0.010" : "100"}
                  step={isWeighted ? "0.001" : "1"}
                  min="0"
                  max={maxAmount}
                  disabled={!isApproved}
                  className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                  {isWeighted ? '%' : 'shares'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Maximum available: {displayAmount}
              </p>
            </div>

            {/* Price Input - Themed */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Listing Price (Total)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="100.00"
                  step="0.01"
                  min="0"
                  disabled={!isApproved}
                  className="w-full pl-12 pr-20 py-3 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                  OPN
                </span>
              </div>
              {amount && calculatedValue !== '0.00' && (
                <div className="flex items-center justify-between mt-2 p-3 bg-black/30 rounded-lg">
                  <span className="text-xs text-neutral-500">Estimated value</span>
                  <span className="text-sm text-white font-medium">≈ {calculatedValue} OPN</span>
                </div>
              )}
            </div>

            {/* Fee Notice */}
            {listingPrice && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-400 mb-1">Platform Fee: 2%</p>
                    <p className="text-xs text-neutral-400">
                      Buyers will pay: {(parseFloat(listingPrice || 0) * 1.02).toFixed(2)} OPN total
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Premium Style with Uniform Text Size */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-neutral-900 hover:bg-neutral-800 text-white text-base rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={!isApproved ? handleApprove : handleList}
              disabled={
                checkingApproval ||
                approving ||
                selling ||
                (isApproved && (!amount || !listingPrice))
              }
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white text-base font-medium rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
            >
              {checkingApproval ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : approving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Approving...
                </>
              ) : selling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Listing...
                </>
              ) : !isApproved ? (
                <>
                  <Shield className="w-5 h-5" />
                  Approve
                </>
              ) : (
                <>
                  <Tag className="w-5 h-5" />
                  List for Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellSharesModal;