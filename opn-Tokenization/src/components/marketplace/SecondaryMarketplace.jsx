// src/components/marketplace/SecondaryMarketplace.jsx
// PREMIUM DARK THEME P2P MARKETPLACE - Mobile Responsive WITH USER LIMIT CHECKS
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { 
  ShoppingCart, Loader2, AlertCircle, TrendingUp, 
  Package, User, Clock, X, Check, Filter, Search,
  SlidersHorizontal, ArrowUpDown, LayoutGrid, Rows3,
  ChevronDown, Activity, DollarSign, Percent,
  Shield, Zap, Eye, Heart, MoreHorizontal, ExternalLink,
  Sparkles, Tag, ArrowRight, Timer, Verified,
  TrendingDown, BarChart3, Users, Gem
} from 'lucide-react';

const SecondaryMarketplace = () => {
  const { isConnected, address } = useWeb3();
  const { secondaryMarket, assetRegistry, positionNFT } = useContract();
  const { showNotification } = useApp();
  
  // OPN to USD conversion rate
  const OPN_TO_USD = 0.05;
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [buying, setBuying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // User's current holdings per asset
  const [userHoldings, setUserHoldings] = useState({});
  const [checkingLimits, setCheckingLimits] = useState(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [showMyListings, setShowMyListings] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Sorting
  const [sortBy, setSortBy] = useState('newest');
  
  // View mode
  const [viewMode, setViewMode] = useState('grid');
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const listingsPerPage = viewMode === 'grid' ? 20 : 25;

  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };

  const formatPercentage = (percent) => {
    if (percent === 0) return '0%';
    if (percent < 0.0001) return '<0.0001%';
    if (percent < 0.001) return percent.toFixed(4) + '%';
    if (percent < 0.01) return percent.toFixed(3) + '%';
    if (percent < 1) return percent.toFixed(2) + '%';
    return percent.toFixed(1) + '%';
  };

  const getExactPercentage = (percent) => {
    if (percent === 0) return '0%';
    if (percent < 0.0001) {
      return percent.toFixed(8).replace(/\.?0+$/, '') + '%';
    }
    return formatPercentage(percent);
  };

  // Fetch user's current holdings for all assets
  const fetchUserHoldings = useCallback(async () => {
    if (!address || !positionNFT || !assetRegistry) return;

    setCheckingLimits(true);
    try {
      const result = await assetRegistry.getActiveAssets(0, 100);
      const assetIds = result[0] || result.assetIds || [];
      
      const holdingsMap = {};
      
      for (const assetId of assetIds) {
        try {
          const asset = await assetRegistry.assets(assetId);
          const isWeighted = (asset.model || asset[7]) === 1;
          const positionIds = await positionNFT.getUserPositions(address, assetId);
          
          if (isWeighted) {
            // WEIGHTED - sum up all position weights
            let totalWeight = ethers.BigNumber.from(0);
            for (const posId of positionIds) {
              const position = await positionNFT.positions(posId);
              const amount = position.amount || position[3];
              totalWeight = totalWeight.add(amount);
            }
            const weightPercent = parseFloat(ethers.utils.formatUnits(totalWeight, 16));
            
            holdingsMap[assetId.toString()] = {
              currentAmount: weightPercent,
              maxAllowed: asset.maxPurchaseAmount ? parseFloat(ethers.utils.formatUnits(asset.maxPurchaseAmount, 16)) : 100,
              isWeighted: true
            };
          } else {
            // FIXED - sum up all position amounts
            let totalShares = 0;
            for (const posId of positionIds) {
              const position = await positionNFT.positions(posId);
              const amount = position.amount || position[3];
              totalShares += parseFloat(amount.toString());
            }
            
            holdingsMap[assetId.toString()] = {
              currentAmount: totalShares,
              maxAllowed: asset.maxPurchaseAmount ? parseFloat(asset.maxPurchaseAmount.toString()) : 0,
              isWeighted: false
            };
          }
        } catch (error) {
          console.error(`Error fetching holdings for asset ${assetId}:`, error);
        }
      }
      
      setUserHoldings(holdingsMap);
    } catch (error) {
      console.error('Error fetching user holdings:', error);
    } finally {
      setCheckingLimits(false);
    }
  }, [address, positionNFT, assetRegistry]);

  // Check if user can purchase a specific listing
  const canUserPurchase = useCallback((listing) => {
    if (!listing || !userHoldings[listing.assetId]) return { canPurchase: true, reason: null };
    
    const holdings = userHoldings[listing.assetId];
    
    // No limit set
    if (holdings.maxAllowed === 0 || holdings.maxAllowed >= 100) {
      return { canPurchase: true, reason: null };
    }
    
    if (holdings.isWeighted) {
      // WEIGHTED MODEL
      const afterPurchase = holdings.currentAmount + listing.ownershipPercent;
      
      if (afterPurchase > holdings.maxAllowed) {
        const remaining = Math.max(0, holdings.maxAllowed - holdings.currentAmount);
        return {
          canPurchase: false,
          reason: `Exceeds limit: You own ${holdings.currentAmount.toFixed(3)}%, can only buy ${remaining.toFixed(3)}% more (limit: ${holdings.maxAllowed}%)`
        };
      }
    } else {
      // FIXED MODEL
      const sharesInListing = parseFloat(listing.amountListed);
      const afterPurchase = holdings.currentAmount + sharesInListing;
      
      if (afterPurchase > holdings.maxAllowed) {
        const remaining = Math.max(0, holdings.maxAllowed - holdings.currentAmount);
        return {
          canPurchase: false,
          reason: `Exceeds limit: You own ${holdings.currentAmount} shares, can only buy ${remaining} more (limit: ${holdings.maxAllowed} per user)`
        };
      }
    }
    
    return { canPurchase: true, reason: null };
  }, [userHoldings]);

  // Fetch all active listings
  const fetchListings = useCallback(async () => {
    if (!secondaryMarket || !assetRegistry || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const result = await secondaryMarket.getActiveListings(0, 100);
      const rawListings = result[0] || result;
      
      if (!rawListings || rawListings.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const enrichedListings = await Promise.all(
        rawListings.map(async (listing) => {
          try {
            const asset = await assetRegistry.assets(listing.assetId);
            const isWeighted = (asset.model || asset[7]) === 1;
            
            let displayAmount, displayPercentage, ownershipPercent;
            
            if (isWeighted) {
              ownershipPercent = parseFloat(ethers.utils.formatUnits(listing.amountListed, 16));
              displayPercentage = formatPercentage(ownershipPercent);
              displayAmount = displayPercentage;
            } else {
              const totalSupply = asset.totalSupply || asset[8];
              if (totalSupply.gt(0)) {
                ownershipPercent = listing.amountListed.mul(10000).div(totalSupply).toNumber() / 100;
                displayPercentage = formatPercentage(ownershipPercent);
              } else {
                ownershipPercent = 0;
                displayPercentage = '0%';
              }
              displayAmount = listing.amountListed.toString() + ' shares';
            }

            const priceInEth = parseFloat(ethers.utils.formatEther(listing.price));

            return {
              listingId: listing.listingId.toString(),
              positionId: listing.positionId.toString(),
              seller: listing.seller,
              assetId: listing.assetId.toString(),
              assetName: asset.assetName || asset[3] || 'Unnamed Asset',
              assetType: asset.assetType || asset[2] || 'Other',
              assetImageUrl: asset.mainImageUrl || asset[5] || '',
              amountListed: listing.amountListed.toString(),
              displayAmount,
              displayPercentage,
              ownershipPercent,
              price: ethers.utils.formatEther(listing.price),
              priceNumber: priceInEth,
              isPartialSale: listing.isPartialSale,
              isActive: listing.isActive,
              createdAt: listing.createdAt.toNumber(),
              isWeighted,
              model: asset.model || asset[7]
            };
          } catch (error) {
            console.error('Error enriching listing:', error);
            return null;
          }
        })
      );

      const validListings = enrichedListings.filter(l => l !== null && l.isActive);
      setListings(validListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      showNotification('Failed to load marketplace listings', 'error');
    } finally {
      setLoading(false);
    }
  }, [secondaryMarket, assetRegistry, isConnected, showNotification]);

  useEffect(() => {
    fetchListings();
    fetchUserHoldings();
  }, [fetchListings, fetchUserHoldings]);

  // Handle purchase with limit check
  const handleBuy = async (listing) => {
    if (!secondaryMarket) return;

    // Check if user can purchase
    const { canPurchase, reason } = canUserPurchase(listing);
    
    if (!canPurchase) {
      showNotification(reason, 'error');
      return;
    }

    setBuying(true);
    try {
      const price = ethers.utils.parseEther(listing.price);
      const fee = price.mul(200).div(10000);
      const totalCost = price.add(fee);

      const tx = await secondaryMarket.buyPosition(listing.listingId, {
        value: totalCost
      });

      showNotification('Transaction submitted...', 'info');
      await tx.wait();

      showNotification(
        `Successfully purchased ${listing.displayAmount} of ${listing.assetName}!`,
        'success'
      );

      setSelectedListing(null);
      await fetchListings();
      await fetchUserHoldings(); // Refresh holdings
    } catch (error) {
      console.error('Error buying position:', error);
      showNotification('Failed to purchase: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setBuying(false);
    }
  };

  // Handle cancel listing
  const handleCancelListing = async (listing) => {
    if (!secondaryMarket) return;

    setCancelling(true);
    try {
      const tx = await secondaryMarket.cancelListing(listing.listingId);

      showNotification('Cancelling listing...', 'info');
      await tx.wait();

      showNotification('Listing cancelled successfully!', 'success');

      setSelectedListing(null);
      await fetchListings();
      await fetchUserHoldings(); // Refresh holdings
    } catch (error) {
      console.error('Error cancelling listing:', error);
      showNotification('Failed to cancel listing: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Apply filters and search
  const filteredAndSortedListings = useMemo(() => {
    let filtered = [...listings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.assetName.toLowerCase().includes(query) ||
        l.assetType.toLowerCase().includes(query) ||
        l.seller.toLowerCase().includes(query)
      );
    }

    if (filterAssetType !== 'all') {
      filtered = filtered.filter(l => 
        l.assetType.toLowerCase() === filterAssetType.toLowerCase()
      );
    }

    if (filterOwnership === 'partial') {
      filtered = filtered.filter(l => l.isPartialSale);
    } else if (filterOwnership === 'full') {
      filtered = filtered.filter(l => !l.isPartialSale);
    }

    if (filterModel === 'weighted') {
      filtered = filtered.filter(l => l.isWeighted);
    } else if (filterModel === 'fixed') {
      filtered = filtered.filter(l => !l.isWeighted);
    }

    if (showMyListings && address) {
      filtered = filtered.filter(l => 
        l.seller.toLowerCase() === address.toLowerCase()
      );
    }

    if (priceRange.min) {
      filtered = filtered.filter(l => l.priceNumber >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(l => l.priceNumber <= parseFloat(priceRange.max));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'price-low':
          return a.priceNumber - b.priceNumber;
        case 'price-high':
          return b.priceNumber - a.priceNumber;
        case 'ownership-high':
          return b.ownershipPercent - a.ownershipPercent;
        case 'ownership-low':
          return a.ownershipPercent - b.ownershipPercent;
        default:
          return 0;
      }
    });

    return filtered;
  }, [listings, searchQuery, filterAssetType, filterOwnership, filterModel, showMyListings, priceRange, sortBy, address]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedListings.length / listingsPerPage);
  const startIndex = (currentPage - 1) * listingsPerPage;
  const endIndex = startIndex + listingsPerPage;
  const currentListings = filteredAndSortedListings.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAssetType, filterOwnership, filterModel, showMyListings, priceRange, sortBy]);

  const assetTypes = useMemo(() => 
    ['all', ...new Set(listings.map(l => l.assetType))],
    [listings]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setFilterAssetType('all');
    setFilterOwnership('all');
    setFilterModel('all');
    setShowMyListings(false);
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAssetType !== 'all') count++;
    if (filterOwnership !== 'all') count++;
    if (filterModel !== 'all') count++;
    if (showMyListings) count++;
    if (priceRange.min || priceRange.max) count++;
    return count;
  }, [searchQuery, filterAssetType, filterOwnership, filterModel, showMyListings, priceRange]);

  const totalVolume = useMemo(() => 
    listings.reduce((sum, l) => sum + parseFloat(l.price), 0).toFixed(0),
    [listings]
  );

  const uniqueAssets = useMemo(() => 
    new Set(listings.map(l => l.assetId)).size,
    [listings]
  );

  const averagePrice = useMemo(() => 
    listings.length > 0 ? (parseFloat(totalVolume) / listings.length).toFixed(2) : '0',
    [listings, totalVolume]
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light text-sm">Please connect your wallet to view the marketplace</p>
        </div>
      </div>
    );
  }

  if (loading || checkingLimits) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1920px] mx-auto">
        {/* Premium Header with Stats */}
        <div className="bg-gradient-to-b from-neutral-950 to-black border-b border-neutral-900">
          <div className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">P2P Marketplace</h1>
              <p className="text-sm sm:text-base text-neutral-500">Trade verified positions directly with other users</p>
            </div>

            {/* Premium Stats Cards - 2x2 on mobile, CENTERED TEXT */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
  <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Active</p>
      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 text-center sm:text-left">{listings.length}</p>
    <p className="text-[8px] sm:text-xs text-green-500 text-center sm:text-left">+12%</p>
  </div>

  <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Volume</p>
      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 truncate text-center sm:text-left">{totalVolume}</p>
    <p className="text-[8px] sm:text-xs text-neutral-500 text-center sm:text-left">OPN</p>
  </div>

  <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Assets</p>
      <Gem className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 text-center sm:text-left">{uniqueAssets}</p>
    <p className="text-[8px] sm:text-xs text-blue-500 text-center sm:text-left">Verified</p>
  </div>

  <div className="bg-black/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-2.5 sm:p-6 min-w-0">
    <div className="flex items-start justify-between mb-1.5">
      <p className="text-[8px] sm:text-xs text-neutral-600 uppercase tracking-wider leading-none">Avg</p>
      <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-600 flex-shrink-0" />
    </div>
    <p className="text-2xl sm:text-2xl font-light text-white mb-0.5 truncate text-center sm:text-left">{averagePrice}</p>
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
                  placeholder="Search..."
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
                {/* Asset Type */}
                <select
                  value={filterAssetType}
                  onChange={(e) => setFilterAssetType(e.target.value)}
                  className="w-[48%] sm:w-auto sm:min-w-[140px] px-3 sm:px-4 py-2 sm:py-3 bg-black border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="all">All Types</option>
                  {assetTypes.slice(1).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                {/* Sort - SHORTENED OPTIONS */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-[48%] sm:w-auto sm:min-w-[140px] px-3 sm:px-4 py-2 sm:py-3 bg-black border border-neutral-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="newest">Recent</option>
                  <option value="price-low">$ Low-High</option>
                  <option value="price-high">$ High-Low</option>
                  <option value="ownership-high">% High-Low</option>
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

                {/* More Filters */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 border rounded-xl transition-all flex items-center gap-2 text-xs sm:text-sm ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-white text-blue-600 text-[10px] font-bold rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <select
                    value={filterOwnership}
                    onChange={(e) => setFilterOwnership(e.target.value)}
                    className="px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm"
                  >
                    <option value="all">All Sales</option>
                    <option value="partial">Partial Only</option>
                    <option value="full">Full Position</option>
                  </select>

                  <select
                    value={filterModel}
                    onChange={(e) => setFilterModel(e.target.value)}
                    className="px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm"
                  >
                    <option value="all">All Models</option>
                    <option value="weighted">Weighted</option>
                    <option value="fixed">Fixed</option>
                  </select>

                  <button
                    onClick={() => setShowMyListings(!showMyListings)}
                    className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                      showMyListings
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    My Listings
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-20 sm:w-24 px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm"
                    />
                    <span className="text-neutral-600">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-20 sm:w-24 px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm"
                    />
                    <span className="text-sm text-neutral-500">OPN</span>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="px-3 sm:px-6 lg:px-8 py-2 sm:py-3 bg-black/50 border-b border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-neutral-400 text-center sm:text-left">
            Found <span className="text-white font-medium">{filteredAndSortedListings.length}</span> listings
            {activeFilterCount > 0 && <span className="hidden sm:inline"> matching your criteria</span>}
          </p>
          
          {currentPage > 1 && (
            <p className="text-xs sm:text-sm text-neutral-500">Page {currentPage} of {totalPages}</p>
          )}
        </div>

        {/* Main Content */}
        <div className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          {filteredAndSortedListings.length === 0 ? (
            <div className="text-center py-20 sm:py-32 px-4">
              <div className="inline-flex p-4 sm:p-6 bg-neutral-900/50 rounded-full mb-4 sm:mb-6">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-white mb-2">No listings found</h3>
              <p className="text-sm sm:text-base text-neutral-500 mb-6 sm:mb-8 max-w-md mx-auto">
                {activeFilterCount > 0 
                  ? 'Try adjusting your filters to see more results' 
                  : 'Be the first to list an asset on the P2P marketplace'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-blue-600 text-white text-sm sm:text-base rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View - PREMIUM CARDS
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {currentListings.map((listing) => {
                const { canPurchase, reason } = canUserPurchase(listing);
                const isMyListing = listing.seller.toLowerCase() === address?.toLowerCase();
                
                return (
                  <div
                    key={listing.listingId}
                    className="group relative bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 transition-all cursor-pointer"
                    onClick={() => setSelectedListing(listing)}
                  >
                    {/* Image Section */}
                    <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950">
                      {listing.assetImageUrl ? (
                        <img
                          src={listing.assetImageUrl}
                          alt={listing.assetName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-700" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                      
                      {/* Badges */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                        <div className="flex flex-col gap-1 max-w-[65%]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] rounded-md w-fit">
                            <Users className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">P2P</span>
                          </span>
                          {listing.isWeighted && (
                            <span className="px-2 py-0.5 bg-purple-500/80 backdrop-blur-sm text-white text-[10px] rounded-md w-fit">
                              Weighted
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 items-end">
                          {isMyListing && (
                            <span className="px-2 py-0.5 bg-green-500/80 backdrop-blur-sm text-white text-[10px] rounded-md">
                              Your Listing
                            </span>
                          )}
                          {listing.isPartialSale && (
                            <span className="px-2 py-0.5 bg-blue-600/80 backdrop-blur-sm text-white text-[10px] rounded-md">
                              Partial
                            </span>
                          )}
                          {!canPurchase && !isMyListing && (
                            <span className="px-2 py-0.5 bg-yellow-500/80 backdrop-blur-sm text-white text-[10px] rounded-md">
                              Limit Reached
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ownership Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${Math.min(listing.ownershipPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5">
                      <div className="mb-3 sm:mb-4">
                        <h3 className="font-medium text-white text-base sm:text-lg line-clamp-1 mb-1">
                          {listing.assetName}
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-400 line-clamp-2">
                          {listing.assetType} • {listing.displayPercentage} ownership
                        </p>
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        <div className="pb-2 sm:pb-3 border-b border-neutral-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-neutral-400">List Price</span>
                            <div className="text-right">
                              <p className="text-base sm:text-lg font-semibold text-white">{listing.price} OPN</p>
                              <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD(listing.price)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-neutral-400">Listed</span>
                          <span className="text-xs sm:text-sm text-white">
                            {new Date(listing.createdAt * 1000).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-neutral-400">Seller</span>
                          <span className="text-xs sm:text-sm font-mono text-neutral-300">
                            {listing.seller.slice(0, 4)}...{listing.seller.slice(-4)}
                          </span>
                        </div>

                        {/* Buy Button with Limit Check */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedListing(listing);
                          }}
                          disabled={!canPurchase && !isMyListing}
                          className={`w-full py-2.5 sm:py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mt-3 sm:mt-4 text-sm ${
                            isMyListing
                              ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                              : !canPurchase
                              ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                          }`}
                        >
                          {isMyListing ? (
                            <>
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              View Listing
                            </>
                          ) : !canPurchase ? (
                            <>
                              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              Limit Reached
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                              Buy Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-3 sm:space-y-4">
              {currentListings.map((listing) => {
                const { canPurchase, reason } = canUserPurchase(listing);
                const isMyListing = listing.seller.toLowerCase() === address?.toLowerCase();
                
                return (
                  <div
                    key={listing.listingId}
                    className="group bg-gradient-to-r from-neutral-900/50 to-black border border-neutral-800 rounded-xl p-4 sm:p-6 hover:border-neutral-700 transition-all cursor-pointer"
                    onClick={() => setSelectedListing(listing)}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                      <div className="w-full sm:w-20 h-20 sm:h-20 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl overflow-hidden flex-shrink-0">
                        {listing.assetImageUrl ? (
                          <img
                            src={listing.assetImageUrl}
                            alt={listing.assetName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-700" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-3">
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{listing.assetType}</p>
                          <h4 className="font-medium text-white text-base sm:text-lg">{listing.assetName}</h4>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {listing.isWeighted && (
                              <span className="text-xs text-purple-400">Weighted</span>
                            )}
                            {listing.isPartialSale && (
                              <span className="text-xs text-blue-400">Partial Sale</span>
                            )}
                            {isMyListing && (
                              <span className="text-xs text-green-400">Your Listing</span>
                            )}
                            {!canPurchase && !isMyListing && (
                              <span className="text-xs text-yellow-400">⚠ Limit Reached</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Ownership</p>
                            <p className="text-base sm:text-xl font-medium text-white">{listing.displayPercentage}</p>
                            {!listing.isWeighted && (
                              <p className="text-xs text-neutral-500">{listing.displayAmount}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-neutral-500 mb-1">Total Price</p>
                            <p className="text-xl sm:text-2xl font-semibold text-white">{listing.price} OPN</p>
                            <p className="text-xs text-neutral-500">≈ ${convertToUSD(listing.price)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-shrink-0">
                        <div className="w-10 h-10 bg-neutral-800 group-hover:bg-neutral-700 rounded-xl flex items-center justify-center transition-colors">
                          <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-neutral-400 text-center sm:text-left">
                Showing <span className="text-white font-medium">{startIndex + 1}-{Math.min(endIndex, filteredAndSortedListings.length)}</span> of <span className="text-white font-medium">{filteredAndSortedListings.length}</span> listings
              </p>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                    currentPage === 1
                      ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  Prev
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-xl transition-all ${
                          currentPage === pageNum
                            ? 'bg-white text-black'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
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

      {/* Premium Purchase Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedListing(null)} />
          
          <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-light text-white">
                  {selectedListing.seller.toLowerCase() === address?.toLowerCase() 
                    ? 'Manage Your Listing' 
                    : 'Purchase Position'}
                </h2>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Asset Preview */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl overflow-hidden flex-shrink-0">
                  {selectedListing.assetImageUrl ? (
                    <img
                      src={selectedListing.assetImageUrl}
                      alt={selectedListing.assetName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-wider">{selectedListing.assetType}</p>
                  <h3 className="text-base sm:text-lg font-medium text-white mb-1 truncate">{selectedListing.assetName}</h3>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                    <span className="text-neutral-400 truncate">{selectedListing.displayAmount}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-blue-400 font-medium">{selectedListing.displayPercentage} ownership</span>
                  </div>
                </div>
              </div>

              {/* Limit Warning */}
              {(() => {
                const { canPurchase, reason } = canUserPurchase(selectedListing);
                return !canPurchase && selectedListing.seller.toLowerCase() !== address?.toLowerCase() && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 sm:mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-500 mb-1">Purchase Limit Reached</p>
                        <p className="text-xs text-neutral-400">{reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Price Breakdown Card */}
              <div className="bg-black/50 border border-neutral-800 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-neutral-500">Listing Price</span>
                    <span className="font-medium text-white">{selectedListing.price} OPN</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-neutral-500">Platform Fee (2%)</span>
                    <span className="text-neutral-500">{(parseFloat(selectedListing.price) * 0.02).toFixed(2)} OPN</span>
                  </div>
                  <div className="pt-2 sm:pt-3 border-t border-neutral-800 flex justify-between">
                    <span className="text-sm sm:text-base font-medium text-white">Total</span>
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-semibold text-white">
                        {(parseFloat(selectedListing.price) * 1.02).toFixed(2)} OPN
                      </p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${convertToUSD((parseFloat(selectedListing.price) * 1.02).toFixed(2))} USD</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-black/30 border border-neutral-800 rounded-xl mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-neutral-500 mb-0.5">Seller</p>
                    <p className="text-xs sm:text-sm font-mono text-white truncate">
                      {selectedListing.seller.slice(0, 6)}...{selectedListing.seller.slice(-4)}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors flex-shrink-0">
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-400" />
                </button>
              </div>

              {/* Action Button */}
              {selectedListing.seller.toLowerCase() === address?.toLowerCase() ? (
                <button
                  onClick={() => handleCancelListing(selectedListing)}
                  disabled={cancelling}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 text-sm sm:text-base"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Cancelling Listing...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      Cancel Listing
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(selectedListing)}
                  disabled={buying || !canUserPurchase(selectedListing).canPurchase}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-sm sm:text-base"
                >
                  {buying ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Processing Transaction...
                    </>
                  ) : !canUserPurchase(selectedListing).canPurchase ? (
                    <>
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Cannot Purchase - Limit Reached
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                      Purchase Now
                    </>
                  )}
                </button>
              )}

              {/* Security Note */}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-neutral-600">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Secured by smart contract</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <Verified className="w-3 h-3" />
                  <span>Verified asset</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecondaryMarketplace;