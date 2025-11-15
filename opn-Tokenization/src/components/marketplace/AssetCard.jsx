// src/components/marketplace/AssetCard.jsx
// FIXED VERSION - Supports both FIXED and WEIGHTED models
import React from 'react';
import { ethers } from 'ethers';
import { Shield, Activity, ArrowUpRight } from 'lucide-react';
import ProposalIndicator from '../dao/ProposalIndicator';

const AssetCard = ({ asset, onBuyClick }) => {
  // Detect model type
  const isWeighted = asset.model === 1 || asset.model === 'WEIGHTED';
  
  // Calculate stats based on model
  let stats;
  
  if (isWeighted) {
    // WEIGHTED MODEL
    let totalValue = 0;
    
    // Handle totalValue - could be BigNumber or already formatted
    if (asset.totalValue) {
      if (ethers.BigNumber.isBigNumber(asset.totalValue)) {
        totalValue = parseFloat(ethers.utils.formatEther(asset.totalValue));
      } else if (typeof asset.totalValue === 'string' || typeof asset.totalValue === 'number') {
        totalValue = parseFloat(asset.totalValue);
      }
    }
    
    const soldWeight = asset.soldWeight || 0;
    const availableWeight = asset.availableWeight || (10000 - soldWeight);
    const soldPercentage = ((soldWeight / 10000) * 100).toFixed(1);
    const availablePercentage = ((availableWeight / 10000) * 100).toFixed(2);
    
    stats = {
      label1: 'Total Value',
      value1: totalValue.toFixed(2),
      label2: 'Available',
      value2: availablePercentage + '%',
      soldPercentage: parseFloat(soldPercentage),
      ownershipPercentage: soldPercentage
    };
  } else {
    // FIXED MODEL
    let totalShares = 0;
    let availableShares = 0;
    let pricePerShare = 0;
    
    // Handle totalShares
    if (asset.totalShares) {
      if (ethers.BigNumber.isBigNumber(asset.totalShares)) {
        totalShares = parseFloat(ethers.utils.formatEther(asset.totalShares));
      } else {
        totalShares = parseFloat(asset.totalShares);
      }
    }
    
    // Handle availableShares
    if (asset.availableShares) {
      if (ethers.BigNumber.isBigNumber(asset.availableShares)) {
        availableShares = parseFloat(ethers.utils.formatEther(asset.availableShares));
      } else {
        availableShares = parseFloat(asset.availableShares);
      }
    }
    
    // Handle pricePerShare
    if (asset.pricePerShare) {
      if (ethers.BigNumber.isBigNumber(asset.pricePerShare)) {
        pricePerShare = parseFloat(ethers.utils.formatEther(asset.pricePerShare));
      } else {
        pricePerShare = parseFloat(asset.pricePerShare);
      }
    }
    
    const soldShares = totalShares - availableShares;
    const ownershipPercentage = totalShares > 0 
      ? ((soldShares / totalShares) * 100).toFixed(1) 
      : '0.0';
    const totalValue = (pricePerShare * totalShares).toFixed(2);
    
    stats = {
      label1: 'Price per Share',
      value1: pricePerShare.toFixed(2),
      label2: 'Total Value',
      value2: totalValue,
      totalShares: totalShares,
      availableShares: availableShares,
      soldPercentage: parseFloat(ownershipPercentage),
      ownershipPercentage: ownershipPercentage
    };
  }

  const activeProposals = asset.activeProposals || 0;

  // Format large numbers professionally
  const formatNumber = (num) => {
    const value = parseFloat(num || 0);
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    }
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className="group relative bg-black border border-neutral-900 rounded-sm overflow-hidden transition-all duration-500 hover:border-neutral-800">
      {/* Show indicator if there are proposals */}
      {activeProposals > 0 && (
        <ProposalIndicator
          proposalCount={activeProposals}
          onClick={() => {
            // Navigate to asset details to see proposals
            onBuyClick(asset);
          }}
        />
      )}
      
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
        <img 
          src={asset.assetImageUrl || asset.mainImageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'} 
          alt={asset.assetName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Asset Type Badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-xs font-normal text-white/80 rounded-sm">
            {asset.assetType || 'Asset'}
          </span>
        </div>
        
        {/* Verification Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-sm">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-xs font-light text-green-400">Verified</span>
        </div>
        
        {/* Model Badge */}
        <div className="absolute bottom-4 left-4">
          <span className={`px-2 py-1 text-xs font-light rounded-sm ${
            isWeighted 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {isWeighted ? 'Weighted' : 'Fixed'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
          {asset.assetName || 'Unnamed Asset'}
        </h3>
        
        {/* Description */}
        <p className="text-sm font-light text-neutral-500 mb-6 line-clamp-2">
          {asset.assetDescription || 'Premium Asset'}
        </p>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">{stats.label1}</p>
            <p className="text-sm font-normal text-white">{formatNumber(stats.value1)} OPN</p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">{stats.label2}</p>
            <p className="text-sm font-normal text-white">
              {isWeighted ? stats.value2 : `${formatNumber(stats.value2)} OPN`}
            </p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Available</p>
            <p className="text-sm font-normal text-white">
              {isWeighted 
                ? stats.value2 
                : `${formatNumber(stats.availableShares)} / ${formatNumber(stats.totalShares)}`
              }
            </p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Ownership Sold</p>
            <p className="text-sm font-normal text-white">{stats.ownershipPercentage}%</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-gradient-to-r from-neutral-700 to-neutral-600 transition-all duration-500"
            style={{ width: `${stats.soldPercentage}%` }}
          />
        </div>
        
        {/* Action Button */}
        <button
          onClick={() => onBuyClick(asset)}
          className="w-full py-3 bg-white text-black font-normal text-sm rounded-sm 
                     transition-all duration-300 hover:bg-neutral-100 
                     flex items-center justify-center gap-2 group/btn"
        >
          <span>View Details</span>
          <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </button>
      </div>
      
      {/* Activity Indicator */}
      {asset.totalInvestors && parseInt(asset.totalInvestors) > 0 && (
        <div className="absolute bottom-6 right-6">
          <div className="text-xs text-neutral-500">
            {asset.totalInvestors} investors
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetCard;