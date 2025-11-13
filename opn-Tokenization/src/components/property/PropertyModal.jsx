// src/components/property/PropertyModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, MapPin, Home, Maximize, Calendar, Users, Shield, Loader2, 
  Percent, TrendingUp, AlertCircle, Car, Palette, Package,
  Building2, Trees, Bed, Bath
} from 'lucide-react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';

const PropertyModal = ({ property, onClose }) => {
  const { purchaseShares, getUserShares } = useMarketplace();
  const { address } = useWeb3();
  const { showNotification, userKYCStatus } = useApp();
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState(0.1);
  const [customInput, setCustomInput] = useState('0.1');
  const [inputMode, setInputMode] = useState('buttons');
  const [userCurrentShares, setUserCurrentShares] = useState(0);
  const [fetchingShares, setFetchingShares] = useState(true);
  
  // Helper to safely convert BigNumber to number
  const toNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (ethers.BigNumber.isBigNumber(value)) {
      return parseFloat(ethers.utils.formatEther(value));
    }
    return parseFloat(value);
  };
  
  // Convert property values once at the top
  const propertyData = useMemo(() => ({
    totalShares: toNumber(property.totalShares),
    availableShares: toNumber(property.availableShares),
    pricePerShare: toNumber(property.pricePerShare),
    maxPurchaseAmount: property.maxPurchaseAmount ? toNumber(property.maxPurchaseAmount) : 0,
    minPurchaseAmount: property.minPurchaseAmount ? toNumber(property.minPurchaseAmount) : 1,
  }), [property]);
  
  // Fetch user's current shares on mount
  useEffect(() => {
    const fetchUserShares = async () => {
      if (!address || !property) {
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
  }, [address, property?.assetId, property?.tokenId, getUserShares]);
  
  // Calculate remaining allowed shares for this user
  const remainingAllowed = useMemo(() => {
    if (propertyData.maxPurchaseAmount > 0) {
      return Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares);
    }
    return propertyData.availableShares;
  }, [propertyData.maxPurchaseAmount, userCurrentShares, propertyData.availableShares]);
  
  // Calculate maximum percentage user can buy
  const maxPercentage = useMemo(() => {
    const maxSharesUserCanBuy = Math.min(propertyData.availableShares, remainingAllowed);
    return propertyData.totalShares > 0 ? (maxSharesUserCanBuy / propertyData.totalShares) * 100 : 0;
  }, [propertyData.totalShares, propertyData.availableShares, remainingAllowed]);
  
  // Calculate share amount from percentage
  const shareAmount = useMemo(() => {
    return Math.floor((percentage / 100) * propertyData.totalShares);
  }, [percentage, propertyData.totalShares]);
  
  // Calculate total cost
  const totalCost = useMemo(() => {
    return propertyData.pricePerShare * shareAmount;
  }, [propertyData.pricePerShare, shareAmount]);
  
  const totalValue = propertyData.pricePerShare * propertyData.totalShares;
  const soldPercentage = ((propertyData.totalShares - propertyData.availableShares) / propertyData.totalShares) * 100;
  
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
  
  const handlePurchase = async () => {
    // Validation checks
    if (!shareAmount || shareAmount <= 0) {
      showNotification('Please select a valid percentage to purchase', 'error');
      return;
    }

    if (shareAmount < propertyData.minPurchaseAmount) {
      showNotification(
        `Minimum purchase requirement is ${propertyData.minPurchaseAmount} share${propertyData.minPurchaseAmount > 1 ? 's' : ''}. You selected ${shareAmount} share${shareAmount > 1 ? 's' : ''}.`, 
        'error'
      );
      return;
    }

    if (shareAmount > propertyData.availableShares) {
      showNotification(
        `Only ${propertyData.availableShares} shares are available, but you're trying to buy ${shareAmount} shares.`, 
        'error'
      );
      return;
    }

    if (propertyData.maxPurchaseAmount > 0) {
      if (fetchingShares) {
        showNotification('Please wait while we check your current holdings...', 'info');
        return;
      }
      
      const totalAfterPurchase = userCurrentShares + shareAmount;
      
      if (userCurrentShares >= propertyData.maxPurchaseAmount) {
        showNotification(
          `❌ Purchase Limit Reached: You already own the maximum allowed ${propertyData.maxPurchaseAmount} shares for this asset.`, 
          'error'
        );
        return;
      }
      
      if (totalAfterPurchase > propertyData.maxPurchaseAmount) {
        const remainingAllowed = propertyData.maxPurchaseAmount - userCurrentShares;
        showNotification(
          `❌ Exceeds Purchase Limit: This asset has a maximum of ${propertyData.maxPurchaseAmount} shares per user. You currently own ${userCurrentShares} shares, so you can only purchase up to ${remainingAllowed} more shares.`, 
          'error'
        );
        return;
      }
    }

    if (!meetsKYCRequirement) {
      showNotification('KYC verification is required to purchase this property', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      const assetId = property.assetId || property.tokenId;
      const tx = await purchaseShares(assetId, shareAmount);
      
      showNotification(
        `✅ Successfully acquired ${formatPercentage(percentage)}% ownership of ${property.assetName}!`, 
        'success'
      );
      
      onClose();
    } catch (error) {
      console.error('Purchase transaction error:', error);
      
      let errorMessage = 'Transaction failed. ';
      
      if (error.code === 'ACTION_REJECTED' || error.message?.includes('rejected')) {
        errorMessage = '❌ Transaction was rejected in your wallet.';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
        errorMessage = '❌ Insufficient OPN balance to complete this purchase.';
      } else if (error.message?.includes('ExceedsMaxPurchase')) {
        errorMessage = `❌ Contract Error: Purchase exceeds the maximum allowed ${propertyData.maxPurchaseAmount} shares per user.`;
      } else if (error.message?.includes('BelowMinPurchase')) {
        errorMessage = `❌ Contract Error: Purchase is below the minimum required ${propertyData.minPurchaseAmount} shares.`;
      } else if (error.message?.includes('InsufficientShares')) {
        errorMessage = '❌ Contract Error: Not enough shares available.';
      } else if (error.message?.includes('KYCRequired') || error.message?.includes('NotVerified')) {
        errorMessage = '❌ KYC verification required but not completed.';
      } else if (error.reason) {
        errorMessage = `❌ ${error.reason}`;
      } else {
        errorMessage = '❌ Transaction failed. Please check your wallet and try again.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has reached max limit
  const hasReachedLimit = propertyData.maxPurchaseAmount > 0 && userCurrentShares >= propertyData.maxPurchaseAmount;

  // Determine property type icon
  const getPropertyTypeIcon = () => {
    const type = property.propertyType || property.propertySubType || '';
    if (type.toLowerCase().includes('commercial')) return Building2;
    if (type.toLowerCase().includes('land')) return Trees;
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
            className="p-2 hover:bg-neutral-900 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Image and Complete Details */}
            <div>
              {/* Main Image */}
              <img 
                src={property.assetImageUrl} 
                alt={property.assetName}
                className="w-full aspect-[4/3] object-cover rounded-sm mb-6"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
                }}
              />
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-neutral-500 font-normal mb-2">
                    {property.assetType || 'REAL_ESTATE'}
                  </p>
                  <h3 className="text-2xl font-semibold text-white">{property.assetName}</h3>
                </div>
                
                <p className="text-neutral-400">{property.assetDescription}</p>
                
                {/* Investment Overview */}
                <div className="p-4 bg-neutral-950 rounded-sm">
                  <h4 className="text-sm font-semibold text-white mb-3">Investment Overview</h4>
                  
                  <div className="space-y-3">
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
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Purchase Section */}
            <div className="space-y-6">
              {/* Purchase Requirements Info Box */}
              {(propertyData.maxPurchaseAmount > 0 || propertyData.minPurchaseAmount > 1) && (
                <div className="bg-neutral-900 border border-neutral-800 p-4">
                  <p className="text-sm text-white mb-2">Purchase Requirements</p>
                  <div className="space-y-1 text-xs text-neutral-400">
                    {propertyData.maxPurchaseAmount > 0 && (
                      <>
                        <p>• Maximum per user: {propertyData.maxPurchaseAmount} shares</p>
                        <p>• Your current holdings: {userCurrentShares} shares</p>
                        <p className="text-green-400">
                          • You can buy up to {remainingAllowed} more shares
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Interface */}
              {!hasReachedLimit ? (
                <div className="bg-neutral-950 border border-neutral-800 rounded-sm p-6">
                  <h3 className="text-lg font-normal text-white mb-6">Purchase Shares</h3>
                  
                  <div className="space-y-6">
                    {/* Quick Select Ownership */}
                    <div>
                      <label className="text-xs font-light uppercase tracking-wider text-neutral-400 block mb-4">
                        Quick Select Ownership
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {quickPercentages.map((pct) => (
                          <button
                            key={pct}
                            onClick={() => handlePercentageSelect(pct)}
                            className={`
                              py-3 px-4 border transition-all duration-200
                              ${percentage === pct 
                                ? 'bg-white text-black border-white' 
                                : 'bg-black text-white border-neutral-800 hover:border-neutral-600'
                              }
                            `}
                            disabled={loading || fetchingShares}
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          onClick={() => handlePercentageSelect(maxPercentage > 0 ? maxPercentage : 100)}
                          className={`
                            py-3 px-4 border transition-all duration-200
                            ${percentage === (maxPercentage > 0 ? maxPercentage : 100)
                              ? 'bg-white text-black border-white' 
                              : 'bg-black text-white border-neutral-800 hover:border-neutral-600'
                            }
                          `}
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Custom Percentage Slider */}
                    <div>
                      <label className="text-xs font-light uppercase tracking-wider text-neutral-400 block mb-4">
                        Custom Percentage
                      </label>
                      
                      <div className="mb-4">
                        <input
                          type="range"
                          min={0.001}
                          max={maxPercentage > 0 ? maxPercentage : 100}
                          step={0.001}
                          value={percentage}
                          onChange={handleSliderChange}
                          className="w-full accent-blue-500 cursor-pointer"
                          disabled={loading || fetchingShares}
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-neutral-500">0%</span>
                          <span className="text-xs text-neutral-500">
                            {formatPercentage(maxPercentage > 0 ? maxPercentage : 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={customInput}
                            onChange={handleCustomInputChange}
                            onFocus={() => setInputMode('custom')}
                            min="0.001"
                            max={maxPercentage > 0 ? maxPercentage : 100}
                            step="0.001"
                            className="w-full px-4 py-3 pr-12 bg-black border border-neutral-800 text-white font-light 
                                     focus:border-neutral-600 focus:outline-none transition-colors"
                            placeholder="Enter percentage"
                            disabled={loading || fetchingShares}
                          />
                          <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        </div>
                        <button
                          onClick={() => {
                            const maxAllowed = maxPercentage > 0 ? maxPercentage : 100;
                            handlePercentageSelect(maxAllowed);
                          }}
                          className="px-6 py-3 bg-neutral-900 text-white font-light hover:bg-neutral-800 
                                   transition-colors border border-neutral-800"
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Transaction Summary */}
                    <div className="bg-neutral-950 border border-neutral-900 p-6">
                      <h3 className="text-xs font-light uppercase tracking-wider text-neutral-400 mb-4">
                        Transaction Summary
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Ownership Percentage</span>
                          <span className="text-lg font-semibold text-white">{formatPercentage(percentage)}%</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Number of Units</span>
                          <span className="text-sm font-light text-neutral-300">{shareAmount.toLocaleString()}</span>
                        </div>
                        
                        {propertyData.maxPurchaseAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-light text-neutral-400">After Purchase</span>
                            <span className="text-sm font-light text-green-400">
                              {userCurrentShares + shareAmount} / {propertyData.maxPurchaseAmount} shares
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Price per Unit</span>
                          <span className="text-sm font-light text-neutral-300">{formatNumber(propertyData.pricePerShare)} OPN</span>
                        </div>
                        
                        <div className="h-px bg-neutral-800 my-3"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Platform Fee (2.5%)</span>
                          <span className="text-sm font-normal text-amber-400">
                            {formatNumber(totalCost * 0.025)} OPN
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-base font-normal text-white">Total Cost</span>
                          <span className="text-2xl font-semibold text-white">
                            {formatNumber(totalCost * 1.025)} OPN
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="bg-blue-900/10 border border-blue-900/30 p-4">
                      <div className="text-xs font-light text-neutral-300 space-y-1">
                        <p>• Each unit represents {propertyData.totalShares > 0 ? (100 / propertyData.totalShares).toFixed(6) : '0'}% ownership</p>
                        <p>• Ownership is immediately tradeable on secondary markets</p>
                        <p>• All transactions are recorded immutably on-chain</p>
                        <p>• Fractional owners may receive proportional dividends if applicable</p>
                        {propertyData.maxPurchaseAmount > 0 && (
                          <p className="text-amber-300">• This asset has a {propertyData.maxPurchaseAmount} share maximum per user</p>
                        )}
                        {shareAmount < propertyData.minPurchaseAmount && (
                          <p className="text-yellow-400">• Minimum purchase is {propertyData.minPurchaseAmount} share{propertyData.minPurchaseAmount > 1 ? 's' : ''}. Increase percentage.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-900/10 border border-red-900/30 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-normal text-white">Purchase Limit Reached</h3>
                  </div>
                  <p className="text-sm text-neutral-300">
                    You have reached the maximum allowed holdings of {propertyData.maxPurchaseAmount} shares for this asset.
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    This limit is set by the asset owner to ensure fair distribution.
                  </p>
                </div>
              )}

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
                {!hasReachedLimit && (
                  <button
                    onClick={handlePurchase}
                    disabled={loading || shareAmount < 1 || !meetsKYCRequirement || fetchingShares}
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
                        <TrendingUp className="w-4 h-4 ml-2 sm:ml-0" />
                        <span>Acquire {formatPercentage(percentage)}% Ownership</span>
                      </>
                    )}
                  </button>
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