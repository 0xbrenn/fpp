// src/components/marketplace/MarketplaceView.jsx
// ENHANCED VERSION - Better UX with search, filters, sorting
import React, { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useWeb3 } from '../../contexts/Web3Context';
import AssetCard from './AssetCard';
import AssetDetailView from './AssetDetailView';
import { 
  Loader2, AlertCircle, Package, TrendingUp, DollarSign,
  Search, SlidersHorizontal, Grid, List, Filter
} from 'lucide-react';

const MarketplaceView = () => {
  const { assets, loading, error } = useMarketplace();
  const { isConnected } = useWeb3();
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [filterModel, setFilterModel] = useState('all'); // all, weighted, fixed
  const [filterAvailability, setFilterAvailability] = useState('all'); // all, available, soldout
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Sorting
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, price-low, price-high, available-high, available-low
  
  // View mode
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);
  
  // Check wallet connection first
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
    return (
      <AssetDetailView 
        asset={selectedAsset} 
        onBack={() => setSelectedAsset(null)}
      />
    );
  }

  // Apply filters, search, and sorting
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = [...assets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.assetName?.toLowerCase().includes(query) ||
        a.assetType?.toLowerCase().includes(query) ||
        a.assetDescription?.toLowerCase().includes(query)
      );
    }

    // Asset type filter
    if (filterAssetType !== 'all') {
      filtered = filtered.filter(a => 
        a.assetType?.toLowerCase() === filterAssetType.toLowerCase()
      );
    }

    // Model filter
    if (filterModel === 'weighted') {
      filtered = filtered.filter(a => a.model === 1);
    } else if (filterModel === 'fixed') {
      filtered = filtered.filter(a => a.model === 0);
    }

    // Availability filter
    if (filterAvailability === 'available') {
      filtered = filtered.filter(a => {
        if (a.model === 0) {
          // Fixed model
          return a.availableShares && a.availableShares.gt(0);
        } else {
          // Weighted model
          return a.availableWeight && a.availableWeight > 0;
        }
      });
    } else if (filterAvailability === 'soldout') {
      filtered = filtered.filter(a => {
        if (a.model === 0) {
          return !a.availableShares || a.availableShares.eq(0);
        } else {
          return !a.availableWeight || a.availableWeight === 0;
        }
      });
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(a => {
        let price;
        if (a.model === 0) {
          // Fixed: price per token
          price = parseFloat(ethers.utils.formatEther(a.pricePerShare || 0));
        } else {
          // Weighted: 1% of total value
          price = parseFloat(ethers.utils.formatEther(a.totalValue || 0)) / 100;
        }
        
        if (priceRange.min && price < parseFloat(priceRange.min)) return false;
        if (priceRange.max && price > parseFloat(priceRange.max)) return false;
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'price-low':
          const priceA = a.model === 0 
            ? parseFloat(ethers.utils.formatEther(a.pricePerShare || 0))
            : parseFloat(ethers.utils.formatEther(a.totalValue || 0)) / 100;
          const priceB = b.model === 0 
            ? parseFloat(ethers.utils.formatEther(b.pricePerShare || 0))
            : parseFloat(ethers.utils.formatEther(b.totalValue || 0)) / 100;
          return priceA - priceB;
        case 'price-high':
          const priceA2 = a.model === 0 
            ? parseFloat(ethers.utils.formatEther(a.pricePerShare || 0))
            : parseFloat(ethers.utils.formatEther(a.totalValue || 0)) / 100;
          const priceB2 = b.model === 0 
            ? parseFloat(ethers.utils.formatEther(b.pricePerShare || 0))
            : parseFloat(ethers.utils.formatEther(b.totalValue || 0)) / 100;
          return priceB2 - priceA2;
        case 'available-high':
          const availA = a.model === 0 
            ? parseFloat(ethers.utils.formatEther(a.availableShares || 0))
            : a.availableWeight || 0;
          const availB = b.model === 0 
            ? parseFloat(ethers.utils.formatEther(b.availableShares || 0))
            : b.availableWeight || 0;
          return availB - availA;
        case 'available-low':
          const availA2 = a.model === 0 
            ? parseFloat(ethers.utils.formatEther(a.availableShares || 0))
            : a.availableWeight || 0;
          const availB2 = b.model === 0 
            ? parseFloat(ethers.utils.formatEther(b.availableShares || 0))
            : b.availableWeight || 0;
          return availA2 - availB2;
        default:
          return 0;
      }
    });

    return filtered;
  }, [assets, searchQuery, filterAssetType, filterModel, filterAvailability, priceRange, sortBy]);

  // Get unique asset types for filter
  const assetTypes = useMemo(() => 
    ['all', ...new Set(assets.map(a => a.assetType).filter(Boolean))],
    [assets]
  );

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterAssetType('all');
    setFilterModel('all');
    setFilterAvailability('all');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAssetType !== 'all') count++;
    if (filterModel !== 'all') count++;
    if (filterAvailability !== 'all') count++;
    if (priceRange.min || priceRange.max) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, filterAssetType, filterModel, filterAvailability, priceRange, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const availableAssets = assets.filter(a => {
      if (a.model === 0) {
        return a.availableShares && a.availableShares.gt(0);
      } else {
        return a.availableWeight && a.availableWeight > 0;
      }
    }).length;
    
    const totalValue = assets.reduce((sum, a) => {
      if (a.model === 0) {
        return sum + parseFloat(ethers.utils.formatEther(a.totalSupply?.mul(a.pricePerShare || 0) || 0));
      } else {
        return sum + parseFloat(ethers.utils.formatEther(a.totalValue || 0));
      }
    }, 0);

    return {
      totalAssets,
      availableAssets,
      totalValue: totalValue.toFixed(2)
    };
  }, [assets]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-white/10"
          style={{ animation: 'pulseSlow 4s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white mb-2">Primary Marketplace</h1>
          <p className="text-neutral-400 font-light">
            Discover and invest in tokenized assets directly from creators
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Total Assets
            </p>
            <p className="text-2xl font-semibold text-white">{stats.totalAssets}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Showing
            </p>
            <p className="text-2xl font-semibold text-white">{filteredAndSortedAssets.length}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Available
            </p>
            <p className="text-2xl font-semibold text-white">{stats.availableAssets}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Total Value
            </p>
            <p className="text-2xl font-semibold text-white">{stats.totalValue} OPN</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          {/* Top Row */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, type, or description..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden md:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-semibold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="available-high">Most Available</option>
              <option value="available-low">Least Available</option>
            </select>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Asset Type */}
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Asset Type
                  </label>
                  <select
                    value={filterAssetType}
                    onChange={(e) => setFilterAssetType(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  >
                    {assetTypes.map(type => (
                      <option key={type} value={type}>
                        {type === 'all' ? 'All Types' : type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Model */}
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Model Type
                  </label>
                  <select
                    value={filterModel}
                    onChange={(e) => setFilterModel(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  >
                    <option value="all">All Models</option>
                    <option value="weighted">Weighted Only</option>
                    <option value="fixed">Fixed Only</option>
                  </select>
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Availability
                  </label>
                  <select
                    value={filterAvailability}
                    onChange={(e) => setFilterAvailability(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  >
                    <option value="all">All Assets</option>
                    <option value="available">Available Only</option>
                    <option value="soldout">Sold Out Only</option>
                  </select>
                </div>

                {/* Spacer for alignment */}
                <div></div>
              </div>

              {/* Price Range */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Min Price (OPN per unit)
                  </label>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Max Price (OPN per unit)
                  </label>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    placeholder="999.99"
                    step="0.01"
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-32 px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-neutral-500 font-light text-base">Unable to load assets</p>
            <p className="text-xs text-neutral-600 mt-2">{error}</p>
          </div>
        )}

        {/* Assets Grid/List */}
        {!loading && !error && filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-32">
            <Package className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-light text-white mb-2">No Assets Found</h3>
            <p className="text-neutral-500 font-light mb-4">
              {activeFilterCount > 0 
                ? 'Try adjusting your filters or search query' 
                : 'Check back soon for new listings'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredAndSortedAssets.length > 0 && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredAndSortedAssets.map(asset => (
              <AssetCard 
                key={asset.assetId}
                asset={asset}
                onBuyClick={(asset) => setSelectedAsset(asset)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceView;