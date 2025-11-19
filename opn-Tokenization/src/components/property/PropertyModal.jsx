// src/components/property/PropertyModal.jsx
// PREMIUM DARK THEME - Mobile Responsive
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, MapPin, Home, Maximize, Calendar, Users, Shield, Loader2, 
  Percent, TrendingUp, AlertCircle, Car, Palette, Package,
  Building2, Trees, Info, Sparkles, CheckCircle, DollarSign
} from 'lucide-react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useContract } from '../../hooks/useContract';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';

const PropertyModal = ({ property, onClose, onPurchaseSuccess }) => {
  const { getUserShares } = useMarketplace();
  const { primaryMarket, positionNFT } = useContract();
  const { address } = useWeb3();
  const { showNotification, userKYCStatus } = useApp();
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState(0.1);
  const [shareCount, setShareCount] = useState(1);
  const [customInput, setCustomInput] = useState('1');
  const [inputMode, setInputMode] = useState('buttons');
  const [userCurrentShares, setUserCurrentShares] = useState(0);
  const [fetchingShares, setFetchingShares] = useState(true);
  const [userCurrentWeight, setUserCurrentWeight] = useState(0);
  
  // OPN to USD conversion
  const OPN_TO_USD = 0.05;
  
  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };

    const isWeightedModel = property.model === 1 || property.model === 'WEIGHTED';



    const getMaxAllowedAmount = () => {
  if (isWeightedModel) {
    // Check available percentage AND user's limit
    const availableWeight = property.availableWeight || 100;
    const maxPerUser = propertyData.maxWeight || 100;
    const userCanStillBuy = Math.max(0, maxPerUser - userCurrentWeight);
    
    // Return the smaller of: what's available OR what user can still buy
    return Math.min(availableWeight, userCanStillBuy);
  } else {
    return Math.min(
      propertyData.availableShares,
      propertyData.maxPurchaseAmount > 0 
        ? Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)
        : propertyData.availableShares
    );
  }
};


  useEffect(() => {
  const fetchUserWeight = async () => {
    if (!address || !property || !isWeightedModel || !positionNFT) {
      setUserCurrentWeight(0);
      setFetchingShares(false);
      return;
    }
    
    try {
      setFetchingShares(true);
      const assetId = property.assetId || property.tokenId;
      const positionIds = await positionNFT.getUserPositions(address, assetId);
      
      if (!positionIds || positionIds.length === 0) {
        setUserCurrentWeight(0);
        setFetchingShares(false);
        return;
      }
      
      // Sum up all position weights for this asset
      let totalWeight = ethers.BigNumber.from(0);
      for (const posId of positionIds) {
        const position = await positionNFT.positions(posId);
        const amount = position.amount || position[3];
        totalWeight = totalWeight.add(amount);
      }
      
      // Convert from wei-units to percentage
      const weightPercent = parseFloat(ethers.utils.formatUnits(totalWeight, 16));
      setUserCurrentWeight(weightPercent);
      
    } catch (error) {
      console.error('Error fetching user weight:', error);
      setUserCurrentWeight(0);
    } finally {
      setFetchingShares(false);
    }
  };
  
  fetchUserWeight();
}, [address, property?.assetId, property?.tokenId, isWeightedModel, positionNFT]);

  
  // FIXED: Detect model type
  
  console.log('🔍 PropertyModal - Asset Model:', {
    assetId: property.assetId,
    model: property.model,
    isWeightedModel
  });
  
  // Helper to safely convert BigNumber to number
  const toNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (ethers.BigNumber.isBigNumber(value)) {
      return parseFloat(value.toString());
    }
    return parseFloat(value);
  };
  
  // FIXED: Different property data based on model
  const propertyData = useMemo(() => {
    if (isWeightedModel) {
        const maxWeight = property.maxPurchaseWeight || 100;
    const availableForUser = maxWeight > 0 
      ? Math.max(0, maxWeight - userCurrentWeight)
      : (property.availableWeight || 100);
      return {
        totalValue: property.totalValue ? parseFloat(ethers.utils.formatEther(property.totalValue)) : 0,
        minWeight: property.minPurchaseWeight || 0.01,
        maxWeight: property.maxPurchaseWeight || 100,
        isWeighted: true
      };
    } else {
      return {
        totalShares: property.totalSupply ? toNumber(property.totalSupply) : 0,
        availableShares: property.availableShares ? toNumber(property.availableShares) : 0,
        pricePerShare: property.pricePerToken ? parseFloat(ethers.utils.formatEther(property.pricePerToken)) : 0,
        maxPurchaseAmount: property.maxPurchaseAmount ? toNumber(property.maxPurchaseAmount) : 0,
        minPurchaseAmount: property.minPurchaseAmount ? toNumber(property.minPurchaseAmount) : 1,
        isWeighted: false
      };
    }
  }, [property, isWeightedModel,userCurrentWeight]);
  
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
  
  // Set initial shareCount to minPurchaseAmount for FIXED models
  useEffect(() => {
    if (!isWeightedModel && propertyData.minPurchaseAmount) {
      const minShares = propertyData.minPurchaseAmount;
      setShareCount(minShares);
      setCustomInput(minShares.toString());
    }
  }, [isWeightedModel, propertyData.minPurchaseAmount]);
  
  // FIXED: Quick select options based on model
  const quickSelectOptions = useMemo(() => {
  if (isWeightedModel) {
    const options = [];
    const minPct = propertyData.minWeight || 0.01;
    const maxPct = getMaxAllowedAmount(); // Use calculated max instead of raw maxWeight
    
    const standardOptions = [0.1, 0.5, 1, 5, 10, 25];
    
    standardOptions.forEach(option => {
      if (option >= minPct && option <= maxPct) {
        options.push(option);
      }
    });
    
    return options;
  } else {
    const minShares = propertyData.minPurchaseAmount || 1;
    const maxShares = Math.min(
      propertyData.availableShares,
      propertyData.maxPurchaseAmount > 0 
        ? Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)
        : propertyData.availableShares
    );
    
    const optionsSet = new Set();
    
    // Add minimum first
    if (maxShares >= minShares) {
      optionsSet.add(minShares);
    }
    
    // Add standard options only if they meet criteria
    const standardOptions = [5, 10, 50, 100, 500];
    standardOptions.forEach(option => {
      if (option >= minShares && option <= maxShares) {
        optionsSet.add(option);
      }
    });
    
    return Array.from(optionsSet).sort((a, b) => a - b);
  }
}, [isWeightedModel, propertyData, userCurrentShares]);




const getValidationWarning = () => {
  if (isWeightedModel) {
    const current = parseFloat(customInput);
    const maxAllowed = getMaxAllowedAmount();
    
    if (current < propertyData.minWeight) {
      return `Minimum purchase: ${propertyData.minWeight}%`;
    }
    
    if (current > maxAllowed) {
      if (userCurrentWeight > 0) {
        return `You can only purchase ${maxAllowed.toFixed(3)}% more (you own ${userCurrentWeight.toFixed(3)}%, limit: ${propertyData.maxWeight}%)`;
      }
      return `Maximum available: ${maxAllowed.toFixed(3)}%`;
    }
  } else {
    const current = parseInt(customInput);
    const maxAllowed = getMaxAllowedAmount();
    
    if (current < propertyData.minPurchaseAmount) {
      return `Minimum purchase: ${propertyData.minPurchaseAmount} shares`;
    }
    if (current > maxAllowed) {
      if (propertyData.maxPurchaseAmount > 0 && userCurrentShares > 0) {
        return `You can only purchase ${maxAllowed} more shares (limit: ${propertyData.maxPurchaseAmount} per user)`;
      }
      return `Maximum available: ${maxAllowed} shares`;
    }
  }
  return null;
};

  
  // FIXED: Calculate total cost based on model
  const totalCost = useMemo(() => {
    if (isWeightedModel) {
      return (percentage / 100) * propertyData.totalValue;
    } else {
      return propertyData.pricePerShare * shareCount;
    }
  }, [percentage, shareCount, propertyData, isWeightedModel]);
  
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
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  const handleShareSelect = (shares) => {
    setShareCount(shares);
    setCustomInput(shares.toString());
    setInputMode('buttons');
  };
  
  const handlePercentageSelect = (value) => {
    setPercentage(value);
    setCustomInput(value.toString());
    setInputMode('buttons');
  };
  
  const handleCustomInputChange = (e) => {
    const value = e.target.value;
    setCustomInput(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isWeightedModel) {
        const maxPct = propertyData.maxWeight || 100;
        const clampedValue = Math.min(maxPct, Math.max(0.001, numValue));
        setPercentage(clampedValue);
      } else {
        const maxShares = Math.min(
          propertyData.availableShares,
          propertyData.maxPurchaseAmount > 0 
            ? Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)
            : propertyData.availableShares
        );
        const clampedValue = Math.min(maxShares, Math.max(1, Math.floor(numValue)));
        setShareCount(clampedValue);
      }
    }
  };
  
  const meetsKYCRequirement = useMemo(() => {
    if (!property.requiresPurchaserKYC) return true;
    return userKYCStatus === true;
  }, [property.requiresPurchaserKYC, userKYCStatus]);
  
  // FIXED: Purchase function with conditional logic
  const handlePurchase = async () => {
    if (isWeightedModel) {
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
        
        const weightWeiUnits = ethers.utils.parseUnits(percentage.toString(), 16);
        const fee = totalCost * 0.025;
        const totalWithFee = totalCost + fee;
        const costInWei = ethers.utils.parseEther(totalWithFee.toString());
        const slippageTolerance = 1.05;
        const maxTotalCostWithSlippage = totalWithFee * slippageTolerance;
        const maxTotalCostInWei = ethers.utils.parseEther(maxTotalCostWithSlippage.toString());
        
        const tx = await primaryMarket.purchaseWeighted(
          property.assetId,
          weightWeiUnits,
          maxTotalCostInWei,
          { value: costInWei }
        );
        
        await tx.wait();
        
        showNotification(
          `✅ Successfully acquired ${formatPercentage(percentage)}% ownership of ${property.assetName}!`,
          'success'
        );
        
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
      if (!shareCount || shareCount <= 0) {
        showNotification('Please select a valid amount to purchase', 'error');
        return;
      }

      if (shareCount < propertyData.minPurchaseAmount) {
        showNotification(
          `Minimum purchase is ${propertyData.minPurchaseAmount} shares`, 
          'error'
        );
        return;
      }
      
      if (shareCount > propertyData.availableShares) {
        showNotification(
          `Only ${propertyData.availableShares} shares available`, 
          'error'
        );
        return;
      }

      if (propertyData.maxPurchaseAmount > 0) {
        const totalAfterPurchase = userCurrentShares + shareCount;
        
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
        
        const fee = totalCost * 0.025;
        const totalWithFee = totalCost + fee;
        const costInWei = ethers.utils.parseEther(totalWithFee.toString());
        const slippageTolerance = 1.05;
        const maxTotalCostWithSlippage = totalWithFee * slippageTolerance;
        const maxTotalCostInWei = ethers.utils.parseEther(maxTotalCostWithSlippage.toString());
        
        const tx = await primaryMarket.purchaseFixed(
          property.assetId,
          shareCount,
          maxTotalCostInWei,
          { value: costInWei }
        );
        
        await tx.wait();
        
        showNotification(
          `✅ Successfully acquired ${shareCount} token${shareCount > 1 ? 's' : ''} of ${property.assetName}!`,
          'success'
        );
        
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
  
  const hasReachedLimit = !isWeightedModel && 
    propertyData.maxPurchaseAmount > 0 && 
    userCurrentShares >= propertyData.maxPurchaseAmount;
  
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
      
      {/* Modal - Mobile Responsive */}
      <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-light text-white mb-1">
              {property.assetType?.toLowerCase().includes('vehicle') ? 'Vehicle Details' : 
               property.assetType?.toLowerCase().includes('art') ? 'Art Details' :
               property.assetType?.toLowerCase().includes('collectible') ? 'Collectible Details' :
               'Property Details'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">Review and complete your purchase</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 transition-colors rounded-xl"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Property Info */}
              <div className="space-y-4 sm:space-y-6">
                {/* Image */}
                <div className="aspect-video w-full bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800">
                  <img 
                    src={property.assetImageUrl || '/placeholder-property.jpg'} 
                    alt={property.assetName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-2 text-neutral-400 text-xs sm:text-sm mb-2">
                    <PropertyTypeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{property.assetType || 'Real Estate'}</span>
                    {isWeightedModel && (
                      <span className="ml-auto px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-lg">
                        Weighted
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-light text-white mb-3">{property.assetName}</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    {property.assetDescription}
                  </p>
                </div>

                {/* Investment Overview - Premium Card */}
                <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-neutral-400" />
                    <h4 className="text-sm sm:text-base font-medium text-white">Investment Overview</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {isWeightedModel ? (
                      <>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Total Asset Value</span>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatNumber(propertyData.totalValue)} OPN</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(propertyData.totalValue)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Min Purchase</span>
                          <span className="text-white font-medium">{propertyData.minWeight}%</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Max Purchase</span>
                          <span className="text-white font-medium">{propertyData.maxWeight}%</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm pt-3 border-t border-neutral-800">
                          <span className="text-neutral-400">Purchase Model</span>
                          <span className="text-purple-400 font-medium">Weighted (Percentage)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Total Property Value</span>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatNumber(totalValue)} OPN</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(totalValue)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Price per Share</span>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatNumber(propertyData.pricePerShare)} OPN</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(propertyData.pricePerShare)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Total Shares</span>
                          <span className="text-white font-medium">{formatNumber(propertyData.totalShares)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-neutral-400">Available Shares</span>
                          <span className="text-green-400 font-medium">{formatNumber(propertyData.availableShares)}</span>
                        </div>
                        <div className="pt-3 border-t border-neutral-800">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-neutral-400">Percentage Sold</span>
                            <span className="text-white font-semibold">{soldPercentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm pt-3 border-t border-neutral-800">
                          <span className="text-neutral-400">Purchase Model</span>
                          <span className="text-blue-400 font-medium">Fixed (Token-based)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Purchase Section */}
              <div className="space-y-4 sm:space-y-6">
                {/* Purchase Requirements - Only for FIXED */}
               {/* Purchase Requirements - Show for BOTH weighted and fixed if there's a limit */}
{((isWeightedModel && propertyData.maxWeight < 100) || 
  (!isWeightedModel && propertyData.maxPurchaseAmount > 0)) && (
  <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-white mb-2">Purchase Requirements</p>
        <div className="space-y-1 text-xs text-neutral-400">
          {isWeightedModel ? (
            <>
              <p>• Maximum per user: <span className="text-white">{propertyData.maxWeight}%</span></p>
              <p>• Your current holdings: <span className="text-white">{userCurrentWeight.toFixed(3)}%</span></p>
              <p className="text-green-400">
                • You can buy up to <span className="text-white font-medium">{getMaxAllowedAmount().toFixed(3)}%</span> more
              </p>
            </>
          ) : (
            <>
              <p>• Maximum per user: <span className="text-white">{propertyData.maxPurchaseAmount} shares</span></p>
              <p>• Your current holdings: <span className="text-white">{userCurrentShares} shares</span></p>
              <p className="text-green-400">
                • You can buy up to <span className="text-white font-medium">{Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)}</span> more shares
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
)}

                {/* Purchase Interface */}
                {!hasReachedLimit ? (
                  <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-4 sm:p-6 space-y-5 sm:space-y-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <h3 className="text-base sm:text-lg font-medium text-white">
                        {isWeightedModel ? 'Purchase Ownership' : 'Purchase Shares'}
                      </h3>
                    </div>

                    {/* Quick Select Buttons */}
                    <div>
                      <p className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider mb-3">
                        {isWeightedModel ? 'Quick Select Ownership' : 'Quick Select Shares'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {quickSelectOptions.map((value) => (
                          <button
                            key={value}
                            onClick={() => isWeightedModel ? handlePercentageSelect(value) : handleShareSelect(value)}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all rounded-lg ${
                              (isWeightedModel ? percentage === value : shareCount === value) && inputMode === 'buttons'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
                            }`}
                            disabled={loading || fetchingShares}
                          >
                            {isWeightedModel ? `${value}%` : `${value}`}
                          </button>
                        ))}
                      <button
  onClick={() => {
    const maxAmount = getMaxAllowedAmount();
    if (isWeightedModel) {
      setPercentage(maxAmount);
      setCustomInput(maxAmount.toString());
    } else {
      setShareCount(maxAmount);
      setCustomInput(maxAmount.toString());
    }
  }}
  className="px-3 sm:px-4 py-2 sm:py-3 bg-neutral-900 text-neutral-300 font-medium hover:bg-neutral-800 
           transition-all border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs sm:text-sm"
  disabled={loading || fetchingShares}
>
  MAX
</button>
                      </div>
                    </div>

                    {/* Custom Input */}
                 <div>
  <p className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider mb-3">
    {isWeightedModel ? 'Custom Percentage' : 'Custom Amount'}
  </p>
  
  <div className="flex gap-2">
    <input
      type="number"
      value={customInput}
      onChange={handleCustomInputChange}
      step={isWeightedModel ? "0.001" : "1"}
      min={isWeightedModel ? propertyData.minWeight : propertyData.minPurchaseAmount}
      max={getMaxAllowedAmount()}
      className="flex-1 bg-black border border-neutral-800 px-3 sm:px-4 py-2 sm:py-3 text-white text-sm sm:text-base
               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
      disabled={loading || fetchingShares}
    />
    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-black border border-neutral-800 text-neutral-400 
                  flex items-center rounded-xl text-sm sm:text-base">
      {isWeightedModel ? '%' : 'shares'}
    </div>
  </div>
  
  {/* Validation Warning */}
  {getValidationWarning() && (
    <div className="mt-2 flex items-center gap-2 text-xs text-yellow-500">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{getValidationWarning()}</span>
    </div>
  )}
  
  {/* Purchase Limits Info */}
  <div className="mt-2 text-xs text-neutral-500">
    {isWeightedModel ? (
      <span>Range: {propertyData.minWeight}% - {propertyData.maxWeight}%</span>
    ) : (
      <span>
        Min: {propertyData.minPurchaseAmount} • Max: {getMaxAllowedAmount()} shares
        {propertyData.maxPurchaseAmount > 0 && (
          <span className="text-neutral-600"> (Limit: {propertyData.maxPurchaseAmount} per user)</span>
        )}
      </span>
    )}
  </div>
</div>

                    {/* Transaction Summary */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-6">
                      <h3 className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-400 mb-4">
                        Transaction Summary
                      </h3>
                      
                      <div className="space-y-3">
                        {isWeightedModel ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-light text-neutral-400">Ownership Percentage</span>
                              <span className="text-base sm:text-lg font-semibold text-white">{formatPercentage(percentage)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-light text-neutral-400">Total Asset Value</span>
                              <span className="text-xs sm:text-sm font-light text-neutral-300">{formatNumber(propertyData.totalValue)} OPN</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-light text-neutral-400">Your Investment</span>
                              <div className="text-right">
                                <p className="text-xs sm:text-sm font-medium text-white">{formatNumber(totalCost)} OPN</p>
                                <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(totalCost)}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-light text-neutral-400">Number of Shares</span>
                              <span className="text-base sm:text-lg font-semibold text-white">{shareCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-light text-neutral-400">Price per Share</span>
                              <span className="text-xs sm:text-sm font-light text-neutral-300">{formatNumber(propertyData.pricePerShare)} OPN</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-light text-neutral-400">Ownership Percentage</span>
                              <span className="text-xs sm:text-sm font-light text-neutral-300">
                                {((shareCount / propertyData.totalShares) * 100).toFixed(3)}%
                              </span>
                            </div>
                            {propertyData.maxPurchaseAmount > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs sm:text-sm font-light text-neutral-400">After Purchase</span>
                                <span className="text-xs sm:text-sm font-light text-green-400">
                                  {userCurrentShares + shareCount} / {propertyData.maxPurchaseAmount} shares
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                          <span className="text-xs sm:text-sm font-light text-neutral-400">Platform Fee (2.5%)</span>
                          <span className="text-xs sm:text-sm font-light text-neutral-300">{formatNumber(totalCost * 0.025)} OPN</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                          <span className="text-sm sm:text-base font-semibold text-white">Total Cost</span>
                          <div className="text-right">
                            <p className="text-lg sm:text-2xl font-semibold text-white">{formatNumber(totalCost * 1.025)} OPN</p>
                            <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(totalCost * 1.025)} USD</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 sm:py-3 text-neutral-400 hover:text-white font-medium text-sm sm:text-base
                                 transition-colors disabled:opacity-50 border border-neutral-800
                                 hover:border-neutral-700 hover:bg-neutral-900 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePurchase}
                        disabled={loading || (isWeightedModel ? percentage <= 0 : shareCount < 1) || !meetsKYCRequirement || fetchingShares}
                        className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium text-sm sm:text-base
                                 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 rounded-xl"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {isWeightedModel 
                                ? `Buy ${formatPercentage(percentage)}%`
                                : `Buy ${shareCount} Share${shareCount > 1 ? 's' : ''}`
                              }
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Reached limit message
                  <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-6 sm:p-8 text-center">
                    <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Purchase Limit Reached</h3>
                    <p className="text-xs sm:text-sm text-neutral-400">
                      You have reached the maximum allowed {propertyData.maxPurchaseAmount} shares for this asset.
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