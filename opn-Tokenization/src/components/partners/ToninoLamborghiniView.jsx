// src/components/partners/ToninoLamborghiniView.jsx
// COMPLETE REDESIGN - Elegant minimalist style with gallery
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  ChevronRight, ChevronLeft, Plus, Minus, ArrowRight,
  Building2, Bed, MapPin, Calendar, Hash, X, Expand,
  Maximize, Shield, Users, Award, Check, Home
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { PARTNERS } from '../../config/partners';
import AssetDetailView from '../marketplace/AssetDetailView';

// Static Tonino Lamborghini Gallery Images
const TONINO_GALLERY = [
  {
    url: '/images/tonino/6.webp',
    thumb: '/images/tonino/6.webp',
    title: 'Outdoor Space',
    category: 'Outdoor'
  },
  {
    url: '/images/tonino/5.webp',
    thumb: '/images/tonino/5.webp',
    title: 'Executive Kitchen',
    category: 'Interior'
  },
  {
    url: '/images/tonino/1.webp',
    thumb: '/images/tonino/1.webp',
    title: 'Master Bedroom',
    category: 'Interior'
  },
  {
    url: '/images/tonino/10.webp',
    thumb: '/images/tonino/10.webp',
    title: 'Outdoor Terrace',
    category: 'Exterior'
  },
  {
    url: '/images/tonino/12.webp',
    thumb: '/images/tonino/12.webp',
    title: 'Luxury Bathroom',
    category: 'Interior'
  },
  {
    url: '/images/tonino/9.webp',
    thumb: '/images/tonino/9.webp',
    title: 'Master Bedroom',
    category: 'Interior'
  },
  {
    url: '/images/tonino/4.webp',
    thumb: '/images/tonino/4.webp',
    title: 'Dining Area',
    category: 'Interior'
  },
  {
    url: '/images/tonino/15.webp',
    thumb: '/images/tonino/15.webp',
    title: 'Home Office',
    category: 'Interior'
  },
  {
    url: '/images/tonino/0.webp',
    thumb: '/images/tonino/0.webp',
    title: 'Building View',
    category: 'Exterior'
  }
];

const ToninoLamborghiniView = () => {
  const partner = PARTNERS['tonino-lamborghini'];
  const { isConnected, address } = useWeb3();
  const { assetRegistry } = useContract();
  const { showNotification } = useApp();
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // Gallery states
  const [showGallery, setShowGallery] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [bedroomFilter, setBedroomFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const itemsPerPage = 6;

  useEffect(() => {
  const fetchPartnerAssets = async () => {
    if (!assetRegistry) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await assetRegistry.getActiveAssets(0, 100);
      const assetIds = result.ids || result[0] || [];
      
      if (!assetIds || assetIds.length === 0) {
        setAssets([]);
        setLoading(false);
        return;
      }
      
      const partnerAssets = [];

      for (let i = 0; i < assetIds.length; i++) {
        try {
          const assetId = assetIds[i];
          const asset = await assetRegistry.assets(assetId);
          
          let metadata = {};
          try {
            if (asset.metadataUrl) {
              metadata = JSON.parse(asset.metadataUrl);
            }
          } catch (e) {
            console.log(`Failed to parse metadata for asset ${assetId}:`, e);
          }
          
          if (metadata.partner === 'tonino-lamborghini') {
            const isWeighted = asset.model === 1;
            const displayValue = isWeighted 
              ? parseFloat(ethers.utils.formatEther(asset.totalValue))
              : parseFloat(ethers.utils.formatEther(asset.pricePerToken.mul(asset.totalSupply)));
            
            // Parse bedrooms as a number to ensure filtering works
            const bedroomCount = metadata.bedrooms ? parseInt(metadata.bedrooms, 10) : null;
            
            // 🔥 CRITICAL FIX: Calculate available amounts based on model
            let availableShares = 0;
            let availableWeight = 100;
            
            if (isWeighted) {
              // WEIGHTED MODEL: Calculate available percentage
              const soldWeightBN = asset.soldWeight || ethers.BigNumber.from(0);
              const soldWeightPercent = parseFloat(ethers.utils.formatUnits(soldWeightBN, 16));
              availableWeight = Math.max(0, 100 - soldWeightPercent);
              
              console.log(`Asset ${assetId} - Weighted:`, {
                soldWeight: soldWeightPercent.toFixed(3) + '%',
                availableWeight: availableWeight.toFixed(3) + '%'
              });
            } else {
              // FIXED MODEL: Calculate available shares
              const totalSupplyNum = parseFloat(asset.totalSupply.toString());
              const soldTokensNum = parseFloat(asset.soldTokens.toString());
              availableShares = totalSupplyNum - soldTokensNum;
              
              console.log(`Asset ${assetId} - Fixed:`, {
                totalSupply: totalSupplyNum,
                soldTokens: soldTokensNum,
                availableShares: availableShares
              });
            }
            
            partnerAssets.push({
              assetId: assetId.toString(),
              id: assetId.toString(),
              tokenId: assetId.toString(), // Add for PropertyModal compatibility
              assetName: asset.assetName,
              assetDescription: asset.assetDescription,
              assetImageUrl: asset.mainImageUrl,
              assetType: asset.assetType,
              model: asset.model,
              totalValue: asset.totalValue,
              pricePerToken: asset.pricePerToken,
              totalSupply: asset.totalSupply,
              soldTokens: asset.soldTokens,
              soldWeight: asset.soldWeight,
              
              // 🔥 CRITICAL: Add these calculated fields for PropertyModal
              availableShares: availableShares,
              availableWeight: availableWeight,
              
              // Add purchase limits from contract
              minPurchaseAmount: asset.minPurchaseAmount,
              maxPurchaseAmount: asset.maxPurchaseAmount,
              minPurchaseWeight: asset.minPurchaseWeight,
              maxPurchaseWeight: asset.maxPurchaseWeight,
              requiresPurchaserKYC: asset.requiresPurchaserKYC,
              
              isActive: asset.isActive,
              creator: asset.creator,
              name: asset.assetName,
              description: asset.assetDescription,
              imageUrl: asset.mainImageUrl,
              isWeighted: isWeighted,
              displayValue: displayValue,
              metadata: metadata,
              bedrooms: bedroomCount, // Now properly parsed as number
              squareFootage: metadata.squareFootage,
              floor: metadata.floor,
              view: metadata.view,
            });
            
            console.log('Added asset:', asset.assetName, 'Bedrooms:', bedroomCount, 'Type:', typeof bedroomCount);
          }
        } catch (error) {
          console.error(`Error fetching asset ${assetIds[i]}:`, error);
        }
      }

      console.log('Total Tonino assets loaded:', partnerAssets.length);
      console.log('Bedroom counts:', partnerAssets.map(a => ({ name: a.name, bedrooms: a.bedrooms })));
      
      setAssets(partnerAssets);
    } catch (error) {
      console.error('Error loading partner assets:', error);
      showNotification('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  fetchPartnerAssets();
}, [assetRegistry, showNotification]);

  // Filtered assets for hero carousel
  const filteredAssets = filter === 'all' 
    ? assets 
    : assets.filter(asset => asset.bedrooms === filter);

  // Filtered assets for grid with bedroom filter
  // Filtered assets for grid with bedroom filter
// Filtered assets for grid with bedroom filter
// Filtered assets for grid with bedroom filter
let gridFilteredAssets;

if (bedroomFilter === 'all') {
  gridFilteredAssets = assets;
} else {
  gridFilteredAssets = assets.filter(asset => {
    if (!asset.bedrooms) return false; // Skip assets without bedroom data
    
    if (bedroomFilter === 5) {
      // 5+ bedrooms
      return asset.bedrooms >= 5;
    } else {
      // Exact match
      return asset.bedrooms === bedroomFilter;
    }
  });
}

console.log('Filter applied:', bedroomFilter, 'Results:', gridFilteredAssets.length);

// Apply sorting
if (sortBy === 'price-low') {
  gridFilteredAssets = [...gridFilteredAssets].sort((a, b) => (a.displayValue || 0) - (b.displayValue || 0));
} else if (sortBy === 'price-high') {
  gridFilteredAssets = [...gridFilteredAssets].sort((a, b) => (b.displayValue || 0) - (a.displayValue || 0));
}

  // Pagination calculations
  const totalPages = Math.ceil(gridFilteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssets = gridFilteredAssets.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [bedroomFilter, sortBy]);

  // Auto-advance carousel
  useEffect(() => {
    if (filteredAssets.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % filteredAssets.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [filteredAssets.length]);

  // Gallery keyboard navigation
  useEffect(() => {
    if (!showGallery) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowGallery(false);
      if (e.key === 'ArrowLeft') setCurrentGalleryIndex(prev => (prev - 1 + TONINO_GALLERY.length) % TONINO_GALLERY.length);
      if (e.key === 'ArrowRight') setCurrentGalleryIndex(prev => (prev + 1) % TONINO_GALLERY.length);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGallery]);

  if (selectedAsset) {
    return <AssetDetailView asset={selectedAsset} onBack={() => setSelectedAsset(null)} />;
  }

  const currentAsset = filteredAssets[currentSlide];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section - Full Screen */}
      <section className="relative h-screen">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
            <div className="w-8 h-8 border-2 border-red-800 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
            <p className="text-zinc-600">No residences available</p>
          </div>
        ) : (
          <>
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={currentAsset?.imageUrl || '/placeholder.jpg'}
                alt={currentAsset?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/90" />
            </div>

            {/* Navigation */}
            <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end h-16 md:h-20 pt-4 md:pt-8 pr-4 md:pr-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight text-white tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] lg:tracking-[0.4em]">
                TONINO LAMBORGHINI
              </h1>
            </nav>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                  <div className="max-w-2xl">
                    <p className="text-red-500 text-xs md:text-sm mb-3 md:mb-4 uppercase tracking-[0.15em] md:tracking-[0.2em] font-light">
                      Luxury Residence
                    </p>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-extralight text-white mb-4 md:mb-6 leading-tight">
                      {currentAsset?.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 md:gap-8 text-white/90 text-xs md:text-sm font-light">
                      {currentAsset?.bedrooms && (
                        <span className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-red-500" />
                          {currentAsset.bedrooms}
                        </span>
                      )}
                      {currentAsset?.squareFootage && (
                        <span>{currentAsset.squareFootage.toLocaleString()} sq ft</span>
                      )}
                      {currentAsset?.floor && (
                        <span>Floor {currentAsset.floor}</span>
                      )}
                      {currentAsset?.view && (
                        <span>{currentAsset.view}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAsset(currentAsset)}
                    className="px-6 md:px-8 py-2.5 md:py-3 bg-white text-black hover:bg-red-500 hover:text-white transition-all duration-300 font-light tracking-wider text-xs md:text-sm w-full md:w-auto"
                  >
                    EXPLORE
                  </button>
                </div>
              </div>
            </div>

            {/* Carousel Controls */}
            {filteredAssets.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + filteredAssets.length) % filteredAssets.length)}
                  className="absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % filteredAssets.length)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Elegant Dots */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
                  {filteredAssets.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-0.5 transition-all duration-500 ${
                        index === currentSlide 
                          ? 'bg-red-500 w-12' 
                          : 'bg-zinc-700 w-6 hover:bg-zinc-600'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* About Section */}
      <section className="relative py-20 md:py-32 px-6 md:px-8 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-black to-neutral-950" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-24">
            <div className="text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-extralight mb-8 md:mb-10 text-white">Italian Excellence</h3>
              <div className="w-16 h-px bg-gradient-to-r from-red-500 to-red-400 mb-8 md:mb-10 mx-auto md:mx-0" />
              <p className="text-white/70 leading-loose mb-6 md:mb-8 font-light">
                Tonino Lamborghini residences embody the spirit of Italian luxury and performance. 
                Each property showcases meticulous craftsmanship, cutting-edge design, and the 
                unmistakable Lamborghini DNA.
              </p>
              <p className="text-white/70 leading-loose font-light">
                From hand-selected materials to bespoke finishes, every detail reflects the brand's 
                commitment to excellence. Our tokenized residences offer exclusive access to this 
                prestigious lifestyle.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 md:gap-12">
              <div className="group cursor-pointer text-center md:text-left">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-red-500 transition-colors">{assets.length}</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Residences</p>
              </div>
              <div className="group cursor-pointer text-center md:text-left">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-red-500 transition-colors">1%</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Min. Ownership</p>
              </div>
              <div className="group cursor-pointer text-center md:text-left">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-red-500 transition-colors">24/7</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Trading</p>
              </div>
              <div className="group cursor-pointer text-center md:text-left">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-red-500 transition-colors">OPN</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Blockchain</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Static Gallery Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-16 md:mb-20 text-white">
            Gallery
          </h3>
          <div className="w-16 h-px bg-gradient-to-r from-red-500 to-red-400 mx-auto mb-16 md:mb-20" />
          
          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TONINO_GALLERY.map((image, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentGalleryIndex(index);
                  setShowGallery(true);
                }}
                className="relative aspect-[4/3] overflow-hidden cursor-pointer group"
              >
                <img
                  src={image.thumb}
                  alt={image.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-500" />
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all p-4 text-center">
                  <p className="text-red-500 text-xs uppercase tracking-widest mb-2">{image.category}</p>
                  <p className="text-white text-sm font-light">{image.title}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <button
              onClick={() => {
                setShowGallery(true);
                setCurrentGalleryIndex(0);
              }}
              className="inline-flex items-center gap-3 px-8 py-3 border border-red-800 hover:border-red-500 text-white hover:text-red-400 transition-all font-light tracking-wider text-sm"
            >
              VIEW FULL GALLERY
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-16 md:mb-20 text-white">
            Signature Amenities
          </h3>
          <div className="w-16 h-px bg-gradient-to-r from-red-500 to-red-400 mx-auto mb-16 md:mb-20" />
          
          <div className="divide-y divide-red-900/20">
            {/* Residence Amenities */}
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'amenities' ? null : 'amenities')}
                className="w-full py-6 md:py-8 flex items-center justify-between hover:px-4 transition-all group"
              >
                <h4 className="text-xl md:text-2xl font-extralight text-white/90 group-hover:text-red-500 transition-colors">
                  Residence Amenities
                </h4>
                {expandedSection === 'amenities' ? (
                  <Minus className="w-5 h-5 text-red-500" />
                ) : (
                  <Plus className="w-5 h-5 text-white/40 group-hover:text-red-500 transition-colors" />
                )}
              </button>
              {expandedSection === 'amenities' && (
                <div className="pb-8 md:pb-12 grid md:grid-cols-2 gap-6 md:gap-8">
                  {partner.standardAmenities.map((amenity, i) => (
                    <p key={i} className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                      <span className="text-red-500 text-sm mt-0.5">◆</span>
                      {amenity}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Investment Features */}
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'investment' ? null : 'investment')}
                className="w-full py-6 md:py-8 flex items-center justify-between hover:px-4 transition-all group"
              >
                <h4 className="text-xl md:text-2xl font-extralight text-white/90 group-hover:text-red-500 transition-colors">
                  Investment Benefits
                </h4>
                {expandedSection === 'investment' ? (
                  <Minus className="w-5 h-5 text-red-500" />
                ) : (
                  <Plus className="w-5 h-5 text-white/40 group-hover:text-red-500 transition-colors" />
                )}
              </button>
              {expandedSection === 'investment' && (
                <div className="pb-8 md:pb-12 space-y-4 md:space-y-6">
                  <p className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                    <span className="text-red-500 text-sm mt-0.5">◆</span>
                    Blockchain-secured ownership through OPN Protocol
                  </p>
                  <p className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                    <span className="text-red-500 text-sm mt-0.5">◆</span>
                    Fractional ownership starting from 1% (minimum 1 wei)
                  </p>
                  <p className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                    <span className="text-red-500 text-sm mt-0.5">◆</span>
                    24/7 secondary market trading
                  </p>
                  <p className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                    <span className="text-red-500 text-sm mt-0.5">◆</span>
                    DAO governance for property decisions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Collection Overview - Assets Grid with Pagination */}
      <section className="relative py-20 md:py-32 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950/50 to-black" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-8">
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-8 md:mb-12 text-white">
            Available Residences
          </h3>
          <div className="w-16 h-px bg-gradient-to-r from-red-500 to-red-400 mx-auto mb-12 md:mb-16" />
          
          {/* Filter Controls */}
          <div className="mb-12 space-y-6">
            {/* Bedroom Filter */}
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-3 text-center">Filter by Bedrooms</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setBedroomFilter('all')}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    bedroomFilter === 'all'
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setBedroomFilter(1)}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    bedroomFilter === 1
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  1 BR
                </button>
                <button
                  onClick={() => setBedroomFilter(2)}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    bedroomFilter === 2
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  2 BR
                </button>
                <button
                  onClick={() => setBedroomFilter(3)}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    bedroomFilter === 3
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  3 BR
                </button>
                <button
                  onClick={() => setBedroomFilter(4)}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    bedroomFilter === 4
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  4 BR
                </button>
            
              </div>
            </div>

            {/* Sort by Price */}
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-3 text-center">Sort by Price</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setSortBy('default')}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    sortBy === 'default'
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  DEFAULT
                </button>
                <button
                  onClick={() => setSortBy('price-low')}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    sortBy === 'price-low'
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  PRICE: LOW TO HIGH
                </button>
                <button
                  onClick={() => setSortBy('price-high')}
                  className={`px-4 py-2 text-sm font-light tracking-wider transition-all ${
                    sortBy === 'price-high'
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  PRICE: HIGH TO LOW
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-red-800 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : gridFilteredAssets.length === 0 ? (
            <div className="text-center py-20">
              <Home className="w-16 h-16 text-red-900/30 mx-auto mb-4" />
              <p className="text-xl mb-2 text-white/60">No Residences Available</p>
              <p className="text-white/40">
                {bedroomFilter === 'all' 
                  ? 'Check back soon for new listings' 
                  : `No ${bedroomFilter === 5 ? '5+' : bedroomFilter} bedroom residences available`}
              </p>
            </div>
          ) : (
            <>
              {/* Assets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {currentAssets.map((asset) => (
                  <div 
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group cursor-pointer"
                  >
                    <div className="border border-red-900/20 bg-black hover:border-red-700/40 transition-all overflow-hidden">
                      {/* Image */}
                      <div className="relative h-64 bg-neutral-950 overflow-hidden">
                        <img
                          src={asset.imageUrl || '/placeholder.jpg'}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        
                        {/* Bedroom Badge */}
                        {asset.bedrooms && (
                          <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm border border-red-900/30">
                            <div className="flex items-center gap-2">
                              <Bed className="w-4 h-4 text-red-500/70" />
                              <span className="text-sm font-light text-white">{asset.bedrooms} BR</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-light text-white mb-4 group-hover:text-red-400 transition-colors">
                          {asset.name}
                        </h3>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {asset.squareFootage && (
                            <div>
                              <p className="text-xs text-red-500/60 uppercase tracking-wider mb-1">Size</p>
                              <p className="text-sm text-white/80 font-light">{asset.squareFootage.toLocaleString()} sq ft</p>
                            </div>
                          )}
                          {asset.floor && (
                            <div>
                              <p className="text-xs text-red-500/60 uppercase tracking-wider mb-1">Floor</p>
                              <p className="text-sm text-white/80 font-light">{asset.floor}</p>
                            </div>
                          )}
                          {asset.view && (
                            <div className="col-span-2">
                              <p className="text-xs text-red-500/60 uppercase tracking-wider mb-1">View</p>
                              <p className="text-sm text-white/80 font-light">{asset.view}</p>
                            </div>
                          )}
                        </div>

                        {/* Price Section */}
                        <div className="pt-6 border-t border-red-900/20">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-red-500/60 uppercase tracking-wider mb-2">Total Value</p>
                              <p className="text-2xl font-extralight text-white">
                                {asset.displayValue?.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </p>
                              <p className="text-xs text-white/50 mt-1">OPN</p>
                            </div>
                            
                            <button className="px-4 py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/30 hover:border-red-700/50 text-white text-sm font-light tracking-wider transition-all flex items-center gap-2">
                              EXPLORE
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 border transition-all ${
                      currentPage === 1
                        ? 'border-neutral-800 text-neutral-600 cursor-not-allowed'
                        : 'border-red-900/30 text-white hover:border-red-700/50 hover:bg-red-950/20'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 transition-all ${
                          currentPage === page
                            ? 'bg-red-500 text-white'
                            : 'bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 border transition-all ${
                      currentPage === totalPages
                        ? 'border-neutral-800 text-neutral-600 cursor-not-allowed'
                        : 'border-red-900/30 text-white hover:border-red-700/50 hover:bg-red-950/20'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Results Info */}
              <div className="text-center mt-6 text-sm text-white/40">
                Showing {startIndex + 1}-{Math.min(endIndex, gridFilteredAssets.length)} of {gridFilteredAssets.length} residences
              </div>
            </>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-32 bg-black border-t border-red-900/20">
        <div className="max-w-5xl mx-auto px-8 text-center">
          <h3 className="text-4xl font-extralight mb-10 text-white">Experience Tonino Lamborghini</h3>
          <div className="w-16 h-px bg-red-500 mx-auto mb-10" />
          <p className="text-zinc-400 max-w-2xl mx-auto mb-16 font-light leading-loose">
            Join an exclusive community of investors who appreciate the finest in Italian luxury. 
            Each tokenized residence represents a unique opportunity to own a piece of the 
            Lamborghini legacy.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-red-500 hover:text-white transition-all duration-300 font-light tracking-wider text-sm"
          >
            VIEW COLLECTION
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Full Screen Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extralight text-white">
                {currentGalleryIndex + 1} / {TONINO_GALLERY.length}
              </h3>
              <button
                onClick={() => setShowGallery(false)}
                className="p-2 hover:bg-white/10 transition-colors rounded-full"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Main Image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
            <img
              src={TONINO_GALLERY[currentGalleryIndex].url}
              alt={TONINO_GALLERY[currentGalleryIndex].title}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <div className="mt-6 text-center">
              <p className="text-red-500 text-sm uppercase tracking-widest mb-2">
                {TONINO_GALLERY[currentGalleryIndex].category}
              </p>
              <h4 className="text-white text-xl font-extralight">
                {TONINO_GALLERY[currentGalleryIndex].title}
              </h4>
            </div>
          </div>

          {/* Navigation */}
          <button
            onClick={() => setCurrentGalleryIndex((prev) => (prev - 1 + TONINO_GALLERY.length) % TONINO_GALLERY.length)}
            className="absolute left-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => setCurrentGalleryIndex((prev) => (prev + 1) % TONINO_GALLERY.length)}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Thumbnails */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
            <div className="flex gap-2 overflow-x-auto max-w-4xl mx-auto">
              {TONINO_GALLERY.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentGalleryIndex(index)}
                  className={`relative flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-all ${
                    index === currentGalleryIndex 
                      ? 'border-red-500' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image.thumb}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToninoLamborghiniView;