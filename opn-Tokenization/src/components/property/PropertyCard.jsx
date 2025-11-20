// src/components/property/PropertyCard.jsx
// PREMIUM DARK THEME - Matching AssetCard structure exactly
import React from 'react';
import { Shield, CheckCircle, ArrowRight, Home } from 'lucide-react';
import { ethers } from 'ethers';

const PropertyCard = ({ property, onViewDetails, viewMode = 'grid' }) => {
  // OPN to USD conversion
  const OPN_TO_USD = 0.05;
  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };
  
  // Helper to safely convert any value to a number
  const toNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (ethers.BigNumber.isBigNumber(value)) {
      try {
        return parseFloat(ethers.utils.formatUnits(value, 0));
      } catch {
        return parseFloat(ethers.utils.formatEther(value));
      }
    }
    return parseFloat(value.toString());
  };
  
  // Detect model type
  const isWeighted = property.model === 1 || property.model === 'WEIGHTED';

  // Calculate availability
  const availability = (() => {
    if (isWeighted) {
      const availablePercent = property.availableWeight || 0;
      const soldPercent = property.soldPercentage || (100 - availablePercent);
      
      return {
        available: availablePercent.toFixed(2) + '%',
        sold: soldPercent.toFixed(2) + '%',
        soldNumber: soldPercent,
        availableNumber: availablePercent
      };
    } else {
      const totalShares = property.totalSupply ? toNumber(property.totalSupply) : toNumber(property.totalShares || 0);
      const availableShares = toNumber(property.availableShares || 0);
      const soldShares = Math.max(0, totalShares - availableShares);
      const soldPercent = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
      const availablePercent = totalShares > 0 ? (availableShares / totalShares) * 100 : 0;
      
      return {
        available: availableShares.toLocaleString() + ' shares',
        sold: soldPercent.toFixed(2) + '%',
        soldNumber: soldPercent,
        availableNumber: availablePercent
      };
    }
  })();

  // Format prices
  const pricing = (() => {
    if (isWeighted) {
      const totalValue = property.totalValue 
        ? (ethers.BigNumber.isBigNumber(property.totalValue)
            ? parseFloat(ethers.utils.formatEther(property.totalValue))
            : parseFloat(property.totalValue))
        : 0;
      const pricePerPercent = totalValue / 100;
      
      return {
        label1: 'Total Value',
        value1: totalValue.toFixed(0),
        usd1: convertToUSD(totalValue),
        label2: 'Price per 1%',
        value2: pricePerPercent.toFixed(2),
        usd2: convertToUSD(pricePerPercent)
      };
    } else {
      const pricePerShare = property.pricePerToken 
        ? (ethers.BigNumber.isBigNumber(property.pricePerToken)
            ? parseFloat(ethers.utils.formatEther(property.pricePerToken))
            : parseFloat(property.pricePerToken))
        : property.pricePerShare
          ? (ethers.BigNumber.isBigNumber(property.pricePerShare)
              ? parseFloat(ethers.utils.formatEther(property.pricePerShare))
              : parseFloat(property.pricePerShare))
          : 0;
      
      const totalShares = property.totalSupply ? toNumber(property.totalSupply) : toNumber(property.totalShares || 0);
      const totalValue = pricePerShare * totalShares;
      
      return {
        label1: 'Price per Share',
        value1: pricePerShare.toFixed(2),
        usd1: convertToUSD(pricePerShare),
        label2: 'Total Value',
        value2: totalValue.toFixed(0),
        usd2: convertToUSD(totalValue)
      };
    }
  })();

  const isAvailable = availability.availableNumber > 0;

  // Shorten asset type for display
  const getShortAssetType = (type) => {
    if (!type) return 'Property';
    const typeMap = {
      'Residential Property': 'Residential',
      'Commercial Property': 'Commercial',
      'Land': 'Land',
      'Real Estate': 'Real Estate'
    };
    return typeMap[type] || type.split(' ')[0];
  };

  const handleCardClick = () => {
    if (!isAvailable) return;
    onViewDetails(property);
  };

  if (viewMode === 'list') {
    // Premium List View - Clean image, badges below description
    return (
      <div 
        onClick={handleCardClick}
        className={`group bg-gradient-to-r from-neutral-900/50 to-black border border-neutral-800 rounded-xl p-6 transition-all ${
          isAvailable 
            ? 'hover:border-neutral-700 cursor-pointer' 
            : 'opacity-60 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center gap-6">
          {/* Image - CLEAN, no badges */}
          <div className="w-48 h-32 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl overflow-hidden flex-shrink-0 relative">
            <img 
              src={property.assetImageUrl || property.mainImageUrl} 
              alt={property.assetName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80';
              }}
            />
            
            {/* SOLD OUT Overlay Badge */}
            {!isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-lg">
                  <p className="text-white font-bold text-sm tracking-wider">SOLD OUT</p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
            {/* Asset Info */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium text-white mb-1">
                {property.assetName}
              </h3>
              <p className="text-sm text-neutral-400 line-clamp-2 mb-2">
                {property.assetDescription || 'Premium tokenized real estate'}
              </p>
              
              {/* Badges - Below description */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm border border-neutral-700 text-white text-xs rounded-lg">
                  <Home className="w-3 h-3" />
                  {getShortAssetType(property.assetType)}
                </span>
                <span className="px-2 py-1 bg-green-600/20 backdrop-blur-sm border border-green-600/30 text-green-400 text-xs rounded-lg flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
                {isWeighted ? (
                  <span className="px-2 py-1 bg-purple-600/20 backdrop-blur-sm border border-purple-600/30 text-purple-400 text-xs rounded-lg">
                    Weighted
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-600/20 backdrop-blur-sm border border-blue-600/30 text-blue-400 text-xs rounded-lg">
                    Fixed
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{pricing.label1}</p>
                <p className="text-xl font-light text-white">{pricing.value1} OPN</p>
                <p className="text-xs text-neutral-500">≈ ${pricing.usd1}</p>
              </div>
              
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Available</p>
                <p className={`text-xl font-light ${isAvailable ? 'text-white' : 'text-red-400'}`}>
                  {availability.available}
                </p>
                <p className="text-xs text-neutral-500">Ownership sold: {availability.sold}</p>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end">
              <div
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  isAvailable
                    ? 'bg-blue-600 group-hover:bg-blue-700 text-white transform group-hover:-translate-y-0.5'
                    : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                {isAvailable ? 'View Details' : 'Sold Out'}
                {isAvailable && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Premium Grid View - Badges ON image
  return (
    <div 
      onClick={handleCardClick}
      className={`group relative bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 rounded-xl overflow-hidden transition-all ${
        isAvailable 
          ? 'hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer' 
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Image Section */}
      <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950">
        <img 
          src={property.assetImageUrl || property.mainImageUrl} 
          alt={property.assetName}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isAvailable ? 'group-hover:scale-110' : ''
          }`}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80';
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
        
        {/* SOLD OUT Overlay Badge */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="px-6 py-3 bg-red-500/90 backdrop-blur-sm rounded-lg">
              <p className="text-white font-bold text-lg tracking-wider">SOLD OUT</p>
            </div>
          </div>
        )}
        
        {/* Badges on image */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-lg">
            {getShortAssetType(property.assetType)}
          </span>
          <span className="px-3 py-1 bg-green-600/80 backdrop-blur-sm text-white text-xs rounded-lg flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        </div>
        
        {/* Model Type Badge - top right */}
        <div className="absolute top-4 right-4">
          {isWeighted ? (
            <span className="px-3 py-1 bg-purple-600/80 backdrop-blur-sm text-white text-xs rounded-lg">
              Weighted
            </span>
          ) : (
            <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-sm text-white text-xs rounded-lg">
              Fixed
            </span>
          )}
        </div>

        {/* Availability Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
            style={{ width: `${availability.availableNumber}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-4">
          <h3 className="font-medium text-white text-lg line-clamp-1 mb-1">
            {property.assetName}
          </h3>
          <p className="text-sm text-neutral-400 line-clamp-2">
            {property.assetDescription || 'Premium tokenized real estate'}
          </p>
        </div>

        <div className="space-y-3">
          {/* Primary Metric */}
          <div className="pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">{pricing.label1}</span>
              <div className="text-right">
                <p className="text-lg font-semibold text-white">{pricing.value1} OPN</p>
                <p className="text-xs text-neutral-500">≈ ${pricing.usd1}</p>
              </div>
            </div>
          </div>

          {/* Secondary Metric */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Available</span>
            <span className={`text-sm font-medium ${isAvailable ? 'text-white' : 'text-red-400'}`}>
              {availability.available}
            </span>
          </div>

          {/* Ownership Sold */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Sold</span>
            <span className="text-sm text-white font-medium">{availability.sold}</span>
          </div>

          {/* Action Button */}
          <div
            className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mt-4 ${
              isAvailable
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 group-hover:from-blue-700 group-hover:to-blue-800 text-white'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {isAvailable ? (
              <>
                View Details
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            ) : (
              'Sold Out'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;