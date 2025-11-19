// src/components/partners/MansoryView.jsx
// ELEGANT VERSION WITH STATIC IMAGE GALLERY
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  ChevronRight, ChevronLeft, Plus, Minus, ArrowRight,
  Building2, Car, MapPin, Calendar, Hash,Bed, X, Expand, Grid
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { PARTNERS } from '../../config/partners';
import AssetDetailView from '../marketplace/AssetDetailView';

// Static Mansory Gallery Images
const MANSORY_GALLERY = {
  vehicles: [
  
  ],
  residences: [
   {
    url: '/images/mansory/6.avif',
    thumb: '/images/mansory/6.avif',
    title: 'Bedroom View',
    category: 'Interior'
  },
    {
    url: '/images/mansory/5.avif',
    thumb: '/images/mansory/5.avif',
    title: 'Common Living Area',
    category: 'Interior'
  },
  {
    url: '/images/mansory/1.avif',
    thumb: '/images/mansory/1.avif',
    title: 'Master Bedroom',
    category: 'Interior'
  },

  {
    url: '/images/mansory/11.avif',
    thumb: '/images/mansory/11.avif',
    title: 'Common Living Area',
    category: 'Interior'
  },
  {
    url: '/images/mansory/12.avif',
    thumb: '/images/mansory/12.avif',
    title: 'Outdoor Pool',
    category: 'Exterior'
  },
  {
    url: '/images/mansory/8.avif',
    thumb: '/images/mansory/8.avif',
    title: 'Storage Space',
    category: 'Interior'
  },
  {
    url: '/images/mansory/4.avif',
    thumb: '/images/mansory/4.avif',
    title: 'Common Living Area',
    category: 'Interior'
  },
  {
    url: '/images/mansory/2.avif',
    thumb: '/images/mansory/2.avif',
    title: 'Bathroom View',
    category: 'Interior'
  },
  {
    url: '/images/mansory/3.avif',
    thumb: '/images/mansory/3.avif',
    title: 'Kitchen Area',
    category: 'Interior'
  }
  ]
};

const MansoryView = () => {
  const partner = PARTNERS['mansory'];
  const { isConnected, address } = useWeb3();
  const { assetRegistry } = useContract();
  const { showNotification } = useApp();
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Gallery states
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [galleryFilter, setGalleryFilter] = useState('all'); // all, vehicles, residences

  // Get all gallery images based on filter
  const getFilteredGalleryImages = () => {
    if (galleryFilter === 'vehicles') return MANSORY_GALLERY.vehicles;
    if (galleryFilter === 'residences') return MANSORY_GALLERY.residences;
    return [...MANSORY_GALLERY.vehicles, ...MANSORY_GALLERY.residences];
  };

  // Open gallery with specific filter
  const openStaticGallery = (filter = 'all', startIndex = 0) => {
    setGalleryFilter(filter);
    const images = filter === 'vehicles' ? MANSORY_GALLERY.vehicles 
                 : filter === 'residences' ? MANSORY_GALLERY.residences
                 : [...MANSORY_GALLERY.vehicles, ...MANSORY_GALLERY.residences];
    setGalleryImages(images);
    setCurrentGalleryIndex(startIndex);
    setShowGallery(true);
  };

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
            
            if (metadata.partner === 'mansory') {
              const isWeighted = asset.model === 1;
              const displayValue = isWeighted 
                ? parseFloat(ethers.utils.formatEther(asset.totalValue))
                : parseFloat(ethers.utils.formatEther(asset.pricePerToken.mul(asset.totalSupply)));
              
              partnerAssets.push({
                assetId: assetId.toString(),
                id: assetId.toString(),
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
                isActive: asset.isActive,
                creator: asset.creator,
                name: asset.assetName,
                description: asset.assetDescription,
                imageUrl: asset.mainImageUrl,
                isWeighted: isWeighted,
                displayValue: displayValue,
                metadata: metadata,
                assetCategory: metadata.assetCategory,
                bedrooms: metadata.bedrooms,
                squareFootage: metadata.squareFootage,
                floor: metadata.floor,
                view: metadata.view,
                make: metadata.make,
                vehicleModel: metadata.model,
                year: metadata.year,
                vehicleCategory: metadata.vehicleCategory,
                productionNumber: metadata.productionNumber,
              });
            }
          } catch (error) {
            console.error(`Error fetching asset ${assetIds[i]}:`, error);
          }
        }

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

  const filteredAssets = assets.filter(asset => {
    if (activeCategory !== 'all' && asset.assetCategory !== activeCategory) return false;
    return true;
  });

  const apartmentCount = assets.filter(a => a.assetCategory === 'apartment').length;
  const vehicleCount = assets.filter(a => a.assetCategory === 'vehicle').length;
   const apartmentAssets = assets.filter(asset => asset.assetCategory === 'apartment');
  const vehicleAssets = assets.filter(asset => asset.assetCategory === 'vehicle');




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
      if (e.key === 'ArrowLeft') setCurrentGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
      if (e.key === 'ArrowRight') setCurrentGalleryIndex(prev => (prev + 1) % galleryImages.length);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGallery, galleryImages.length]);

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
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
            <p className="text-zinc-600">No assets available</p>
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
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
            </div>

            {/* Navigation */}
            <nav className="absolute top-0 left-0 right-0 z-20 p-4 md:p-8">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-extralight text-white tracking-[0.2em] md:tracking-[0.4em]">MANSORY</h1>
                <div className="flex items-center gap-4 md:gap-12 text-xs md:text-sm tracking-wider md:tracking-widest">
                  <button 
                    onClick={() => setActiveCategory('all')}
                    className={`transition-all font-light ${
                      activeCategory === 'all' 
                        ? 'text-white' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    ALL
                  </button>
                  <button 
                    onClick={() => setActiveCategory('apartment')}
                    className={`transition-all font-light ${
                      activeCategory === 'apartment' 
                        ? 'text-white' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    RESIDENCES
                  </button>
                  <button 
                    onClick={() => setActiveCategory('vehicle')}
                    className={`transition-all font-light ${
                      activeCategory === 'vehicle' 
                        ? 'text-white' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    VEHICLES
                  </button>
                  <button 
                    onClick={() => openStaticGallery('all')}
                    className="text-white/60 hover:text-white transition-all font-light flex items-center gap-2"
                  >
                    <Grid className="w-4 h-4" />
                    GALLERY
                  </button>
                </div>
              </div>
            </nav>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                  <div className="max-w-2xl">
                    <p className="text-yellow-500 text-xs md:text-sm mb-3 md:mb-4 uppercase tracking-[0.15em] md:tracking-[0.2em] font-light">
                      {currentAsset?.assetCategory === 'vehicle' ? 'Bespoke Vehicle' : 'Luxury Residence'}
                    </p>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-extralight text-white mb-4 md:mb-6 leading-tight">
                      {currentAsset?.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 md:gap-8 text-white/90 text-xs md:text-sm font-light">
                      {currentAsset?.assetCategory === 'vehicle' ? (
                        <>
                          {currentAsset?.year && <span>{currentAsset.year}</span>}
                          {currentAsset?.productionNumber && (
                            <span className="flex items-center gap-1 md:gap-2">
                              <Hash className="w-3 h-3 text-yellow-500" />
                              {currentAsset.productionNumber}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {currentAsset?.bedrooms && <span>{currentAsset.bedrooms} Bedrooms</span>}
                          {currentAsset?.squareFootage && <span>{currentAsset.squareFootage.toLocaleString()} sq ft</span>}
                          {currentAsset?.floor && <span>Floor {currentAsset.floor}</span>}
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAsset(currentAsset)}
                    className="px-6 md:px-8 py-2.5 md:py-3 bg-white text-black hover:bg-yellow-500 transition-all duration-300 font-light tracking-wider text-xs md:text-sm w-full md:w-auto"
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
                          ? 'bg-yellow-500 w-12' 
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
            <div>
              <h3 className="text-3xl md:text-4xl font-extralight mb-8 md:mb-10 text-white">The Art of Customization</h3>
              <div className="w-16 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 mb-8 md:mb-10" />
              <p className="text-white/70 leading-loose mb-6 md:mb-8 font-light">
                Mansory represents the pinnacle of luxury customization, transforming the world's most exclusive residences 
                and vehicles into bespoke masterpieces. Each asset in our collection embodies unparalleled craftsmanship 
                and attention to detail.
              </p>
              <p className="text-white/70 leading-loose font-light">
                From hand-selected materials to custom finishes, every Mansory creation is a testament to individuality 
                and excellence. Our tokenized assets offer unprecedented access to these ultra-luxury investments.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 md:gap-12">
              <div className="group cursor-pointer">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-yellow-500 transition-colors">{apartmentCount}</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Residences</p>
              </div>
              <div className="group cursor-pointer">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-yellow-500 transition-colors">{vehicleCount}</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Vehicles</p>
              </div>
              <div className="group cursor-pointer">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-yellow-500 transition-colors">24/7</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Trading</p>
              </div>
              <div className="group cursor-pointer">
                <p className="text-4xl md:text-5xl font-extralight mb-3 text-white group-hover:text-yellow-500 transition-colors">~0%</p>
                <p className="text-xs text-white/50 uppercase tracking-[0.2em]">Min. Ownership</p>
                <p className="text-[10px] text-white/30 mt-1">From 1 wei</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    

      {/* Static Gallery Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-16 md:mb-20 text-white">
            Mansory Gallery
          </h3>
          <div className="w-16 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 mx-auto mb-16 md:mb-20" />
          
          {/* Gallery Grid - Clean style like Tonino */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...MANSORY_GALLERY.vehicles, ...MANSORY_GALLERY.residences].slice(0, 9).map((image, index) => (
              <div
                key={index}
                onClick={() => {
                  setGalleryImages([...MANSORY_GALLERY.vehicles, ...MANSORY_GALLERY.residences]);
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
                  <p className="text-yellow-500 text-xs uppercase tracking-widest mb-2">{image.category}</p>
                  <p className="text-white text-sm font-light">{image.title}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <button
              onClick={() => {
                setGalleryImages([...MANSORY_GALLERY.vehicles, ...MANSORY_GALLERY.residences]);
                setShowGallery(true);
                setCurrentGalleryIndex(0);
              }}
              className="inline-flex items-center gap-3 px-8 py-3 border border-zinc-700 hover:border-yellow-500 text-white hover:text-yellow-400 transition-all font-light tracking-wider text-sm"
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
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-16 md:mb-20 text-white">Exclusive Features</h3>
          <div className="w-16 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 mx-auto mb-16 md:mb-20" />
          
          <div className="divide-y divide-zinc-800/50">
            {/* Residences */}
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'residences' ? null : 'residences')}
                className="w-full py-6 md:py-8 flex items-center justify-between hover:px-4 transition-all group"
              >
                <h4 className="text-xl md:text-2xl font-extralight text-white/90 group-hover:text-yellow-500 transition-colors">
                  Residence Features
                </h4>
                {expandedSection === 'residences' ? (
                  <Minus className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Plus className="w-5 h-5 text-white/40 group-hover:text-yellow-500 transition-colors" />
                )}
              </button>
              {expandedSection === 'residences' && (
                <div className="pb-8 md:pb-12 grid md:grid-cols-2 gap-6 md:gap-8">
                  {partner.standardAmenities.map((amenity, i) => (
                    <p key={i} className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                      <span className="text-yellow-500 text-sm mt-0.5">◆</span>
                      {amenity}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicles */}
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'vehicles' ? null : 'vehicles')}
                className="w-full py-6 md:py-8 flex items-center justify-between hover:px-4 transition-all group"
              >
                <h4 className="text-xl md:text-2xl font-extralight text-white/90 group-hover:text-yellow-500 transition-colors">
                  Vehicle Features
                </h4>
                {expandedSection === 'vehicles' ? (
                  <Minus className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Plus className="w-5 h-5 text-white/40 group-hover:text-yellow-500 transition-colors" />
                )}
              </button>
              {expandedSection === 'vehicles' && (
                <div className="pb-8 md:pb-12 grid md:grid-cols-2 gap-6 md:gap-8">
                  {partner.vehicleFeatures.map((feature, i) => (
                    <p key={i} className="text-white/60 hover:text-white/80 flex items-start gap-4 font-light transition-colors cursor-pointer">
                      <span className="text-yellow-500 text-sm mt-0.5">◆</span>
                      {feature}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Available Residences Section */}
      <section className="relative py-20 md:py-32 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950/50 to-black" />
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-8">
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-16 md:mb-20 text-white">
            Available Residences
          </h3>
          <div className="w-16 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 mx-auto mb-16 md:mb-20" />
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-600 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : apartmentAssets.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-yellow-500/20 mx-auto mb-4" />
              <p className="text-xl mb-2 text-white/60">No Residences Available</p>
              <p className="text-white/40">Check back soon for new Mansory listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apartmentAssets.map((asset) => (
                <div 
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="group cursor-pointer"
                >
                  <div className="border border-yellow-500/20 bg-black hover:border-yellow-400/40 transition-all overflow-hidden">
                    {/* Image */}
                    <div className="relative h-64 bg-neutral-950 overflow-hidden">
                      <img
                        src={asset.imageUrl || '/placeholder.jpg'}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      
                      {/* Bedroom Badge */}
                      {asset.bedrooms && (
                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm border border-yellow-500/30">
                          <div className="flex items-center gap-2">
                            <Bed className="w-4 h-4 text-yellow-500/70" />
                            <span className="text-sm font-light text-white">{asset.bedrooms}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-light text-white mb-4 group-hover:text-yellow-400 transition-colors">
                        {asset.name}
                      </h3>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {asset.squareFootage && (
                          <div>
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-1">Size</p>
                            <p className="text-sm text-white/80 font-light">{asset.squareFootage.toLocaleString()} sq ft</p>
                          </div>
                        )}
                        {asset.floor && (
                          <div>
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-1">Floor</p>
                            <p className="text-sm text-white/80 font-light">{asset.floor}</p>
                          </div>
                        )}
                        {asset.view && (
                          <div className="col-span-2">
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-1">View</p>
                            <p className="text-sm text-white/80 font-light">{asset.view}</p>
                          </div>
                        )}
                      </div>

                      {/* Price Section */}
                      <div className="pt-6 border-t border-yellow-500/20">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-2">Total Value</p>
                            <p className="text-2xl font-extralight text-white">
                              {asset.displayValue?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </p>
                            <p className="text-xs text-white/50 mt-1">OPN</p>
                          </div>
                          
                          <button className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-400/50 text-white text-sm font-light tracking-wider transition-all flex items-center gap-2">
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
          )}
        </div>
      </section>

      {/* Available Vehicles Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <h3 className="text-3xl md:text-4xl font-extralight text-center mb-16 md:mb-20 text-white">
            Available Vehicles
          </h3>
          <div className="w-16 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 mx-auto mb-16 md:mb-20" />
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-600 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : vehicleAssets.length === 0 ? (
            <div className="text-center py-20">
              <Car className="w-16 h-16 text-yellow-500/20 mx-auto mb-4" />
              <p className="text-xl mb-2 text-white/60">No Vehicles Available</p>
              <p className="text-white/40">Check back soon for new Mansory vehicles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicleAssets.map((asset) => (
                <div 
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="group cursor-pointer"
                >
                  <div className="border border-yellow-500/20 bg-black hover:border-yellow-400/40 transition-all overflow-hidden">
                    {/* Image */}
                    <div className="relative h-64 bg-neutral-950 overflow-hidden">
                      <img
                        src={asset.imageUrl || '/placeholder-vehicle.jpg'}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      
                      {/* Vehicle Category Badge */}
                      {asset.vehicleCategory && (
                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm border border-yellow-500/30">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-yellow-500/70" />
                            <span className="text-sm font-light text-white capitalize">{asset.vehicleCategory}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Production Number Badge */}
                      {asset.productionNumber && (
                        <div className="absolute top-4 left-4 px-3 py-1.5 bg-yellow-500/90 backdrop-blur-sm">
                          <span className="text-xs font-medium text-black">#{asset.productionNumber}</span>
                        </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-light text-white mb-4 group-hover:text-yellow-400 transition-colors">
                        {asset.name}
                      </h3>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {asset.year && (
                          <div>
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-1">Year</p>
                            <p className="text-sm text-white/80 font-light">{asset.year}</p>
                          </div>
                        )}
                        {asset.make && (
                          <div>
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-1">Make</p>
                            <p className="text-sm text-white/80 font-light">{asset.make}</p>
                          </div>
                        )}
                        {asset.vehicleModel && (
                          <div className="col-span-2">
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-1">Model</p>
                            <p className="text-sm text-white/80 font-light">{asset.vehicleModel}</p>
                          </div>
                        )}
                      </div>

                      {/* Price Section */}
                      <div className="pt-6 border-t border-yellow-500/20">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-yellow-500/60 uppercase tracking-wider mb-2">Total Value</p>
                            <p className="text-2xl font-extralight text-white">
                              {asset.displayValue?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </p>
                            <p className="text-xs text-white/50 mt-1">OPN</p>
                          </div>
                          
                          <button className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-400/50 text-white text-sm font-light tracking-wider transition-all flex items-center gap-2">
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
          )}
        </div>
      </section>

     
      {/* Contact Section */}
      <section className="py-32 bg-black border-t border-zinc-900">
        <div className="max-w-5xl mx-auto px-8 text-center">
          <h3 className="text-4xl font-extralight mb-10 text-white">Experience Mansory</h3>
          <div className="w-16 h-px bg-yellow-500 mx-auto mb-10" />
          <p className="text-zinc-400 max-w-2xl mx-auto mb-16 font-light leading-loose">
            Join an exclusive community of collectors and investors who appreciate the finest 
            in luxury customization. Each tokenized asset represents a unique opportunity to 
            own a piece of the Mansory legacy.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-yellow-500 hover:text-black transition-all duration-300 font-light tracking-wider text-sm"
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
              <div className="flex items-center gap-6">
                <h3 className="text-xl font-extralight text-white">
                  {currentGalleryIndex + 1} / {galleryImages.length}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setGalleryFilter('all');
                      setGalleryImages([...MANSORY_GALLERY.vehicles, ...MANSORY_GALLERY.residences]);
                      setCurrentGalleryIndex(0);
                    }}
                    className={`px-4 py-1 text-xs uppercase tracking-wider transition-all ${
                      galleryFilter === 'all' ? 'text-yellow-500' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setGalleryFilter('vehicles');
                      setGalleryImages(MANSORY_GALLERY.vehicles);
                      setCurrentGalleryIndex(0);
                    }}
                    className={`px-4 py-1 text-xs uppercase tracking-wider transition-all ${
                      galleryFilter === 'vehicles' ? 'text-yellow-500' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Vehicles
                  </button>
                  <button
                    onClick={() => {
                      setGalleryFilter('residences');
                      setGalleryImages(MANSORY_GALLERY.residences);
                      setCurrentGalleryIndex(0);
                    }}
                    className={`px-4 py-1 text-xs uppercase tracking-wider transition-all ${
                      galleryFilter === 'residences' ? 'text-yellow-500' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Residences
                  </button>
                </div>
              </div>
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
              src={galleryImages[currentGalleryIndex]?.url}
              alt={galleryImages[currentGalleryIndex]?.title}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <div className="mt-6 text-center">
              <p className="text-yellow-500 text-sm uppercase tracking-widest mb-2">
                {galleryImages[currentGalleryIndex]?.category}
              </p>
              <h4 className="text-white text-xl font-extralight">
                {galleryImages[currentGalleryIndex]?.title}
              </h4>
            </div>
          </div>

          {/* Navigation */}
          <button
            onClick={() => setCurrentGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
            className="absolute left-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => setCurrentGalleryIndex((prev) => (prev + 1) % galleryImages.length)}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Thumbnails */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
            <div className="flex gap-2 overflow-x-auto max-w-6xl mx-auto pb-2">
              {galleryImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentGalleryIndex(index)}
                  className={`relative flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-all ${
                    index === currentGalleryIndex 
                      ? 'border-yellow-500' 
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

export default MansoryView;