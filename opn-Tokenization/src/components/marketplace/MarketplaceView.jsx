// src/components/marketplace/MarketplaceView.jsx
// FIXED - All hooks declared at the top before any conditional logic
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useWeb3 } from '../../contexts/Web3Context';
import AssetCard from './AssetCard';
import AssetDetailView from './AssetDetailView';
import { 
  Loader2, Home, Car, Palette, Package, AlertCircle,
  Search, SlidersHorizontal, Grid, List, X, Activity,
  TrendingUp, Shield, Sparkles, LayoutGrid, Rows3
} from 'lucide-react';

const MarketplaceView = () => {
  // ============================================
  // ALL HOOKS MUST BE DECLARED FIRST
  // ============================================
  const { assets, loading, error } = useMarketplace();
  const { isConnected } = useWeb3();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // This useEffect MUST be here with all other hooks
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, filterAssetType, filterModel, filterAvailability, sortBy]);

  // ============================================
  // CONSTANTS AND HELPERS - After hooks
  // ============================================
  const assetsPerPage = 12;
  const OPN_TO_USD = 0.05;
  
  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };

  // ============================================
  // NOW WE CAN DO CONDITIONAL RETURNS
  // ============================================
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">Please connect your wallet to view marketplace assets</p>
        </div>
      </div>
    );
  }

  // If an asset is selected, show the detail view
  if (selectedAsset) {
    console.log('Selected asset:', selectedAsset);
    return (
      <div className="min-h-screen bg-black">
        <AssetDetailView 
          asset={selectedAsset} 
          onBack={() => {
            console.log('Going back to marketplace');
            setSelectedAsset(null);
          }}
        />
      </div>
    );
  }

  // ============================================
  // DATA PROCESSING - After conditional returns
  // ============================================
  
  // Asset categories
  const categories = [
    { id: 'all', label: 'All Assets', icon: null },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'art', label: 'Art', icon: Palette },
    { id: 'collectibles', label: 'Collectibles', icon: Package },
  ];

  // Filter out real estate
  const marketplaceAssets = assets.filter(asset => {
    const assetType = (asset.assetType || '').toLowerCase();
    
    const isRealEstate = 
      assetType.includes('real_estate') ||
      assetType.includes('real estate') ||
      assetType.includes('property') ||
      assetType.includes('residential') ||
      assetType.includes('commercial') ||
      assetType.includes('land');
    
    return !isRealEstate;
  });
  
  // Filter assets based on selected category
  let filteredAssets = activeCategory === 'all' 
    ? marketplaceAssets 
    : marketplaceAssets.filter(asset => {
        const categoryMap = {
          'vehicles': ['VEHICLE', 'Vehicle', 'Car', 'Automobile'],
          'art': ['ART', 'Art', 'Artwork', 'Painting'],
          'collectibles': ['COLLECTIBLE', 'Collectibles', 'LUXURY_WATCH', 'Luxury Watch']
        };
        
        const assetType = asset.assetType || '';
        return categoryMap[activeCategory]?.some(type => 
          assetType.toUpperCase().includes(type.toUpperCase())
        );
      });

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredAssets = filteredAssets.filter(a => 
      a.assetName?.toLowerCase().includes(query) ||
      a.assetType?.toLowerCase().includes(query) ||
      a.assetDescription?.toLowerCase().includes(query)
    );
  }

  // Apply asset type filter
  if (filterAssetType !== 'all') {
    filteredAssets = filteredAssets.filter(a => 
      a.assetType?.toLowerCase() === filterAssetType.toLowerCase()
    );
  }

  // Apply model filter
  if (filterModel === 'weighted') {
    filteredAssets = filteredAssets.filter(a => a.model === 1);
  } else if (filterModel === 'fixed') {
    filteredAssets = filteredAssets.filter(a => a.model === 0);
  }

  // Apply availability filter
  if (filterAvailability === 'available') {
    filteredAssets = filteredAssets.filter(a => {
      if (a.model === 1) {
        return a.availableWeight > 0;
      } else {
        return a.availableShares && a.availableShares.gt(0);
      }
    });
  } else if (filterAvailability === 'soldout') {
    filteredAssets = filteredAssets.filter(a => {
      if (a.model === 1) {
        return a.availableWeight === 0;
      } else {
        return !a.availableShares || a.availableShares.eq(0);
      }
    });
  }

  // Apply price range filter
  if (priceRange.min || priceRange.max) {
    filteredAssets = filteredAssets.filter(a => {
      let price = 0;
      try {
        if (a.pricePerShare) {
          price = parseFloat(ethers.utils.formatEther(a.pricePerShare));
        }
      } catch {}
      
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      return price >= min && price <= max;
    });
  }

  // Apply sorting
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (b.assetId || 0) - (a.assetId || 0);
      case 'oldest':
        return (a.assetId || 0) - (b.assetId || 0);
      case 'price-low':
      case 'price-high': {
        const getPrice = (asset) => {
          try {
            if (asset.pricePerShare) {
              return parseFloat(ethers.utils.formatEther(asset.pricePerShare));
            }
          } catch {
            return 0;
          }
          return 0;
        };
        const priceA = getPrice(a);
        const priceB = getPrice(b);
        return sortBy === 'price-low' ? priceA - priceB : priceB - priceA;
      }
      default:
        return 0;
    }
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedAssets.length / assetsPerPage);
  const startIndex = (currentPage - 1) * assetsPerPage;
  const endIndex = startIndex + assetsPerPage;
  const currentAssets = sortedAssets.slice(startIndex, endIndex);

  // Calculate metrics
  const totalValue = sortedAssets.reduce((sum, a) => {
    try {
      if (!a.pricePerShare || !a.totalShares) return sum;
      const price = ethers.BigNumber.from(a.pricePerShare);
      const total = ethers.BigNumber.from(a.totalShares);
      const available = ethers.BigNumber.from(a.availableShares || 0);
      const sold = total.sub(available);
      const value = price.mul(sold);
      return sum.add(value);
    } catch (err) {
      return sum;
    }
  }, ethers.BigNumber.from(0));

  const totalAssetCount = sortedAssets.length;
  
  const availableAssetsCount = sortedAssets.filter(a => {
    if (a.model === 1) {
      return a.availableWeight > 0;
    } else {
      return a.availableShares && a.availableShares.gt(0);
    }
  }).length;

  const averagePrice = sortedAssets.reduce((sum, a) => {
    try {
      if (a.pricePerShare) {
        return sum + parseFloat(ethers.utils.formatEther(a.pricePerShare));
      }
    } catch {}
    return sum;
  }, 0) / (sortedAssets.length || 1);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1920px] mx-auto">
        {/* Premium Header with Stats */}
        <div className="bg-gradient-to-b from-neutral-950 to-black border-b border-neutral-900">
          <div className="px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-light text-white mb-2">Asset Marketplace</h1>
                <p className="text-neutral-500">Discover premium tokenized assets</p>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider">Total Assets</p>
                  <Package className="w-4 h-4 text-neutral-600" />
                </div>
                <p className="text-2xl font-light text-white">{totalAssetCount}</p>
                <p className="text-xs text-green-500 mt-1">Listed</p>
              </div>

              <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider">Available</p>
                  <Shield className="w-4 h-4 text-neutral-600" />
                </div>
                <p className="text-2xl font-light text-white">{availableAssetsCount}</p>
                <p className="text-xs text-blue-500 mt-1">For purchase</p>
              </div>

              <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider">Total Value</p>
                  <TrendingUp className="w-4 h-4 text-neutral-600" />
                </div>
                <p className="text-2xl font-light text-white">
                  {parseFloat(ethers.utils.formatEther(totalValue)).toLocaleString(undefined, { maximumFractionDigits: 0 })} OPN
                </p>
                <p className="text-xs text-neutral-500 mt-1">≈ ${convertToUSD(ethers.utils.formatEther(totalValue))}</p>
              </div>

              <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider">Avg Price</p>
                  <Sparkles className="w-4 h-4 text-neutral-600" />
                </div>
                <p className="text-2xl font-light text-white">{averagePrice.toFixed(0)} OPN</p>
                <p className="text-xs text-neutral-500 mt-1">≈ ${convertToUSD(averagePrice)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Filter Bar */}
        <div className="bg-neutral-950 border-b border-neutral-900 sticky top-0 z-20 backdrop-blur-sm bg-opacity-95">
          <div className="px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar with Icon */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets by name, type, or description..."
                  className="w-full pl-12 pr-4 py-3 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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

              {/* Filter Controls */}
              <div className="flex gap-3">
                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    showFilters
                      ? 'bg-blue-600 text-white'
                      : 'bg-black border border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="hidden md:inline">Filters</span>
                  {(filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
                    <span className="px-2 py-0.5 bg-white/20 text-xs rounded-full">
                      {[
                        filterAssetType !== 'all',
                        filterModel !== 'all',
                        filterAvailability !== 'all',
                        priceRange.min || priceRange.max
                      ].filter(Boolean).length}
                    </span>
                  )}
                </button>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-black border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="newest">Recently Listed</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                {/* View Toggle */}
                <div className="flex bg-black border border-neutral-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-3 transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-3 transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <Rows3 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showFilters ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}>
              <div className="bg-black border border-neutral-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Asset Type */}
                  <div>
                    <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
                      Asset Type
                    </label>
                    <select
                      value={filterAssetType}
                      onChange={(e) => setFilterAssetType(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="all">All Types</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="art">Art</option>
                      <option value="collectible">Collectible</option>
                      <option value="luxury_watch">Luxury Watch</option>
                    </select>
                  </div>

                  {/* Model Type */}
                  <div>
                    <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
                      Model Type
                    </label>
                    <select
                      value={filterModel}
                      onChange={(e) => setFilterModel(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="all">All Models</option>
                      <option value="weighted">Weighted</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  {/* Availability */}
                  <div>
                    <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
                      Availability
                    </label>
                    <select
                      value={filterAvailability}
                      onChange={(e) => setFilterAvailability(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="all">All Assets</option>
                      <option value="available">Available Only</option>
                      <option value="soldout">Sold Out</option>
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
                      Price Range (OPN)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                        className="w-1/2 px-2 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                        className="w-1/2 px-2 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <button
                      onClick={() => {
                        setFilterAssetType('all');
                        setFilterModel('all');
                        setFilterAvailability('all');
                        setPriceRange({ min: '', max: '' });
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="bg-black/50 border-b border-neutral-900">
          <div className="px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                const count = category.id === 'all' 
                  ? marketplaceAssets.length 
                  : marketplaceAssets.filter(asset => {
                      const categoryMap = {
                        'vehicles': ['VEHICLE', 'Vehicle', 'Car', 'Automobile'],
                        'art': ['ART', 'Art', 'Artwork', 'Painting'],
                        'collectibles': ['COLLECTIBLE', 'Collectibles', 'LUXURY_WATCH', 'Luxury Watch']
                      };
                      const assetType = asset.assetType || '';
                      return categoryMap[category.id]?.some(type => 
                        assetType.toUpperCase().includes(type.toUpperCase())
                      );
                    }).length;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`
                      flex items-center gap-2 px-1 py-4
                      transition-all duration-200 whitespace-nowrap
                      border-b-2 text-sm font-medium
                      ${isActive 
                        ? 'text-white border-white' 
                        : 'text-neutral-500 border-transparent hover:text-neutral-300'}
                    `}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{category.label}</span>
                    {count > 0 && (
                      <span className={`px-2 py-0.5 text-xs rounded-lg ${
                        isActive 
                          ? 'bg-white/10 text-white' 
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="px-6 lg:px-8 py-3 bg-black/50 border-b border-neutral-900 flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            Found <span className="text-white font-medium">{sortedAssets.length}</span> assets
            {searchQuery && <span> matching "{searchQuery}"</span>}
          </p>
          
          {/* Active Filters Pills */}
          {(filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
            <div className="flex flex-wrap gap-2 items-center">
              {filterAssetType !== 'all' && (
                <span className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400">
                  Type: {filterAssetType}
                </span>
              )}
              {filterModel !== 'all' && (
                <span className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400">
                  Model: {filterModel}
                </span>
              )}
              {filterAvailability !== 'all' && (
                <span className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400">
                  {filterAvailability === 'available' ? 'Available' : 'Sold Out'}
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400">
                  Price: {priceRange.min || '0'} - {priceRange.max || '∞'} OPN
                </span>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-6 lg:px-8 py-8">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-32">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-neutral-500 font-light">Unable to load assets</p>
              <p className="text-xs text-neutral-600 mt-2">{error}</p>
            </div>
          )}

          {/* Assets Grid/List */}
          {!loading && !error && sortedAssets.length > 0 && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentAssets.map(asset => (
                  <AssetCard 
                    key={asset.assetId}
                    asset={asset}
                    onBuyClick={(asset) => setSelectedAsset(asset)}
                    viewMode="grid"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {currentAssets.map(asset => (
                  <AssetCard 
                    key={asset.assetId}
                    asset={asset}
                    onBuyClick={(asset) => setSelectedAsset(asset)}
                    viewMode="list"
                  />
                ))}
              </div>
            )
          )}

          {/* Empty State */}
          {!loading && !error && sortedAssets.length === 0 && (
            <div className="text-center py-32">
              <div className="inline-flex p-6 bg-neutral-900/50 rounded-full mb-6">
                <Package className="w-16 h-16 text-neutral-600" />
              </div>
              <h3 className="text-2xl font-light text-white mb-2">No assets found</h3>
              <p className="text-neutral-500 mb-8 max-w-md mx-auto">
                {searchQuery || filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max
                  ? 'Try adjusting your search or filters'
                  : 'Check back later for new asset listings'}
              </p>
              {(searchQuery || filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterAssetType('all');
                    setFilterModel('all');
                    setFilterAvailability('all');
                    setPriceRange({ min: '', max: '' });
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && sortedAssets.length > 0 && (
            <div className="flex items-center justify-between border-t border-neutral-800 pt-8 mt-12">
              <div className="text-sm text-neutral-400">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedAssets.length)} of {sortedAssets.length} assets
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === 1
                      ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="text-neutral-600 px-2">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === totalPages
                      ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceView;