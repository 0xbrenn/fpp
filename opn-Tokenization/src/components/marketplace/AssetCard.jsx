// src/components/marketplace/AssetCard.jsx
// FINAL - Clean images in list view, badges on images in grid view - UPDATED STYLING
import React from 'react';
import { Shield, TrendingUp, CheckCircle, ArrowRight, Sparkles, BarChart3 } from 'lucide-react';
import { ethers } from 'ethers';

const AssetCard = ({ asset, onBuyClick, viewMode = 'grid' }) => {
  const isWeighted = asset.model === 1;
  
  // OPN to USD conversion
  const OPN_TO_USD = 0.05;
  const convertToUSD = (opnAmount) => {
    const amount = parseFloat(opnAmount) * OPN_TO_USD;
    return amount.toFixed(2);
  };
  
  // Calculate availability
  const availability = (() => {
    if (isWeighted) {
      const availablePercent = asset.availablePercentage || 0;
      const soldPercent = asset.soldPercentage || 0;
      
      return {
        available: availablePercent.toFixed(2) + '%',
        sold: soldPercent.toFixed(2) + '%',
        soldNumber: soldPercent,
        availableNumber: availablePercent
      };
    } else {
      // FIXED MODEL
      const available = asset.availableShares 
        ? parseFloat(ethers.utils.formatUnits(asset.availableShares, 0))
        : 0;
      const total = asset.totalSupply 
        ? parseFloat(ethers.utils.formatUnits(asset.totalSupply, 0))
        : 0;
      const sold = total - available;
      const soldPercent = total > 0 ? (sold / total) * 100 : 0;
      const availablePercent = total > 0 ? (available / total) * 100 : 0;
      
      return {
        available: available.toLocaleString() + ' shares',
        sold: soldPercent.toFixed(2) + '%',
        soldNumber: soldPercent,
        availableNumber: availablePercent
      };
    }
  })();

  // Format prices
  const pricing = (() => {
    if (isWeighted) {
      const totalValue = asset.totalValue 
        ? parseFloat(ethers.utils.formatEther(asset.totalValue))
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
      const pricePerShare = asset.pricePerShare 
        ? parseFloat(ethers.utils.formatEther(asset.pricePerShare))
        : 0;
      const totalValue = asset.totalSupply && asset.pricePerShare
        ? parseFloat(ethers.utils.formatEther(asset.totalSupply.mul(asset.pricePerShare)))
        : 0;
      
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

  const handleCardClick = () => {
    if (!isAvailable) return; // ✅ Don't allow clicks on sold-out assets
    console.log('Card clicked, asset:', asset);
    onBuyClick(asset);
  };

  if (viewMode === 'list') {
    // Premium List View - Clean image, badges below description
    return (
      <div 
        onClick={handleCardClick}
        className={`group bg-gradient-to-r from-neutral-900/50 to-black border border-neutral-800 rounded-xl p-4 sm:p-6 transition-all ${
          isAvailable 
            ? 'hover:border-neutral-700 cursor-pointer' 
            : 'opacity-60 cursor-not-allowed'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Image - CLEAN, no badges */}
          <div className="w-full sm:w-48 h-32 sm:h-32 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl overflow-hidden flex-shrink-0 relative">
            {asset.assetImageUrl ? (
              <img
                src={asset.assetImageUrl}
                alt={asset.assetName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : null}
            {!asset.assetImageUrl && (
              <div className="w-full h-full flex items-center justify-center">
                <Shield className="w-12 h-12 text-neutral-700" />
              </div>
            )}
            
            {/* SOLD OUT Overlay Badge - ONLY for sold out */}
            {!isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-lg">
                  <p className="text-white font-bold text-sm tracking-wider">SOLD OUT</p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 w-full space-y-3">
            {/* Asset Info */}
            <div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-1">
                {asset.assetName || 'Unnamed Asset'}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 line-clamp-2 mb-2">
                {asset.assetDescription || 'Premium tokenized asset'}
              </p>
              
              {/* Badges - Below description - UPDATED STYLING */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                <span className="px-2 py-1 bg-neutral-800 text-white text-[10px] sm:text-xs rounded-lg">
                  {asset.assetType}
                </span>
                <span className="px-2 py-1 bg-green-600/20 text-green-400 text-[10px] sm:text-xs rounded-lg flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Verified
                </span>
                {isWeighted ? (
                  <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-[10px] sm:text-xs rounded-lg">
                    Weighted
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-[10px] sm:text-xs rounded-lg">
                    Fixed
                  </span>
                )}
              </div>
            </div>

            {/* Stats - Grid on mobile, flex on desktop */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-wider mb-1">{pricing.label1}</p>
                <p className="text-base sm:text-xl font-light text-white">{pricing.value1} OPN</p>
                <p className="text-[10px] sm:text-xs text-neutral-500">≈ ${pricing.usd1}</p>
              </div>
              
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-wider mb-1">Available</p>
                <p className={`text-base sm:text-xl font-light ${isAvailable ? 'text-white' : 'text-red-400'}`}>
                  {availability.available}
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-500">Sold: {availability.sold}</p>
              </div>
            </div>

            {/* Action - Full width on mobile */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
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
        {asset.assetImageUrl ? (
          <img
            src={asset.assetImageUrl}
            alt={asset.assetName}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isAvailable ? 'group-hover:scale-110' : ''
            }`}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
        {!asset.assetImageUrl && (
          <div className="w-full h-full flex items-center justify-center">
            <Shield className="w-16 h-16 text-neutral-700" />
          </div>
        )}
        
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
            {asset.assetType}
          </span>
          <span className="px-3 py-1 bg-green-600/80 backdrop-blur-sm text-white text-xs rounded-lg flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        </div>
        
        {/* Model Type Badge */}
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
            {asset.assetName || 'Unnamed Asset'}
          </h3>
          <p className="text-sm text-neutral-400 line-clamp-2">
            {asset.assetDescription || 'Premium tokenized asset'}
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

          {/* Action Button - Just visual, card handles the click */}
          <div
            className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mt-4 ${
              isAvailable
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 group-hover:from-blue-700 group-hover:to-blue-800 text-white'
                : 'bg-neutral-800 text-neutral-500'
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

export default AssetCard;