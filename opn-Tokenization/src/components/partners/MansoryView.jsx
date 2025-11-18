// src/components/partners/MansoryView.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  Building2, MapPin, Bed, Maximize, TrendingUp, Car,
  ShoppingCart, Loader2, ExternalLink, ArrowRight,
  Check, Star, Crown, Zap, Award
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { PARTNERS } from '../../config/partners';
import AssetDetailView from '../marketplace/AssetDetailView';

const MansoryView = () => {
  const partner = PARTNERS['mansory'];
  const { isConnected, address } = useWeb3();
  const { assetRegistry } = useContract();
  const { showNotification } = useApp();
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // all, apartment, vehicle
  const [filter, setFilter] = useState('all'); // Bedroom filter for apartments

  // Fetch Mansory assets
  useEffect(() => {
    const fetchPartnerAssets = async () => {
      if (!assetRegistry) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Use getActiveAssets instead of assetCounter
        const result = await assetRegistry.getActiveAssets(0, 100);
        const assetIds = result.ids || result[0] || [];
        
        if (!assetIds || assetIds.length === 0) {
          console.log('No assets found');
          setAssets([]);
          setLoading(false);
          return;
        }
        
        const partnerAssets = [];

        for (let i = 0; i < assetIds.length; i++) {
          try {
            const assetId = assetIds[i];
            const asset = await assetRegistry.assets(assetId);
            
            // Parse metadata
            let metadata = {};
            try {
              if (asset.metadataUrl) {
                metadata = JSON.parse(asset.metadataUrl);
              }
            } catch (e) {
              console.log(`Failed to parse metadata for asset ${assetId}:`, e);
            }
            
            // Filter for Mansory assets
            if (metadata.partner === 'mansory') {
              const isWeighted = asset.model === 1;
              
              // Calculate display value
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
                
                // Formatted values for display
                name: asset.assetName,
                description: asset.assetDescription,
                imageUrl: asset.mainImageUrl,
                isWeighted: isWeighted,
                displayValue: displayValue, // ✅ Formatted for card display
                metadata: metadata,
                assetCategory: metadata.assetCategory,
                
                // Apartment fields
                bedrooms: metadata.bedrooms,
                squareFootage: metadata.squareFootage,
                floor: metadata.floor,
                view: metadata.view,
                
                // Vehicle fields
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
        console.log(`Found ${partnerAssets.length} Mansory assets`);
      } catch (error) {
        console.error('Error loading partner assets:', error);
        showNotification('Failed to load assets', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerAssets();
  }, [assetRegistry, showNotification]);

  // Filter assets by category and bedroom count
  const filteredAssets = assets.filter(asset => {
    if (activeCategory !== 'all' && asset.assetCategory !== activeCategory) {
      return false;
    }
    if (activeCategory === 'apartment' && filter !== 'all' && asset.bedrooms !== filter) {
      return false;
    }
    return true;
  });

  const apartmentCount = assets.filter(a => a.assetCategory === 'apartment').length;
  const vehicleCount = assets.filter(a => a.assetCategory === 'vehicle').length;

  // If asset is selected, show detail view (AFTER all hooks)
  if (selectedAsset) {
    return (
      <AssetDetailView 
        asset={selectedAsset} 
        onBack={() => setSelectedAsset(null)}
      />
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: partner.colors.background,
        color: partner.colors.text,
      }}
    >
      {/* Hero Section */}
      <div 
        className="relative overflow-hidden border-b"
        style={{
          borderColor: `${partner.colors.primary}30`,
          background: partner.theme.gradientOverlay,
        }}
      >
        {/* Carbon Fiber Background Pattern - Diagonal Weave */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, #000 0px, #111 3px, #000 6px),
              repeating-linear-gradient(-45deg, #000 0px, #111 3px, #000 6px)
            `,
            backgroundSize: '12px 12px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="h-1 w-12"
                  style={{ backgroundColor: partner.colors.primary }}
                />
                <span className="text-sm tracking-widest" style={{ color: partner.colors.accent }}>
                  EXCLUSIVE PARTNER
                </span>
              </div>

              <h1 
                className="text-5xl lg:text-6xl font-bold mb-6"
                style={{ fontFamily: partner.theme.luxuryFont }}
              >
                {partner.displayName}
              </h1>

              <p className="text-xl mb-4" style={{ color: partner.colors.primary }}>
                {partner.tagline}
              </p>

              <p className="text-lg mb-8" style={{ color: partner.colors.textMuted }}>
                {partner.description}
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: partner.colors.primary,
                    color: 'black',
                    fontWeight: '600',
                  }}
                >
                  Visit Website
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => {
                    const assetsSection = document.getElementById('assets-section');
                    assetsSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 border flex items-center gap-2 transition-all hover:bg-white/5"
                  style={{
                    borderColor: partner.colors.primary,
                    color: partner.colors.primary,
                  }}
                >
                  Browse Collection
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Building2, label: 'Residences', value: apartmentCount },
                { icon: Car, label: 'Vehicles', value: vehicleCount },
                { icon: Award, label: 'Craftsmanship', value: 'Elite' },
                { icon: Check, label: 'Verified Assets', value: 'All' },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="p-6 border backdrop-blur-sm"
                  style={{
                    borderColor: `${partner.colors.primary}30`,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <stat.icon className="w-8 h-8 mb-3" style={{ color: partner.colors.primary }} />
                  <p className="text-sm mb-1" style={{ color: partner.colors.textMuted }}>
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assets Section */}
      <div id="assets-section" className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        {/* Category Tabs */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold" style={{ fontFamily: partner.theme.luxuryFont }}>
              Mansory Collection
            </h2>
            <span className="text-sm" style={{ color: partner.colors.textMuted }}>
              {filteredAssets.length} {filteredAssets.length === 1 ? 'Asset' : 'Assets'}
            </span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => {
                setActiveCategory('all');
                setFilter('all');
              }}
              className={`px-6 py-3 border transition-all flex items-center gap-2 ${
                activeCategory === 'all' ? 'border-current' : 'border-neutral-800 hover:border-neutral-700'
              }`}
              style={{
                color: activeCategory === 'all' ? partner.colors.primary : partner.colors.textMuted,
                borderColor: activeCategory === 'all' ? partner.colors.primary : undefined,
              }}
            >
              All Collection
            </button>
            <button
              onClick={() => {
                setActiveCategory('apartment');
                setFilter('all');
              }}
              className={`px-6 py-3 border transition-all flex items-center gap-2 ${
                activeCategory === 'apartment' ? 'border-current' : 'border-neutral-800 hover:border-neutral-700'
              }`}
              style={{
                color: activeCategory === 'apartment' ? partner.colors.primary : partner.colors.textMuted,
                borderColor: activeCategory === 'apartment' ? partner.colors.primary : undefined,
              }}
            >
              <Building2 className="w-4 h-4" />
              Residences ({apartmentCount})
            </button>
            <button
              onClick={() => {
                setActiveCategory('vehicle');
                setFilter('all');
              }}
              className={`px-6 py-3 border transition-all flex items-center gap-2 ${
                activeCategory === 'vehicle' ? 'border-current' : 'border-neutral-800 hover:border-neutral-700'
              }`}
              style={{
                color: activeCategory === 'vehicle' ? partner.colors.primary : partner.colors.textMuted,
                borderColor: activeCategory === 'vehicle' ? partner.colors.primary : undefined,
              }}
            >
              <Car className="w-4 h-4" />
              Vehicles ({vehicleCount})
            </button>
          </div>

          {/* Bedroom Filter (only show for apartments) */}
          {activeCategory === 'apartment' && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 border transition-all ${
                  filter === 'all' ? 'border-current' : 'border-neutral-800 hover:border-neutral-700'
                }`}
                style={{
                  color: filter === 'all' ? partner.colors.primary : partner.colors.textMuted,
                  borderColor: filter === 'all' ? partner.colors.primary : undefined,
                }}
              >
                All Sizes
              </button>
              {partner.apartmentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-4 py-2 border transition-all ${
                    filter === type.value ? 'border-current' : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                  style={{
                    color: filter === type.value ? partner.colors.primary : partner.colors.textMuted,
                    borderColor: filter === type.value ? partner.colors.primary : undefined,
                  }}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: partner.colors.primary }} />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-20">
            <Crown className="w-16 h-16 mx-auto mb-4" style={{ color: partner.colors.primary + '40' }} />
            <h3 className="text-xl mb-2">No Assets Available</h3>
            <p style={{ color: partner.colors.textMuted }}>
              Check back soon for new exclusive additions
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <AssetCard 
                key={asset.id} 
                asset={asset} 
                partner={partner}
                onSelect={() => setSelectedAsset(asset)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div 
        className="border-t py-16"
        style={{ borderColor: `${partner.colors.primary}30` }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Apartment Amenities */}
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ fontFamily: partner.theme.luxuryFont }}>
                <Building2 className="w-6 h-6" style={{ color: partner.colors.primary }} />
                Residence Features
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {partner.standardAmenities.map((amenity, index) => (
                  <div
                    key={index}
                    className="p-4 border backdrop-blur-sm flex items-center gap-3"
                    style={{
                      borderColor: `${partner.colors.primary}20`,
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: partner.colors.primary }} />
                    <p className="text-sm">{amenity}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Features */}
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ fontFamily: partner.theme.luxuryFont }}>
                <Car className="w-6 h-6" style={{ color: partner.colors.primary }} />
                Vehicle Features
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {partner.vehicleFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 border backdrop-blur-sm flex items-center gap-3"
                    style={{
                      borderColor: `${partner.colors.primary}20`,
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: partner.colors.primary }} />
                    <p className="text-sm">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Asset Card Component
const AssetCard = ({ asset, partner, onSelect }) => {
  const isVehicle = asset.assetCategory === 'vehicle';

  return (
    <div
      className="border overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
      style={{ borderColor: `${partner.colors.primary}30` }}
      onClick={() => onSelect(asset)}
    >
      {/* Image */}
      <div className="relative h-48 bg-neutral-900 overflow-hidden">
        <img
          src={asset.imageUrl || (isVehicle ? '/placeholder-vehicle.jpg' : '/placeholder-property.jpg')}
          alt={asset.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div 
          className="absolute top-3 right-3 px-3 py-1 text-xs font-medium backdrop-blur-sm flex items-center gap-1"
          style={{
            backgroundColor: `${partner.colors.primary}E6`,
            color: 'black',
            fontWeight: '600',
          }}
        >
          {isVehicle ? (
            <>
              <Car className="w-3 h-3" />
              {asset.vehicleCategory || 'Vehicle'}
            </>
          ) : (
            <>
              <Bed className="w-3 h-3" />
              {asset.bedrooms}
            </>
          )}
        </div>
        {asset.productionNumber && (
          <div 
            className="absolute bottom-3 left-3 px-3 py-1 text-xs backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: partner.colors.accent,
            }}
          >
            #{asset.productionNumber}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold mb-2">{asset.name}</h3>
        
        <div className="space-y-2 mb-4">
          {isVehicle ? (
            <>
              {asset.year && asset.make && asset.model && (
                <div className="flex items-center gap-2 text-sm" style={{ color: partner.colors.textMuted }}>
                  <Car className="w-4 h-4" />
                  {asset.year} {asset.make} {asset.model}
                </div>
              )}
            </>
          ) : (
            <>
              {asset.squareFootage && (
                <div className="flex items-center gap-2 text-sm" style={{ color: partner.colors.textMuted }}>
                  <Maximize className="w-4 h-4" />
                  {asset.squareFootage} sq ft
                </div>
              )}
              {asset.floor && (
                <div className="flex items-center gap-2 text-sm" style={{ color: partner.colors.textMuted }}>
                  <Building2 className="w-4 h-4" />
                  Floor {asset.floor}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: `${partner.colors.primary}20` }}>
          <div>
            <p className="text-xs mb-1" style={{ color: partner.colors.textMuted }}>Total Value</p>
            <p className="text-xl font-bold" style={{ color: partner.colors.primary }}>
              {asset.displayValue ? asset.displayValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'} OPN
            </p>
          </div>
          <button
            className="px-4 py-2 flex items-center gap-2 transition-all"
            style={{
              backgroundColor: partner.colors.primary,
              color: 'black',
              fontWeight: '600',
            }}
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MansoryView;