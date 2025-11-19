// src/components/property/PropertyView.jsx
// PREMIUM DARK THEME - Mobile Responsive
import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import PropertyCard from './PropertyCard';
import PropertyDetailView from './PropertyDetailView';
import { 
  Building, Loader2, Home, AlertCircle, Search, Filter,
  LayoutGrid, Rows3, Activity, TrendingUp, Shield,
  MapPin, Gem, BarChart3, Sparkles, SlidersHorizontal,
  X, ArrowRight, CheckCircle
} from 'lucide-react';
import { ethers } from 'ethers';

// Parsing functions for asset data
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

const parseAssetData = (asset) => {
  const { assetDescription: description, assetType } = asset;
  
  // Base parsed data
  const parsedData = {
    ...asset,
    additionalImages: parseAdditionalImages(description),
    propertyData: parseRealEstateData(description)
  };
  
  return parsedData;
};

const PropertyView = () => {
  const { isConnected } = useWeb3();
  const { assetRegistry } = useContract();
  const { showNotification } = useApp();
  
  // OPN to USD conversion
  const OPN_TO_USD = 0.05; // $0.05 per OPN
  
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Helper function to convert OPN to USD
  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };

  // Fetch properties function with useCallback for stability
  const fetchProperties = useCallback(async () => {
    if (!assetRegistry || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get active assets from new AssetRegistry
      const result = await assetRegistry.getActiveAssets(0, 100);
      const activeAssetIds = result.ids || result[0] || [];
      
      console.log('Found active assets:', activeAssetIds.length);
      
      if (activeAssetIds.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }
      
      const propertyPromises = activeAssetIds.map(async (assetId) => {
        try {
          // Get asset from AssetRegistry
          const asset = await assetRegistry.assets(assetId);
          
          console.log(`Checking asset ${assetId}: "${asset.assetName}" - Type: "${asset.assetType}"`);
          
          // LENIENT FILTER: Accept property-related assets, exclude vehicles
          const assetTypeLower = asset.assetType.toLowerCase();
          
          // EXCLUDE vehicles explicitly
          const isVehicle = assetTypeLower.includes('vehicle') || assetTypeLower.includes('car');
          
          if (isVehicle) {
            console.log(`  ❌ Excluded - is a vehicle`);
            return null;
          }
          
          // INCLUDE if it mentions property, real estate, land, commercial, residential, apartment, etc.
          const propertyKeywords = [
            'property', 
            'real estate', 
            'land', 
            'commercial', 
            'residential', 
            'apartment', 
            'house', 
            'building',
            'estate',
            'condo',
            'office'
          ];
          
          const isProperty = propertyKeywords.some(keyword => assetTypeLower.includes(keyword));
          
          if (!isProperty) {
            console.log(`  ❌ Excluded - not a property type`);
            return null;
          }
          
          console.log(`  ✅ Included as property`);
          
          // Check model type
          const isWeighted = asset.model === 1;
          
          // For debugging
          if (isWeighted) {
            console.log(`  Asset ${assetId} soldWeight raw:`, asset.soldWeight.toString());
            const soldPercent = parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16));
            console.log(`  Asset ${assetId} soldWeight percentage:`, soldPercent);
          }
          
          // Build base asset object
          const baseAsset = {
            assetId: assetId.toString(),
            assetType: asset.assetType,
            assetName: asset.assetName,
            assetDescription: asset.assetDescription,
            assetImageUrl: asset.mainImageUrl,
            model: asset.model,
            isActive: asset.isActive,
            createdAt: asset.createdAt.toString(),
            requiresPurchaserKYC: asset.requiresPurchaserKYC,
            
            // Model-specific fields
            ...(isWeighted ? {
              // WEIGHTED MODEL - soldWeight is in wei units (1e18 = 100%)
              // formatUnits with 16 decimals converts to percentage (1e16 = 1%)
              totalValue: asset.totalValue,
              soldWeight: parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)), // Convert to percentage
              availableWeight: 100 - parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)),
              soldPercentage: parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)),
              availablePercentage: 100 - parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)),
              minPurchaseWeight: parseFloat(ethers.utils.formatUnits(asset.minPurchaseAmount, 16)),
              maxPurchaseWeight: parseFloat(ethers.utils.formatUnits(asset.maxPurchaseAmount, 16))
            } : {
              // FIXED MODEL
              totalSupply: asset.totalSupply,
              pricePerToken: asset.pricePerToken,
              pricePerShare: asset.pricePerToken, // alias for compatibility
              soldTokens: asset.soldTokens,
              minPurchaseAmount: asset.minPurchaseAmount,
              maxPurchaseAmount: asset.maxPurchaseAmount,
              availableShares: asset.totalSupply.sub(asset.soldTokens)
            }),
            
            // Common fields
            maxPositionsPerUser: asset.maxPositionsPerUser,
            totalRevenue: asset.totalRevenue
          };
          
          // Parse additional data
          return parseAssetData(baseAsset);
        } catch (error) {
          console.error(`Error fetching asset ${assetId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(propertyPromises);
      const validProperties = results.filter(p => p !== null);
      
      console.log(`Loaded ${validProperties.length} properties`);
      setProperties(validProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      showNotification('Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [assetRegistry, isConnected, showNotification]);

  // Initial fetch
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Filter and sort properties
  const filteredAndSortedProperties = React.useMemo(() => {
    let filtered = [...properties];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.assetName?.toLowerCase().includes(query) ||
        p.assetType?.toLowerCase().includes(query) ||
        p.propertyData?.location?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(property => {
        const type = property.assetType?.toLowerCase() || '';
        
        switch(filter) {
          case 'residential':
            return type.includes('residential');
          case 'commercial':
            return type.includes('commercial');
          case 'land':
            return type.includes('land');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return parseInt(b.assetId) - parseInt(a.assetId);
        case 'oldest':
          return parseInt(a.assetId) - parseInt(b.assetId);
        case 'value-high':
          const valueA = a.model === 1 ? parseFloat(ethers.utils.formatEther(a.totalValue || 0)) : parseFloat(ethers.utils.formatEther(a.pricePerToken || 0));
          const valueB = b.model === 1 ? parseFloat(ethers.utils.formatEther(b.totalValue || 0)) : parseFloat(ethers.utils.formatEther(b.pricePerToken || 0));
          return valueB - valueA;
        case 'value-low':
          const valueLowA = a.model === 1 ? parseFloat(ethers.utils.formatEther(a.totalValue || 0)) : parseFloat(ethers.utils.formatEther(a.pricePerToken || 0));
          const valueLowB = b.model === 1 ? parseFloat(ethers.utils.formatEther(b.totalValue || 0)) : parseFloat(ethers.utils.formatEther(b.pricePerToken || 0));
          return valueLowA - valueLowB;
        default:
          return 0;
      }
    });

    return filtered;
  }, [properties, searchQuery, filter, sortBy]);

  // Show detail view if property is selected
  if (showDetailView && selectedProperty) {
    return (
      <PropertyDetailView 
        property={selectedProperty}
        onBack={() => {
          setShowDetailView(false);
          setSelectedProperty(null);
          // Refresh properties when returning from detail view
          fetchProperties();
        }}
        onPurchaseSuccess={async () => {
          // Refresh properties after purchase
          await fetchProperties();
          
          // Find and update the selected property with fresh data
          setProperties(prevProperties => {
            const refreshedProperty = prevProperties.find(
              p => p.assetId === selectedProperty.assetId
            );
            if (refreshedProperty) {
              setSelectedProperty(refreshedProperty);
            }
            return prevProperties;
          });
        }}
      />
    );
  }

  // Check wallet connection
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light text-sm">Please connect your wallet to view property investments</p>
        </div>
      </div>
    );
  }

  // Calculate metrics for display
  const totalValue = properties.reduce((sum, p) => {
    if (p.model === 1) {
      // WEIGHTED - use totalValue
      return sum + parseFloat(ethers.utils.formatEther(p.totalValue || 0));
    } else {
      // FIXED - calculate from price × supply
      const price = parseFloat(ethers.utils.formatEther(p.pricePerToken || 0));
      const supply = parseFloat(p.totalSupply?.toString() || 0);
      return sum + (price * supply);
    }
  }, 0);
  
  const totalProperties = properties.length;
  
  const availableProperties = properties.filter(p => {
    if (p.model === 1) {
      // WEIGHTED - check if available weight > 0
      return (p.availableWeight || 0) > 0;
    } else {
      // FIXED - check if available shares > 0
      return parseFloat(p.availableShares?.toString() || 0) > 0;
    }
  }).length;

  const averageValue = totalProperties > 0 ? totalValue / totalProperties : 0;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1920px] mx-auto">
        {/* Premium Header with Stats */}
        <div className="bg-gradient-to-b from-neutral-950 to-black border-b border-neutral-900">
          <div className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">Real Estate Properties</h1>
              <p className="text-sm sm:text-base text-neutral-500">Discover and invest in fractional real estate ownership</p>
            </div>

            {/* Premium Stats Cards - 2x2 on mobile */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
  <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Total</p>
      <Building className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 text-center sm:text-left">{totalProperties}</p>
    <p className="text-[8px] sm:text-xs text-green-500 text-center sm:text-left">Active</p>
  </div>

       <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Available</p>
      <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 text-center sm:text-left">{availableProperties}</p>
    <p className="text-[8px] sm:text-xs text-blue-500 text-center sm:text-left">Open</p>
  </div>


      <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Value</p>
      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 truncate text-center sm:text-left">{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p className="text-[8px] sm:text-xs text-neutral-500 text-center sm:text-left">OPN</p>
  </div>

 <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Avg</p>
      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 truncate text-center sm:text-left">{averageValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p className="text-[8px] sm:text-xs text-neutral-500 text-center sm:text-left">OPN</p>
  </div>
</div>
          </div>
        </div>

        {/* Premium Filter Bar */}
        <div className="bg-neutral-950 border-b border-neutral-900 sticky top-0 z-20 backdrop-blur-sm bg-opacity-95">
          <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search Bar with Icon */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search properties..."
                  className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-black border border-neutral-800 rounded-xl text-sm sm:text-base text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                )}
              </div>

              {/* Filter Controls - FIXED WIDTH */}
              <div className="flex gap-2 flex-wrap">
                {/* Property Type Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-[48%] sm:w-auto sm:min-w-[140px] px-3 sm:px-4 py-2 sm:py-3 bg-black border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>

                {/* Sort - SHORTENED */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-[48%] sm:w-auto sm:min-w-[140px] px-3 sm:px-4 py-2 sm:py-3 bg-black border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="newest">Recent</option>
                  <option value="oldest">Oldest</option>
                  <option value="value-high">$ High-Low</option>
                  <option value="value-low">$ Low-High</option>
                </select>

                {/* View Toggle */}
                <div className="flex bg-black border border-neutral-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 sm:px-4 py-2 sm:py-3 transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 sm:px-4 py-2 sm:py-3 transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <Rows3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="px-3 sm:px-6 lg:px-8 py-2 sm:py-3 bg-black/50 border-b border-neutral-900 flex items-center justify-between">
          <p className="text-xs sm:text-sm text-neutral-400">
            Found <span className="text-white font-medium">{filteredAndSortedProperties.length}</span> properties
            {searchQuery && <span className="hidden sm:inline"> matching "{searchQuery}"</span>}
          </p>
        </div>

        {/* Main Content */}
        <div className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20 sm:py-32">
              <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
            </div>
          )}

          {/* Properties Grid/List */}
          {!loading && filteredAndSortedProperties.length > 0 && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredAndSortedProperties.map(property => (
                  <PropertyCard
                    key={property.assetId}
                    property={property}
                    onViewDetails={(prop) => {
                      setSelectedProperty(prop);
                      setShowDetailView(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              // Premium List View - Mobile Responsive
              <div className="space-y-3 sm:space-y-4">
                {filteredAndSortedProperties.map(property => {
                  // Calculate values for list view
                  const isWeighted = property.model === 1;
                  const pricing = isWeighted 
                    ? {
                        label: 'Total Value',
                        value: parseFloat(ethers.utils.formatEther(property.totalValue || 0)).toFixed(0),
                        usd: convertToUSD(ethers.utils.formatEther(property.totalValue || 0))
                      }
                    : {
                        label: 'Price per Share',
                        value: parseFloat(ethers.utils.formatEther(property.pricePerToken || 0)).toFixed(2),
                        usd: convertToUSD(ethers.utils.formatEther(property.pricePerToken || 0))
                      };

                  const availability = isWeighted
                    ? {
                        value: `${property.availableWeight?.toFixed(2)}%`,
                        sold: `${property.soldPercentage?.toFixed(2)}%`
                      }
                    : {
                        value: `${property.availableShares?.toString() || '0'} shares`,
                        sold: `${property.totalSupply && property.availableShares 
                          ? ((parseFloat(property.totalSupply.toString()) - parseFloat(property.availableShares.toString())) / parseFloat(property.totalSupply.toString()) * 100).toFixed(2)
                          : '0'}%`
                      };
                  
                  const isAvailable = isWeighted 
                    ? property.availableWeight > 0
                    : property.availableShares && parseFloat(property.availableShares.toString()) > 0;

                  return (
                    <div
                      key={property.assetId}
                      className="group bg-gradient-to-r from-neutral-900/50 to-black border border-neutral-800 rounded-xl p-4 sm:p-6 hover:border-neutral-700 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowDetailView(true);
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        {/* Image */}
                        <div className="w-full sm:w-48 h-32 sm:h-32 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl overflow-hidden flex-shrink-0 relative">
                          {property.assetImageUrl ? (
                            <img
                              src={property.assetImageUrl}
                              alt={property.assetName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : null}
                          {!property.assetImageUrl && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-700" />
                            </div>
                          )}
                          
                          {/* Badges */}
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs rounded-lg flex items-center gap-1 w-fit">
                              <Home className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {property.assetType}
                            </span>
                            <span className="px-2 py-1 bg-green-600/80 backdrop-blur-sm text-white text-[10px] sm:text-xs rounded-lg flex items-center gap-1 w-fit">
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Verified
                            </span>
                            {isWeighted ? (
                              <span className="px-2 py-1 bg-purple-600/80 backdrop-blur-sm text-white text-[10px] sm:text-xs rounded-lg w-fit">
                                Weighted
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-sm text-white text-[10px] sm:text-xs rounded-lg w-fit">
                                Fixed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 w-full space-y-3">
                          {/* Asset Info */}
                          <div>
                            <h3 className="text-base sm:text-lg font-medium text-white mb-1">
                              {property.assetName}
                            </h3>
                            <p className="text-xs sm:text-sm text-neutral-400 line-clamp-1 mb-2">
                              {property.assetDescription || 'Premium tokenized real estate'}
                            </p>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
                              <div className="flex items-center gap-1 text-neutral-400">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{property.propertyData?.location || 'Dubai, UAE'}</span>
                              </div>
                              {property.propertyData?.size && (
                                <span className="text-neutral-400">• {property.propertyData.size}</span>
                              )}
                            </div>
                          </div>

                          {/* Stats - Grid on mobile */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-wider mb-1">{pricing.label}</p>
                              <p className="text-base sm:text-xl font-light text-white">{pricing.value} OPN</p>
                              <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${pricing.usd}</p>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-wider mb-1">Available</p>
                              <p className="text-base sm:text-xl font-light text-white">{availability.value}</p>
                              <p className="text-[10px] sm:text-xs text-neutral-500">Sold: {availability.sold}</p>
                            </div>
                          </div>

                          {/* Action - Full width on mobile */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProperty(property);
                              setShowDetailView(true);
                            }}
                            disabled={!isAvailable}
                            className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                              isAvailable
                                ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:-translate-y-0.5'
                                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            }`}
                          >
                            {isAvailable ? 'View Details' : 'Sold Out'}
                            {isAvailable && <ArrowRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Empty State */}
          {!loading && filteredAndSortedProperties.length === 0 && (
            <div className="text-center py-20 sm:py-32 px-4">
              <div className="inline-flex p-4 sm:p-6 bg-neutral-900/50 rounded-full mb-4 sm:mb-6">
                <Building className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-2">No properties found</h3>
              <p className="text-sm sm:text-base text-neutral-500 mb-6 sm:mb-8 max-w-md mx-auto">
                {searchQuery || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Check back later for new property listings'}
              </p>
              {(searchQuery || filter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white text-sm sm:text-base rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyView;