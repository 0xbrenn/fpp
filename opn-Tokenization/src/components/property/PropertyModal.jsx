// src/components/property/PropertyModal.jsx
// FIXED VERSION - Proper conditional rendering for FIXED vs WEIGHTED models
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, MapPin, Home, Maximize, Calendar, Users, Shield, Loader2, 
  Percent, TrendingUp, AlertCircle, Car, Palette, Package,
  Building2, Trees
} from 'lucide-react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useContract } from '../../hooks/useContract';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';

const PropertyModal = ({ property, onClose, onPurchaseSuccess }) => {
  const { getUserShares } = useMarketplace();
  const { primaryMarket } = useContract();
  const { address } = useWeb3();
  const { showNotification, userKYCStatus } = useApp();
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState(0.1);
  const [tokenAmount, setTokenAmount] = useState(1);
  const [customInput, setCustomInput] = useState('0.1');
  const [inputMode, setInputMode] = useState('buttons');
  const [userCurrentShares, setUserCurrentShares] = useState(0);
  const [fetchingShares, setFetchingShares] = useState(true);
  
  // FIXED: Detect model type
  const isWeightedModel = property.model === 1 || property.model === 'WEIGHTED';
  
  console.log('🔍 PropertyModal - Asset Model:', {
    assetId: property.assetId,
    model: property.model,
    isWeightedModel,
    hasPrice: !!property.pricePerShare,
    hasTotalValue: !!property.totalValue,
    pricePerToken: property.pricePerToken,
    totalSupply: property.totalSupply
  });
  
  // Helper to safely convert BigNumber to number
  const toNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (ethers.BigNumber.isBigNumber(value)) {
      return parseFloat(ethers.utils.formatEther(value));
    }
    return parseFloat(value);
  };
  
  // FIXED: Different property data based on model
  const propertyData = useMemo(() => {
    if (isWeightedModel) {
      // WEIGHTED MODEL
      return {
        totalValue: property.totalValue ? toNumber(property.totalValue) : 0,
        minWeight: property.minPurchaseWeight ? property.minPurchaseWeight / 100 : 0.01,
        maxWeight: property.maxPurchaseWeight ? property.maxPurchaseWeight / 100 : 100,
        isWeighted: true
      };
    } else {
      // FIXED MODEL
      return {
        totalShares: property.totalSupply ? toNumber(property.totalSupply) : 0,
        availableShares: property.availableShares ? toNumber(property.availableShares) : 0,
        pricePerShare: property.pricePerToken ? toNumber(property.pricePerToken) : 0,
        maxPurchaseAmount: property.maxPurchaseAmount ? toNumber(property.maxPurchaseAmount) : 0,
        minPurchaseAmount: property.minPurchaseAmount ? toNumber(property.minPurchaseAmount) : 1,
        isWeighted: false
      };
    }
  }, [property, isWeightedModel]);
  
  // Fetch user's current shares on mount (only for FIXED)
  useEffect(() => {
    const fetchUserShares = async () => {
      if (!address || !property || isWeightedModel) {
        setFetchingShares(false);
        return;
      }
      
      try {
        setFetchingShares(true);
        const assetId = property.assetId || property.tokenId;
        const shares = await getUserShares(address, assetId);
        setUserCurrentShares(parseFloat(shares || 0));
      } catch (error) {
        console.error('Error fetching user shares:', error);
        setUserCurrentShares(0);
      } finally {
        setFetchingShares(false);
      }
    };
    
    fetchUserShares();
  }, [address, property?.assetId, property?.tokenId, getUserShares, isWeightedModel]);
  
  // FIXED: Calculate max percentage based on model
  const maxPercentage = useMemo(() => {
    if (isWeightedModel) {
      return propertyData.maxWeight || 100;
    }
    
    const remainingAllowed = propertyData.maxPurchaseAmount > 0
      ? Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)
      : propertyData.availableShares;
    
    const maxSharesUserCanBuy = Math.min(propertyData.availableShares, remainingAllowed);
    return propertyData.totalShares > 0 ? (maxSharesUserCanBuy / propertyData.totalShares) * 100 : 0;
  }, [propertyData, userCurrentShares, isWeightedModel]);
  
  // FIXED: Calculate total cost based on model
  const totalCost = useMemo(() => {
    if (isWeightedModel) {
      // WEIGHTED: cost = (percentage / 100) × totalValue
      return (percentage / 100) * propertyData.totalValue;
    } else {
      // FIXED: cost = tokens × pricePerToken
      const shareAmount = Math.floor((percentage / 100) * propertyData.totalShares);
      return propertyData.pricePerShare * shareAmount;
    }
  }, [percentage, propertyData, isWeightedModel]);
  
  // Calculate share amount (only for FIXED)
  const shareAmount = useMemo(() => {
    if (isWeightedModel) return 0;
    return Math.floor((percentage / 100) * propertyData.totalShares);
  }, [percentage, propertyData.totalShares, isWeightedModel]);
  
  // Total value (only for FIXED)
  const totalValue = useMemo(() => {
    if (isWeightedModel) return 0;
    return propertyData.pricePerShare * propertyData.totalShares;
  }, [propertyData, isWeightedModel]);
  
  const soldPercentage = useMemo(() => {
    if (isWeightedModel) return 0;
    return propertyData.totalShares > 0
      ? ((propertyData.totalShares - propertyData.availableShares) / propertyData.totalShares) * 100
      : 0;
  }, [propertyData, isWeightedModel]);
  
  // Quick percentage options
  const quickPercentages = useMemo(() => {
    const options = [];
    const max = maxPercentage > 0 ? maxPercentage : 100;
    
    if (max >= 0.1) options.push(0.1);
    if (max >= 0.5) options.push(0.5);
    if (max >= 1) options.push(1);
    if (max >= 5) options.push(5);
    if (max >= 10) options.push(10);
    if (max >= 25) options.push(25);
    
    return options;
  }, [maxPercentage]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  const handlePercentageSelect = (value) => {
    setPercentage(value);
    setCustomInput(value.toString());
    setInputMode('buttons');
  };
  
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    const maxAllowed = maxPercentage > 0 ? maxPercentage : 100;
    const cappedValue = Math.min(value, maxAllowed);
    setPercentage(cappedValue);
    setCustomInput(cappedValue.toString());
    setInputMode('slider');
  };
  
  const handleCustomInputChange = (e) => {
    const value = e.target.value;
    setCustomInput(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.min(maxPercentage, Math.max(0.001, numValue));
      setPercentage(clampedValue);
    }
  };
  
  const meetsKYCRequirement = useMemo(() => {
    if (!property.requiresPurchaserKYC) return true;
    return userKYCStatus === true;
  }, [property.requiresPurchaserKYC, userKYCStatus]);
  
  // FIXED: Purchase function with conditional logic
  const handlePurchase = async () => {
    if (isWeightedModel) {
      // WEIGHTED MODEL PURCHASE
      if (percentage < propertyData.minWeight) {
        showNotification(`Minimum purchase is ${propertyData.minWeight}%`, 'error');
        return;
      }
      if (percentage > propertyData.maxWeight) {
        showNotification(`Maximum purchase is ${propertyData.maxWeight}%`, 'error');
        return;
      }

      try {
        setLoading(true);
        
        // Convert percentage to basis points (1% = 100 basis points)
        const basisPoints = Math.floor(percentage * 100);
        
        // FIXED: Add platform fee (2.5%) to payment
        const fee = totalCost * 0.025;
        const totalWithFee = totalCost + fee;
        const costInWei = ethers.utils.parseEther(totalWithFee.toString());
        
        console.log('Purchasing weighted:', {
          assetId: property.assetId,
          percentage: percentage + '%',
          basisPoints,
          baseCost: totalCost + ' OPN',
          platformFee: fee + ' OPN',
          totalPayment: totalWithFee + ' OPN',
          totalPaymentWei: costInWei.toString()
        });
        
        // Call primaryMarket.purchaseWeighted()
        const tx = await primaryMarket.purchaseWeighted(
          property.assetId,
          basisPoints,
          { value: costInWei }
        );
        
        await tx.wait();
        
        showNotification(
          `✅ Successfully acquired ${formatPercentage(percentage)}% ownership of ${property.assetName}!`,
          'success'
        );
        
        // Trigger parent refresh
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
        
        onClose();
      } catch (error) {
        console.error('Weighted purchase error:', error);
        showNotification('Transaction failed: ' + (error.message || 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
      
    } else {
      // FIXED MODEL PURCHASE
      if (!shareAmount || shareAmount <= 0) {
        showNotification('Please select a valid amount to purchase', 'error');
        return;
      }

      if (shareAmount < propertyData.minPurchaseAmount) {
        showNotification(
          `Minimum purchase is ${propertyData.minPurchaseAmount} shares`, 
          'error'
        );
        return;
      }
      
      if (shareAmount > propertyData.availableShares) {
        showNotification(
          `Only ${propertyData.availableShares} shares available`, 
          'error'
        );
        return;
      }

      if (propertyData.maxPurchaseAmount > 0) {
        const totalAfterPurchase = userCurrentShares + shareAmount;
        
        if (userCurrentShares >= propertyData.maxPurchaseAmount) {
          showNotification(
            `❌ Purchase Limit Reached: Maximum ${propertyData.maxPurchaseAmount} shares per user.`,
            'error'
          );
          return;
        }
        
        if (totalAfterPurchase > propertyData.maxPurchaseAmount) {
          const remainingAllowed = propertyData.maxPurchaseAmount - userCurrentShares;
          showNotification(
            `❌ Exceeds Limit: You can only purchase ${remainingAllowed} more shares.`,
            'error'
          );
          return;
        }
      }

      if (!meetsKYCRequirement) {
        showNotification('KYC verification required', 'error');
        return;
      }

      try {
        setLoading(true);
        
        // FIXED: Add platform fee (2.5%) to payment
        const fee = totalCost * 0.025;
        const totalWithFee = totalCost + fee;
        const costInWei = ethers.utils.parseEther(totalWithFee.toString());
        
        console.log('Purchasing fixed:', {
          assetId: property.assetId,
          tokenAmount: shareAmount,
          baseCost: totalCost + ' OPN',
          platformFee: fee + ' OPN',
          totalPayment: totalWithFee + ' OPN',
          totalPaymentWei: costInWei.toString()
        });
        
        // Call primaryMarket.purchaseFixed()
        const tx = await primaryMarket.purchaseFixed(
          property.assetId,
          shareAmount,
          { value: costInWei }
        );
        
        await tx.wait();
        
        showNotification(
          `✅ Successfully acquired ${shareAmount} tokens of ${property.assetName}!`,
          'success'
        );
        
        // Trigger parent refresh
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
        
        onClose();
      } catch (error) {
        console.error('Fixed purchase error:', error);
        showNotification('Transaction failed: ' + (error.message || 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Check if user has reached max limit (FIXED only)
  const hasReachedLimit = !isWeightedModel && 
    propertyData.maxPurchaseAmount > 0 && 
    userCurrentShares >= propertyData.maxPurchaseAmount;
  
  // Format numbers
  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };
  
  const formatPercentage = (num) => {
    return parseFloat(num || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
    });
  };
  
  // Determine property type icon
  const getPropertyTypeIcon = () => {
    const type = property.assetType?.toLowerCase() || '';
    if (type.includes('vehicle')) return Car;
    if (type.includes('art')) return Palette;
    if (type.includes('collectible')) return Package;
    if (type.includes('commercial')) return Building2;
    if (type.includes('land')) return Trees;
    return Home;
  };

  const PropertyTypeIcon = getPropertyTypeIcon();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black border border-neutral-900 rounded-sm max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black z-10 flex items-center justify-between p-6 border-b border-neutral-900 flex-shrink-0">
          <h2 className="text-2xl font-light text-white">
            {property.assetType?.toLowerCase().includes('vehicle') ? 'Vehicle Details' : 
             property.assetType?.toLowerCase().includes('art') ? 'Art Details' :
             property.assetType?.toLowerCase().includes('collectible') ? 'Collectible Details' :
             'Property Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 transition-colors rounded-sm"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Property Info */}
              <div className="space-y-6">
                <div className="aspect-video w-full bg-neutral-900 rounded-sm overflow-hidden">
                  <img 
                    src={property.assetImageUrl || '/placeholder-property.jpg'} 
                    alt={property.assetName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
                    <PropertyTypeIcon className="w-4 h-4" />
                    <span>{property.assetType || 'Real Estate'}</span>
                  </div>
                  <h3 className="text-2xl font-light text-white mb-3">{property.assetName}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {property.assetDescription}
                  </p>
                </div>

                {/* FIXED: Conditional Investment Overview */}
                <div className="p-4 bg-neutral-950 rounded-sm">
                  <h4 className="text-sm font-semibold text-white mb-3">Investment Overview</h4>
                  
                  <div className="space-y-3">
                    {isWeightedModel ? (
                      // WEIGHTED MODEL OVERVIEW
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Total Asset Value</span>
                          <span className="text-white">{formatNumber(propertyData.totalValue)} OPN</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Min Purchase</span>
                          <span className="text-white">{propertyData.minWeight}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Max Purchase</span>
                          <span className="text-white">{propertyData.maxWeight}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Purchase Model</span>
                          <span className="text-green-400">Weighted (Percentage-based)</span>
                        </div>
                      </>
                    ) : (
                      // FIXED MODEL OVERVIEW
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Total Property Value</span>
                          <span className="text-white">{formatNumber(totalValue)} OPN</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Price per Share</span>
                          <span className="text-white">{formatNumber(propertyData.pricePerShare)} OPN</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Total Shares</span>
                          <span className="text-white">{formatNumber(propertyData.totalShares)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Available Shares</span>
                          <span className="text-green-400">{formatNumber(propertyData.availableShares)}</span>
                        </div>
                        <div className="pt-3 border-t border-neutral-800">
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-400">Percentage Sold</span>
                            <span className="text-white font-semibold">{soldPercentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Purchase Model</span>
                          <span className="text-blue-400">Fixed (Token-based)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Purchase Section */}
              <div className="space-y-6">
                {/* Purchase Requirements Info Box - Only for FIXED */}
                {!isWeightedModel && propertyData.maxPurchaseAmount > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 p-4">
                    <p className="text-sm text-white mb-2">Purchase Requirements</p>
                    <div className="space-y-1 text-xs text-neutral-400">
                      <p>• Maximum per user: {propertyData.maxPurchaseAmount} shares</p>
                      <p>• Your current holdings: {userCurrentShares} shares</p>
                      <p className="text-green-400">
                        • You can buy up to {Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)} more shares
                      </p>
                    </div>
                  </div>
                )}

                {/* Purchase Interface */}
                {!hasReachedLimit ? (
                  <div className="bg-neutral-900 border border-neutral-800 p-6 space-y-6">
                    <h3 className="text-lg font-light text-white">Purchase Shares</h3>

                    {/* Quick Select Buttons */}
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">
                        Quick Select Ownership
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {quickPercentages.map((value) => (
                          <button
                            key={value}
                            onClick={() => handlePercentageSelect(value)}
                            className={`px-4 py-2 text-sm font-light transition-colors border ${
                              percentage === value && inputMode === 'buttons'
                                ? 'bg-white text-black border-white'
                                : 'bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800'
                            }`}
                            disabled={loading || fetchingShares}
                          >
                            {value}%
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const maxAllowed = maxPercentage > 0 ? maxPercentage : 100;
                            handlePercentageSelect(maxAllowed);
                          }}
                          className="px-4 py-2 bg-neutral-900 text-white font-light hover:bg-neutral-800 
                                   transition-colors border border-neutral-800"
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Custom Percentage Slider */}
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">
                        Custom Percentage
                      </p>
                      <input
                        type="range"
                        min="0"
                        max={maxPercentage > 0 ? maxPercentage : 100}
                        step="0.001"
                        value={percentage}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer 
                                 accent-white"
                        disabled={loading || fetchingShares}
                      />
                      <div className="flex justify-between text-xs text-neutral-500 mt-2">
                        <span>0%</span>
                        <span>{(maxPercentage > 0 ? maxPercentage : 100).toFixed(3)}%</span>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <input
                          type="number"
                          value={customInput}
                          onChange={handleCustomInputChange}
                          step="0.001"
                          min="0"
                          max={maxPercentage > 0 ? maxPercentage : 100}
                          className="flex-1 bg-black border border-neutral-800 px-4 py-3 text-white 
                                   focus:outline-none focus:border-white transition-colors"
                          disabled={loading || fetchingShares}
                        />
                        <div className="px-4 py-3 bg-black border border-neutral-800 text-neutral-400 
                                      flex items-center">
                          %
                        </div>
                        <button
                          onClick={() => {
                            const maxAllowed = maxPercentage > 0 ? maxPercentage : 100;
                            setPercentage(maxAllowed);
                            setCustomInput(maxAllowed.toString());
                          }}
                          className="px-6 py-3 bg-neutral-900 text-white font-light hover:bg-neutral-800 
                                   transition-colors border border-neutral-800"
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* FIXED: Conditional Transaction Summary */}
                    <div className="bg-neutral-950 border border-neutral-900 p-6">
                      <h3 className="text-xs font-light uppercase tracking-wider text-neutral-400 mb-4">
                        Transaction Summary
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Ownership Percentage</span>
                          <span className="text-lg font-semibold text-white">{formatPercentage(percentage)}%</span>
                        </div>
                        
                        {isWeightedModel ? (
                          // WEIGHTED MODEL FIELDS
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-light text-neutral-400">Total Asset Value</span>
                              <span className="text-sm font-light text-neutral-300">{formatNumber(propertyData.totalValue)} OPN</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-light text-neutral-400">Your Investment</span>
                              <span className="text-sm font-light text-neutral-300">{formatNumber(totalCost)} OPN</span>
                            </div>
                          </>
                        ) : (
                          // FIXED MODEL FIELDS
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-light text-neutral-400">Number of Units</span>
                              <span className="text-sm font-light text-neutral-300">{shareAmount.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-light text-neutral-400">Price per Unit</span>
                              <span className="text-sm font-light text-neutral-300">{formatNumber(propertyData.pricePerShare)} OPN</span>
                            </div>
                            
                            {propertyData.maxPurchaseAmount > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-light text-neutral-400">After Purchase</span>
                                <span className="text-sm font-light text-green-400">
                                  {userCurrentShares + shareAmount} / {propertyData.maxPurchaseAmount} shares
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                          <span className="text-sm font-light text-neutral-400">Platform Fee (2.5%)</span>
                          <span className="text-sm font-light text-neutral-300">{formatNumber(totalCost * 0.025)} OPN</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                          <span className="text-base font-semibold text-white">Total Cost</span>
                          <span className="text-2xl font-semibold text-white">{formatNumber(totalCost * 1.025)} OPN</span>
                        </div>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 text-xs text-neutral-400 space-y-1">
                      <p>• Each unit represents {isWeightedModel ? 'percentage' : 'fixed'} ownership</p>
                      <p>• Ownership is immediately tradeable on secondary markets</p>
                      <p>• All transactions are recorded immutably on-chain</p>
                      <p>• Fractional owners may receive proportional dividends if applicable</p>
                      {!isWeightedModel && propertyData.maxPurchaseAmount > 0 && (
                        <p className="text-yellow-400">• This asset has a {propertyData.maxPurchaseAmount} share maximum per user</p>
                      )}
                      {!isWeightedModel && propertyData.minPurchaseAmount > 1 && (
                        <p className="text-yellow-400">• Minimum purchase is {propertyData.minPurchaseAmount} shares. Increase percentage.</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 text-neutral-400 hover:text-white font-light 
                                 transition-colors disabled:opacity-50 border border-neutral-800
                                 hover:border-neutral-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePurchase}
                        disabled={loading || (isWeightedModel ? percentage <= 0 : shareAmount < 1) || !meetsKYCRequirement || fetchingShares}
                        className="flex-1 py-3 bg-white text-black font-light 
                                 hover:bg-neutral-100 transition-all duration-300
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing Transaction...</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {isWeightedModel 
                                ? `Acquire ${formatPercentage(percentage)}% Ownership`
                                : `Acquire ${shareAmount} Token${shareAmount > 1 ? 's' : ''}`
                              }
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Reached limit message (FIXED only)
                  <div className="bg-red-900/10 border border-red-900/30 p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Purchase Limit Reached</h3>
                    <p className="text-sm text-neutral-400">
                      You have reached the maximum allowed {propertyData.maxPurchaseAmount} shares for this asset.
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">
                      This limit is set by the asset owner to ensure fair distribution.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyModal;