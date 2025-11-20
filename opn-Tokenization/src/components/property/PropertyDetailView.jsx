// src/components/property/PropertyDetailView.jsx
// PREMIUM DARK THEME - Mobile Responsive with Centered Alignment
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MapPin, Home, Building, Calendar, Users, Shield, 
  Activity, ChevronLeft, ChevronRight, Expand, Car, Package, 
  Palette, Loader2, ExternalLink, TrendingUp, BarChart3,
  Gem, X, Info, Clock, Hash, FileText, Image as ImageIcon,
  Sparkles, Verified, DollarSign, AlertCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import { useContract } from '../../hooks/useContract';
import PropertyModal from './PropertyModal';

const PropertyDetailView = ({ property, onBack, onPurchaseSuccess }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  const { positionNFT } = useContract();
  
  // OPN to USD conversion
  const OPN_TO_USD = 0.05; // $0.05 per OPN
  
  // Helper function to convert OPN to USD
  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };

  // Helper function to format percentages
  const formatPercentage = (percent) => {
    if (percent === 0) return '0%';
    if (percent < 0.0001) return '<0.0001%';
    if (percent < 0.001) return percent.toFixed(4) + '%';
    if (percent < 0.01) return percent.toFixed(3) + '%';
    if (percent < 1) return percent.toFixed(2) + '%';
    return percent.toFixed(1) + '%';
  };
  
  // Early return if no property
  if (!property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-light mb-4">Property not found</p>
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-colors"
          >
            Return to Properties
          </button>
        </div>
      </div>
    );
  }
  
  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!positionNFT || !property.assetId) return;
      
      try {
        setLoadingActivity(true);
        
        // Get current block
        const currentBlock = await positionNFT.provider.getBlockNumber();
        
        // Query last 5000 blocks to stay under the 10000 block limit
        const fromBlock = Math.max(0, currentBlock - 5000);
        
        // Query PositionMinted events for this asset
        const filter = positionNFT.filters.PositionMinted(null, property.assetId);
        const events = await positionNFT.queryFilter(filter, fromBlock, currentBlock);
        
        if (events.length === 0) {
          setTransactions([]);
          setLoadingActivity(false);
          return;
        }
        
        const txList = await Promise.all(
          events.map(async (event) => {
            try {
              const block = await event.getBlock();
              const isWeighted = property.model === 1;
              
              // Fix the amount formatting
              let displayAmount;
              if (isWeighted) {
                // For weighted model, convert from wei to percentage
                const percentageAmount = parseFloat(ethers.utils.formatUnits(event.args.amount, 16));
                displayAmount = formatPercentage(percentageAmount);
              } else {
                // For fixed model, show number of shares
                displayAmount = `${event.args.amount.toString()} shares`;
              }
              
              return {
                type: 'Purchase',
                user: event.args.owner,
                amount: displayAmount,
                timestamp: new Date(block.timestamp * 1000).toLocaleString(),
                txHash: event.transactionHash
              };
            } catch (err) {
              console.error('Error processing event:', err);
              return null;
            }
          })
        );
        
        // Filter out any null results and reverse for most recent first
        setTransactions(txList.filter(tx => tx !== null).reverse());
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    
    if (activeTab === 'activity') {
      fetchTransactions();
    }
  }, [positionNFT, property.assetId, property.model, activeTab]);
  
  // Get additional images from the property object (parsed from description)
  const additionalImages = property.additionalImages || [];
  const allImages = [property.assetImageUrl, ...additionalImages].filter(Boolean);
  
  // Calculations for both WEIGHTED and FIXED models
  const isWeighted = property.model === 1;
  
  let totalValue, availablePercentage, soldPercentage, pricePerShare;
  
  if (isWeighted) {
    // WEIGHTED MODEL
    totalValue = property.totalValue 
      ? parseFloat(ethers.utils.formatEther(property.totalValue))
      : 0;
    
    const soldWeight = property.soldWeight || 0;
    const availableWeight = property.availableWeight || (100 - soldWeight);
    
    soldPercentage = soldWeight;
    availablePercentage = availableWeight;
    pricePerShare = totalValue / 100; // Price per 1%
  } else {
    // FIXED MODEL
    pricePerShare = property.pricePerToken 
      ? parseFloat(ethers.utils.formatEther(property.pricePerToken))
      : 0;
    
    const totalShares = property.totalSupply 
      ? parseFloat(property.totalSupply.toString())
      : 0;
    
    const availableShares = property.availableShares
      ? parseFloat(property.availableShares.toString())
      : 0;
    
    const soldShares = totalShares - availableShares;
    totalValue = pricePerShare * totalShares;
    soldPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
    availablePercentage = totalShares > 0 ? (availableShares / totalShares) * 100 : 0;
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // Determine asset type and get appropriate icon
  const getAssetIcon = () => {
    const type = property.assetType?.toLowerCase() || '';
    if (type.includes('vehicle')) return Car;
    if (type.includes('art')) return Palette;
    if (type.includes('collectible')) return Package;
    return Building; // Default for real estate
  };

  const AssetIcon = getAssetIcon();

  // Render asset-specific details based on type
  const renderAssetDetails = () => {
    const type = property.assetType?.toLowerCase() || '';
    
    // Vehicle-specific details
    if (type.includes('vehicle') && property.vehicleData) {
      const { year, make, model: vehicleModel, vin } = property.vehicleData;
      
      return (
        <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm sm:text-base font-medium text-white">Vehicle Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {year && (
              <div>
                <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Year</p>
                <p className="text-white text-xs sm:text-sm">{year}</p>
              </div>
            )}
            {make && (
              <div>
                <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Make</p>
                <p className="text-white text-xs sm:text-sm">{make}</p>
              </div>
            )}
            {vehicleModel && (
              <div>
                <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Model</p>
                <p className="text-white text-xs sm:text-sm">{vehicleModel}</p>
              </div>
            )}
            {vin && (
              <div className="col-span-2">
                <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">VIN</p>
                <p className="text-white font-mono text-[10px] sm:text-xs bg-black/30 p-2 rounded-lg break-all">{vin}</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Real estate-specific details
    if (property.propertyData) {
      const { location, propertyType, size, yearBuilt } = property.propertyData;
      
      return (
        <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm sm:text-base font-medium text-white">Property Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Location</p>
              <p className="text-white text-xs sm:text-sm">{location || 'Dubai, United Arab Emirates'}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Property Type</p>
              <p className="text-white text-xs sm:text-sm">{propertyType || 'Real Estate'}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Size</p>
              <p className="text-white text-xs sm:text-sm">{size || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Year Built</p>
              <p className="text-white text-xs sm:text-sm">{yearBuilt || 'Not specified'}</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Default for any other asset type
    return (
      <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm sm:text-base font-medium text-white">Asset Details</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Asset Type</p>
            <p className="text-white text-xs sm:text-sm">{property.assetType}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-1">Asset ID</p>
            <p className="text-white text-xs sm:text-sm">#{property.assetId}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Premium Header */}
      <div className="bg-gradient-to-b from-neutral-950 to-black border-b border-neutral-900">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-neutral-400 hover:text-white transition-colors group ml-16 sm:ml-0 hover:bg-neutral-900 rounded-lg mt-2 sm:mt-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base">Back to Properties</span>
          </button>
        </div>
      </div>

      {/* Hero Section with Premium Design */}
      <div className="relative h-[300px] sm:h-[400px] bg-gradient-to-b from-neutral-900 to-black overflow-hidden">
        <img 
          src={property.assetImageUrl || property.mainImageUrl} 
          alt={property.assetName}
          className="w-full h-full object-cover opacity-70"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1920px] mx-auto">
            <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
              <span className="px-2 sm:px-3 py-1 bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg text-[10px] sm:text-xs text-white">
                {property.assetType || 'REAL ESTATE'}
              </span>
              {isWeighted && (
                <span className="px-2 sm:px-3 py-1 bg-purple-600/80 backdrop-blur-sm rounded-lg text-[10px] sm:text-xs text-white">
                  Weighted
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-white mb-2">{property.assetName}</h1>
            <div className="flex items-center gap-2 text-neutral-300">
              <AssetIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-light">
                {(() => {
                  if (property.vehicleData && property.vehicleData.year && property.vehicleData.make && property.vehicleData.model) {
                    return `${property.vehicleData.year} ${property.vehicleData.make} ${property.vehicleData.model}`;
                  }
                  if (property.propertyData && property.propertyData.location) {
                    return property.propertyData.location;
                  }
                  return 'Dubai, United Arab Emirates';
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Premium Stats Cards - Responsive */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto">
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <div className="bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
              <p className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Total Value</p>
              <p className="text-sm sm:text-lg font-light text-white">{totalValue.toFixed(0)} OPN</p>
              <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(totalValue)}</p>
            </div>
            <div className="bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
              <p className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Available</p>
              <p className="text-sm sm:text-lg font-light text-green-400">{formatPercentage(availablePercentage)}</p>
            </div>
          </div>
        </div>

        {/* Gallery Button */}
        {allImages.length > 1 && (
          <button
            onClick={() => setShowImageModal(true)}
            className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg text-white text-[10px] sm:text-xs hover:bg-black/80 transition-colors flex items-center gap-2"
          >
            <ImageIcon className="w-3 h-3" />
            <span className="hidden sm:inline">View {allImages.length} Images</span>
            <span className="sm:hidden">{allImages.length}</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Premium Tabs */}
            <div className="border-b border-neutral-800 mb-6 sm:mb-8">
              <div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
                {['overview', 'details', 'documents', 'activity'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 sm:pb-4 text-xs sm:text-sm capitalize transition-all whitespace-nowrap ${
                      activeTab === tab 
                        ? 'text-white border-b-2 border-white font-medium' 
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {tab === 'activity' && (
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" />
                    )}
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* About Section */}
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">About this Asset</h2>
                  <p className="text-neutral-400 leading-relaxed text-xs sm:text-sm">
                    {property.assetDescription?.split('\n\n')[0] || 'No description available for this asset.'}
                  </p>
                </div>

                {/* Asset-specific details */}
                {renderAssetDetails()}

                {/* Investment Metrics */}
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4 sm:mb-6">
                    <BarChart3 className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-sm sm:text-base font-medium text-white">Investment Metrics</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 sm:gap-8">
                    <div>
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-2">
                        {isWeighted ? 'Price per 1%' : 'Price per Share'}
                      </p>
                      <p className="text-base sm:text-xl font-light text-white">{pricePerShare.toFixed(2)} OPN</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5">≈ ${convertToUSD(pricePerShare)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Holders</p>
                      <p className="text-base sm:text-xl font-light text-white">1</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5">Active</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-2">Min. Investment</p>
                      <p className="text-base sm:text-xl font-light text-white">
                        {isWeighted 
                          ? formatPercentage((property.minPurchaseWeight || 0))
                          : `${property.minPurchaseAmount || 0}`
                        }
                      </p>
                      <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5">{isWeighted ? 'ownership' : 'shares'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 rounded-xl p-6 sm:p-8">
                  <h3 className="text-base sm:text-lg font-light text-white mb-4 sm:mb-6 flex items-center gap-2">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                    Asset Details
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between py-3 sm:py-4 border-b border-neutral-800">
                      <span className="text-neutral-400 flex items-center gap-2 text-xs sm:text-sm">
                        <Hash className="w-3 h-3 sm:w-4 sm:h-4" />
                        Asset ID
                      </span>
                      <span className="text-white font-medium text-xs sm:text-sm">#{property.assetId}</span>
                    </div>
                    <div className="flex justify-between py-3 sm:py-4 border-b border-neutral-800">
                      <span className="text-neutral-400 flex items-center gap-2 text-xs sm:text-sm">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                        Ownership Model
                      </span>
                      <span className="text-white font-medium text-xs sm:text-sm">
                        {isWeighted ? 'Weighted Percentage' : 'Fixed Token'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 sm:py-4 border-b border-neutral-800">
                      <span className="text-neutral-400 flex items-center gap-2 text-xs sm:text-sm">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                        Total Value
                      </span>
                      <div className="text-right">
                        <p className="text-white font-medium text-xs sm:text-sm">{totalValue.toFixed(0)} OPN</p>
                        <p className="text-[10px] sm:text-sm text-neutral-500">≈ ${convertToUSD(totalValue)}</p>
                      </div>
                    </div>
                    {!isWeighted && (
                      <div className="flex justify-between py-3 sm:py-4">
                        <span className="text-neutral-400 flex items-center gap-2 text-xs sm:text-sm">
                          <Gem className="w-3 h-3 sm:w-4 sm:h-4" />
                          Total Supply
                        </span>
                        <span className="text-white font-medium text-xs sm:text-sm">
                          {property.totalSupply ? property.totalSupply.toString() : '0'} shares
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-gradient-to-b from-neutral-900/50 to-black border border-neutral-800 rounded-xl p-12 sm:p-16">
                <div className="text-center">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-600 mx-auto mb-4 sm:mb-6" />
                  <h3 className="text-lg sm:text-xl font-light text-white mb-2">Documents Coming Soon</h3>
                  <p className="text-sm sm:text-base text-neutral-500">Legal documents and certifications will be available here</p>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {loadingActivity ? (
                  <div className="bg-gradient-to-b from-neutral-900/50 to-black border border-neutral-800 rounded-xl p-12 sm:p-16">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-500 animate-spin mx-auto mb-4" />
                      <p className="text-sm sm:text-base text-neutral-500">Loading activity...</p>
                    </div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                        <h3 className="text-base sm:text-lg font-medium text-white">Purchase History</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-neutral-800">
                      {transactions.map((tx, index) => (
                        <div key={index} className="p-4 sm:p-6 hover:bg-neutral-800/30 transition-colors">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm sm:text-base">{tx.type}</p>
                                <p className="text-xs sm:text-sm text-neutral-500">{tx.timestamp}</p>
                              </div>
                            </div>
                            <span className="text-base sm:text-lg font-light text-white">{tx.amount}</span>
                          </div>
                          <div className="ml-10 sm:ml-13 space-y-2">
                            <p className="text-xs sm:text-sm text-neutral-400">
                              Buyer:{' '}
                              <span className="text-white font-mono">
                                {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                              </span>
                            </p>
                            <a
                              href={`https://explorer.opn.network/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              View Transaction
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-12 sm:p-16">
                    <div className="text-center">
                      <Activity className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-600 mx-auto mb-4 sm:mb-6" />
                      <h3 className="text-lg sm:text-xl font-light text-white mb-2">No Recent Activity</h3>
                      <p className="text-sm sm:text-base text-neutral-500">Transaction history will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Premium Purchase Card */}
          <div className="lg:col-span-1">
            {/* Add invisible spacer to match tabs height on desktop only */}
            <div className="hidden lg:block h-[60px]"></div>
            
            <div className="sticky top-6">
              <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-4 sm:p-6">
                {/* Header with icon */}
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                  <h3 className="text-base sm:text-lg font-medium text-white">Ownership Distribution</h3>
                </div>
                
                {/* Distribution Bars - Modern Style */}
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-neutral-400">Sold</span>
                      <span className="text-xs sm:text-sm text-white">{formatPercentage(soldPercentage)}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neutral-600 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${soldPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-neutral-400">Available</span>
                      <span className="text-xs sm:text-sm text-green-400">{formatPercentage(availablePercentage)}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${availablePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Price Display - Clean Design */}
                <div className="mb-6 sm:mb-8">
                  <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-2 sm:mb-3">
                    {isWeighted ? 'Price per 1%' : 'Price per Share'}
                  </p>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                      {pricePerShare.toFixed(2)} OPN
                    </p>
                    <p className="text-xs sm:text-sm text-neutral-500">≈ ${convertToUSD(pricePerShare)} USD</p>
                  </div>
                </div>

                {/* Purchase Button - Modern Style */}
                <button
                  onClick={() => setShowModal(true)}
                  disabled={availablePercentage === 0}
                  className={`w-full py-3 sm:py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                    availablePercentage > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transform hover:-translate-y-0.5'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Acquire Ownership</span>
                </button>

                {/* Trust Indicators - Modern Icons, CENTERED ON MOBILE */}
                <div className="mt-6 sm:mt-8 space-y-4">
                  <div className="flex items-start sm:items-center gap-3 justify-center sm:justify-start">
                    <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="pt-0.5 text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-white font-medium">Verified Asset</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">On OPN Chain</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start sm:items-center gap-3 justify-center sm:justify-start">
                    <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="pt-0.5 text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-white font-medium">Smart Contract</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">Secured ownership</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start sm:items-center gap-3 justify-center sm:justify-start">
                    <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="pt-0.5 text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-white font-medium">24/7 Trading</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">Always available</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Image Gallery Modal */}
      {showImageModal && allImages.length > 1 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 sm:p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-4 sm:left-6 p-2 sm:p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          
          <img 
            src={allImages[currentImageIndex]}
            alt={`${property.assetName} - Image ${currentImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
          />
          
          <button
            onClick={nextImage}
            className="absolute right-4 sm:right-6 p-2 sm:p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex 
                    ? 'bg-white w-8' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showModal && (
        <PropertyModal 
          property={property}
          onClose={() => setShowModal(false)}
          onPurchaseSuccess={() => {
            setShowModal(false);
            if (onPurchaseSuccess) {
              onPurchaseSuccess();
            }
          }}
        />
      )}
    </div>
  );
};

export default PropertyDetailView;