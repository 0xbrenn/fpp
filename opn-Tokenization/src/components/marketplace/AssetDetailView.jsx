// src/components/marketplace/AssetDetailView.jsx
// FIXED - Hooks order corrected, early return before hooks
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { 
  ArrowLeft, Shield, MapPin, Calendar, Users, Activity, 
  TrendingUp, FileText, Home, Maximize, DollarSign,
  Clock, CheckCircle, AlertCircle, Loader2, Expand, ChevronLeft, ChevronRight, Car,
  X, Sparkles, BarChart3, ExternalLink, Info, Hash, Image as ImageIcon, Package
} from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { ethers } from 'ethers';
import PropertyModal from '../property/PropertyModal';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const parseAdditionalImages = (description) => {
  const images = [];
  if (!description) return images;
  
  const additionalImagesMatch = description.match(/Additional Images:([\s\S]*?)(?:\n\n|Documents:|$)/);
  
  if (additionalImagesMatch && additionalImagesMatch[1]) {
    const imagesSection = additionalImagesMatch[1];
    const imageMatches = imagesSection.matchAll(/Image \d+: (https?:\/\/[^\s\n]+)/g);
    
    for (const match of imageMatches) {
      if (match[1]) {
        images.push(match[1]);
      }
    }
  }
  return images;
};

const parseRealEstateData = (description) => {
  const data = {
    location: 'Dubai, United Arab Emirates',
    propertyType: null,
    size: null,
    yearBuilt: null
  };
  
  if (!description) return data;
  
  const locationMatch = description.match(/Location: ([^\n]+)/i);
  if (locationMatch) data.location = locationMatch[1].trim();
  
  const sizeMatch = description.match(/Size: ([\d,.]+ (?:sq\.?\s*ft|sqft|square feet|acres))/i);
  if (sizeMatch) data.size = sizeMatch[1].trim();
  
  if (description.includes('Residential Property')) data.propertyType = 'Residential';
  else if (description.includes('Commercial Property')) data.propertyType = 'Commercial';
  else if (description.includes('Land')) data.propertyType = 'Land';
  
  return data;
};

const parseVehicleData = (description) => {
  const data = {
    year: null,
    make: null,
    model: null,
    vin: null
  };
  
  if (!description) return data;
  
  const vehicleMatch = description.match(/Vehicle Details:([\s\S]*?)(?:\n\n|Additional Images:|Documents:|$)/);
  
  if (vehicleMatch && vehicleMatch[1]) {
    const vehicleSection = vehicleMatch[1];
    
    const yearMatch = vehicleSection.match(/Year: (\d{4})/);
    if (yearMatch) data.year = yearMatch[1];
    
    const makeMatch = vehicleSection.match(/Make: ([^\n]+)/);
    if (makeMatch) data.make = makeMatch[1].trim();
    
    const modelMatch = vehicleSection.match(/Model: ([^\n]+)/);
    if (modelMatch) data.model = modelMatch[1].trim();
    
    const vinMatch = vehicleSection.match(/VIN: ([^\n]+)/);
    if (vinMatch) data.vin = vinMatch[1].trim();
  }
  
  return data;
};

const cleanDescription = (description) => {
  if (!description) return '';
  
  const parts = description.split('\n\n');
  const mainDescription = parts[0] || description;
  
  return mainDescription
    .replace(/Property Details:[\s\S]*?(?=\n\n|$)/, '')
    .replace(/Vehicle Details:[\s\S]*?(?=\n\n|$)/, '')
    .replace(/Additional Images:[\s\S]*?(?=\n\n|$)/, '')
    .replace(/Documents:[\s\S]*?(?=\n\n|$)/, '')
    .trim();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AssetDetailView = ({ asset, onBack }) => {
  // CHECK ASSET EXISTS FIRST - BEFORE ANY HOOKS!
  if (!asset) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-light mb-4">Asset not found</p>
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-colors"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  // NOW DECLARE ALL HOOKS - After the early return
  const { assetRegistry, positionNFT } = useContract();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const { address } = useWeb3();
  const [holders, setHolders] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // OPN to USD conversion
  const OPN_TO_USD = 0.05;
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
  
  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!assetRegistry || !positionNFT || !asset?.assetId) {
        setLoadingTransactions(false);
        return;
      }
      
      try {
        setLoadingTransactions(true);
        const assetData = await assetRegistry.assets(asset.assetId);
        const uniqueHolders = new Set();
        
        if (assetData.model === 1) {
          // Weighted model
          const soldWeight = assetData.soldWeight;
          
          if (soldWeight && soldWeight.gt(0)) {
            const txList = [];
            
            if (address) {
              try {
                const userPositions = await positionNFT.getUserPositions(address, asset.assetId);
                
                if (userPositions.length > 0) {
                  uniqueHolders.add(address.toLowerCase());
                }
                
                for (const positionId of userPositions) {
                  const position = await positionNFT.positions(positionId);
                  const amountWei = position.amount;
                  const ownershipPercent = parseFloat(ethers.utils.formatEther(amountWei)) * 100;
                  
                  const totalValue = assetData.totalValue 
                    ? parseFloat(ethers.utils.formatEther(assetData.totalValue))
                    : 0;
                  
                  const purchaseValue = (totalValue * ownershipPercent) / 100;
                  
                  txList.push({
                    type: 'Purchase',
                    amount: formatPercentage(ownershipPercent),
                    value: purchaseValue.toFixed(2),
                    date: new Date(position.purchaseTimestamp.toNumber() * 1000).toLocaleDateString(),
                    buyer: `${address.slice(0, 6)}...${address.slice(-4)}`,
                    fullBuyer: address.toLowerCase(),
                    txHash: '0x...',
                    blockNumber: 0,
                    isCurrentUser: true,
                    total: purchaseValue,
                    price: ownershipPercent > 0 ? purchaseValue / ownershipPercent : 0
                  });
                }
              } catch (err) {
                console.error('Error fetching user positions:', err);
              }
            }
            
            setTransactions(txList);
            setHolders(Array.from(uniqueHolders));
          } else {
            setTransactions([]);
            setHolders([]);
          }
        } else {
          // Fixed model
          const totalSupply = assetData.totalSupply || ethers.BigNumber.from(0);
          const availableShares = assetData.availableShares || ethers.BigNumber.from(0);
          const soldShares = totalSupply.sub(availableShares);
          
          if (soldShares.gt(0)) {
            const txList = [];
            
            if (address) {
              try {
                const userPositions = await positionNFT.getUserPositions(address, asset.assetId);
                
                if (userPositions.length > 0) {
                  uniqueHolders.add(address.toLowerCase());
                }
                
                for (const positionId of userPositions) {
                  const position = await positionNFT.positions(positionId);
                  
                  const shares = position.amount;
                  const pricePerToken = assetData.pricePerToken || ethers.BigNumber.from(0);
                  const purchaseValue = shares.mul(pricePerToken);
                  
                  const sharesFormatted = parseFloat(ethers.utils.formatUnits(shares, 0));
                  const ownershipPercent = totalSupply.gt(0) 
                    ? (shares.mul(10000).div(totalSupply).toNumber() / 100)
                    : 0;
                  
                  const pricePerShare = parseFloat(ethers.utils.formatEther(pricePerToken));
                  const totalPurchase = parseFloat(ethers.utils.formatEther(purchaseValue));
                  
                  txList.push({
                    type: 'Purchase',
                    amount: `${sharesFormatted} shares`,
                    value: ethers.utils.formatEther(purchaseValue),
                    date: new Date().toLocaleDateString(),
                    buyer: `${address.slice(0, 6)}...${address.slice(-4)}`,
                    fullBuyer: address.toLowerCase(),
                    txHash: '0x...',
                    blockNumber: 0,
                    isCurrentUser: true,
                    total: totalPurchase,
                    price: pricePerShare
                  });
                }
              } catch (err) {
                console.error('Error fetching user positions:', err);
              }
            }
            
            setTransactions(txList);
            setHolders(Array.from(uniqueHolders));
          } else {
            setTransactions([]);
            setHolders([]);
          }
        }
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        setTransactions([]);
        setHolders([]);
      } finally {
        setLoadingTransactions(false);
      }
    };
    
    fetchTransactions();
  }, [assetRegistry, positionNFT, asset?.assetId, address]);

  // Parse the asset data
  const additionalImages = parseAdditionalImages(asset.assetDescription);
  const allImages = [asset.assetImageUrl, ...additionalImages].filter(Boolean);
  const cleanedDescription = cleanDescription(asset.assetDescription);

  // Parse type-specific data
  let propertyData = null;
  let vehicleData = null;
  const assetType = asset.assetType?.toLowerCase() || '';

  if (assetType.includes('vehicle')) {
    vehicleData = parseVehicleData(asset.assetDescription);
  } else if (
    assetType.includes('real estate') || 
    assetType.includes('property') || 
    assetType.includes('land') ||
    assetType.includes('residential') ||
    assetType.includes('commercial')
  ) {
    propertyData = parseRealEstateData(asset.assetDescription);
  }

  // Get location display text
  const getLocationDisplay = () => {
    if (vehicleData && vehicleData.year && vehicleData.make && vehicleData.model) {
      return `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
    }
    if (propertyData && propertyData.location) {
      return propertyData.location;
    }
    return 'Premium Asset';
  };
  
  // Calculate metrics
  const isWeighted = asset.model === 1;
  
  let totalValue, soldPercentage, availablePercentage, pricePerShare, displayStats;
  
  if (isWeighted) {
    totalValue = asset.totalValue 
      ? parseFloat(ethers.utils.formatEther(asset.totalValue))
      : 0;
    
    soldPercentage = asset.soldPercentage || 0;
    availablePercentage = asset.availablePercentage || 100;
    pricePerShare = totalValue / 100;
    
    displayStats = {
      label1: 'Total Value',
      value1: totalValue.toFixed(0) + ' OPN',
      usd1: convertToUSD(totalValue),
      label2: 'Available',
      value2: formatPercentage(availablePercentage),
      soldLabel: 'Sold',
      soldValue: formatPercentage(soldPercentage),
      availableLabel: 'Available',
      availableValue: formatPercentage(availablePercentage),
      pricePer1Label: 'Price per 1%',
      pricePer1Value: pricePerShare.toFixed(2) + ' OPN',
      pricePer1USD: convertToUSD(pricePerShare)
    };
  } else {
    // Fixed model calculations
    let totalShares = asset.totalSupply ? parseFloat(ethers.utils.formatUnits(asset.totalSupply, 0)) : 0;
    let availableShares = asset.availableShares ? parseFloat(ethers.utils.formatUnits(asset.availableShares, 0)) : 0;
    let pricePerToken = asset.pricePerShare ? parseFloat(ethers.utils.formatEther(asset.pricePerShare)) : 0;
    
    const soldShares = totalShares - availableShares;
    totalValue = pricePerToken * totalShares;
    soldPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
    availablePercentage = totalShares > 0 ? (availableShares / totalShares) * 100 : 0;
    pricePerShare = pricePerToken;
    
    displayStats = {
      label1: 'Total Value',
      value1: totalValue.toFixed(0) + ' OPN',
      usd1: convertToUSD(totalValue),
      label2: 'Available',
      value2: `${availableShares.toLocaleString()} shares`,
      soldLabel: 'Sold',
      soldValue: formatPercentage(soldPercentage),
      availableLabel: 'Available',
      availableValue: formatPercentage(availablePercentage),
      pricePer1Label: 'Price per Share',
      pricePer1Value: pricePerShare.toFixed(2) + ' OPN',
      pricePer1USD: convertToUSD(pricePerShare)
    };
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-black">
      {/* Premium Header */}
      <div className="bg-gradient-to-b from-neutral-950 to-black border-b border-neutral-900">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Marketplace</span>
          </button>
        </div>
      </div>
      
      {/* Hero Section with Premium Design */}
      <div className="relative h-[400px] bg-gradient-to-b from-neutral-900 to-black overflow-hidden">
        <img 
          src={asset.assetImageUrl} 
          alt={asset.assetName}
          className="w-full h-full object-cover opacity-70"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="max-w-[1920px] mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg text-xs text-white">
                {asset.assetType}
              </span>
              <span className="px-3 py-1 bg-green-600/80 backdrop-blur-sm rounded-lg text-xs text-white flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
              {isWeighted ? (
                <span className="px-3 py-1 bg-purple-600/80 backdrop-blur-sm rounded-lg text-xs text-white">
                  Weighted
                </span>
              ) : (
                <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-sm rounded-lg text-xs text-white">
                  Fixed
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-light text-white mb-2">{asset.assetName}</h1>
            <div className="flex items-center gap-2 text-neutral-300">
              {vehicleData ? <Car className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              <span className="text-sm font-light">{getLocationDisplay()}</span>
            </div>
          </div>
        </div>

        {/* Premium Stats Cards */}
        <div className="absolute top-6 right-6 flex gap-3">
          <div className="bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg px-4 py-3">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Total Value</p>
            <p className="text-lg font-light text-white">{totalValue.toFixed(0)} OPN</p>
            <p className="text-xs text-neutral-500">≈ ${convertToUSD(totalValue)}</p>
          </div>
          <div className="bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg px-4 py-3">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Available</p>
            <p className="text-lg font-light text-green-400">{formatPercentage(availablePercentage)}</p>
          </div>
        </div>

        {/* Gallery Button */}
        {allImages.length > 1 && (
          <button
            onClick={() => setShowImageModal(true)}
            className="absolute bottom-6 right-6 px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-neutral-800 rounded-lg text-white text-xs hover:bg-black/80 transition-colors flex items-center gap-2"
          >
            <ImageIcon className="w-3 h-3" />
            View {allImages.length} Images
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Premium Tabs */}
            <div className="border-b border-neutral-800 mb-8">
              <div className="flex space-x-8">
                {['overview', 'details', 'documents', 'activity'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-sm capitalize transition-all ${
                      activeTab === tab 
                        ? 'text-white border-b-2 border-white font-medium' 
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {tab === 'activity' && (
                      <Activity className="w-4 h-4 inline mr-2" />
                    )}
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* About Section */}
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6">
                  <h2 className="text-lg font-medium text-white mb-4">About this Asset</h2>
                  <p className="text-neutral-400 leading-relaxed text-sm">
                    {cleanedDescription || 'No description available'}
                  </p>
                </div>

                {/* Asset Highlights */}
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-base font-medium text-white">Asset Highlights</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {vehicleData && vehicleData.year && (
                      <>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-white">Year & Make</p>
                            <p className="text-xs text-neutral-400">{vehicleData.year} {vehicleData.make}</p>
                          </div>
                        </div>
                        {vehicleData.model && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-white">Model</p>
                              <p className="text-xs text-neutral-400">{vehicleData.model}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Blockchain Verified</p>
                        <p className="text-xs text-neutral-400">Secured on OPN Network</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Ownership Model</p>
                        <p className="text-xs text-neutral-400">
                          {isWeighted ? 'Weighted Percentage' : 'Fixed Token'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Info className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-base font-medium text-white">Asset Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between py-4 border-b border-neutral-800">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Asset Type
                      </span>
                      <span className="text-white font-medium">{asset.assetType}</span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-neutral-800">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Ownership Model
                      </span>
                      <span className="text-white font-medium">
                        {isWeighted ? 'Weighted Percentage' : 'Fixed Token'}
                      </span>
                    </div>
                    <div className="flex justify-between py-4 border-b border-neutral-800">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Total Holders
                      </span>
                      <span className="text-white font-medium">{holders.length}</span>
                    </div>
                    <div className="flex justify-between py-4">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Asset ID
                      </span>
                      <span className="text-white font-mono">#{asset.assetId}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-16">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-neutral-600 mx-auto mb-6" />
                  <h3 className="text-xl font-light text-white mb-2">Documents Coming Soon</h3>
                  <p className="text-neutral-500">Legal documents and certifications will be available here</p>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {loadingTransactions ? (
                  <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-16">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-neutral-500 animate-spin mx-auto mb-4" />
                      <p className="text-neutral-500">Loading activity...</p>
                    </div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-neutral-400" />
                        <h3 className="text-lg font-medium text-white">Purchase History</h3>
                      </div>
                    </div>
                    <div className="divide-y divide-neutral-800">
                      {transactions.map((tx, index) => (
                        <div key={index} className="p-6 hover:bg-neutral-800/30 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                              </div>
                              <div>
                                <p className="text-white font-medium">{tx.type}</p>
                                <p className="text-sm text-neutral-500">{tx.date}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-light text-white">{tx.amount}</span>
                              <p className="text-xs text-neutral-500">{tx.total.toFixed(2)} OPN • ≈ ${convertToUSD(tx.total)}</p>
                            </div>
                          </div>
                          <div className="ml-13 space-y-2">
                            <p className="text-sm text-neutral-400">
                              Buyer:{' '}
                              <span className="text-white font-mono">
                                {tx.buyer}
                              </span>
                            </p>
                            {tx.isCurrentUser && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-lg">
                                <CheckCircle className="w-3 h-3" />
                                Your position
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-16">
                    <div className="text-center">
                      <Activity className="w-16 h-16 text-neutral-600 mx-auto mb-6" />
                      <h3 className="text-xl font-light text-white mb-2">No Recent Activity</h3>
                      <p className="text-neutral-500">Transaction history will appear here</p>
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
              <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6">
                {/* Header with icon */}
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-medium text-white">Investment Details</h3>
                </div>

                {/* Price Display - Clean Design */}
                <div className="mb-8">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-3">
                    {displayStats.pricePer1Label}
                  </p>
                  <div className="space-y-1">
                    <p className="text-3xl font-light text-white tracking-tight">
                      {displayStats.pricePer1Value}
                    </p>
                    <p className="text-sm text-neutral-500">≈ ${displayStats.pricePer1USD} USD</p>
                  </div>
                </div>
                
                {/* Distribution Bars - Modern Style */}
                <div className="space-y-4 mb-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-400">Sold</span>
                      <span className="text-sm text-white">{displayStats.soldValue}</span>
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
                      <span className="text-sm text-neutral-400">Available</span>
                      <span className="text-sm text-green-400">{displayStats.value2}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${availablePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 pb-6 mb-6 border-b border-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Total Value</span>
                    <div className="text-right">
                      <span className="text-sm text-white font-medium">{displayStats.value1}</span>
                      <p className="text-xs text-neutral-500">≈ ${displayStats.usd1}</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Holders</span>
                    <span className="text-sm text-white font-medium">{holders.length}</span>
                  </div>
                </div>
                
                {asset.requiresPurchaserKYC && (
                  <div className="flex items-start gap-2 p-3 bg-amber-900/10 border border-amber-900/30 rounded-xl mb-6">
                    <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-400">KYC Required</p>
                      <p className="text-xs text-amber-400/70 mt-1">
                        Identity verification required for this asset
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Purchase Button - Modern Style */}
                <button
                  onClick={() => setShowBuyModal(true)}
                  disabled={availablePercentage === 0}
                  className={`w-full py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    availablePercentage > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transform hover:-translate-y-0.5'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{availablePercentage > 0 ? 'Acquire Ownership' : 'Sold Out'}</span>
                </button>
                
                {/* Trust Indicators - Modern Icons */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm text-white font-medium">Verified Asset</p>
                      <p className="text-xs text-neutral-500">On OPN Chain</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm text-white font-medium">Smart Contract</p>
                      <p className="text-xs text-neutral-500">Secured ownership</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm text-white font-medium">24/7 Trading</p>
                      <p className="text-xs text-neutral-500">Always available</p>
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
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-6 right-6 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-6 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <img 
            src={allImages[currentImageIndex]}
            alt={`${asset.assetName} - Image ${currentImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
          />
          
          <button
            onClick={nextImage}
            className="absolute right-6 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
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
      
      {/* Buy Modal */}
      {showBuyModal && (
        <PropertyModal 
          property={asset}
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </div>
  );
};

export default AssetDetailView;