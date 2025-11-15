// src/hooks/useMarketplace.js
// COMPLETE VERSION - Works with new 5-contract architecture
// Fetches assets from AssetRegistry with soldWeight for WEIGHTED assets
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useMarketplace = () => {
  const { assetRegistry, positionManager } = useContract();
  const { isConnected, address } = useWeb3();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to convert IPFS CID to gateway URL
  const getImageUrl = (url) => {
    if (!url) return '/placeholder.jpg';
    if (url.startsWith('http')) return url;
    // If it's just a CID, add IPFS gateway
    return `https://ipfs.io/ipfs/${url}`;
  };

  // Main function to fetch all assets
  const fetchAssets = useCallback(async () => {
    if (!assetRegistry || !isConnected) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if contract is deployed
      const code = await assetRegistry.provider.getCode(assetRegistry.address);
      if (code === '0x') {
        console.log('AssetRegistry contract not deployed');
        setAssets([]);
        setLoading(false);
        return;
      }

      // Get active assets from AssetRegistry
      const result = await assetRegistry.getActiveAssets(0, 100);
      const assetIds = result.ids || result[0] || [];
      
      if (!assetIds || assetIds.length === 0) {
        console.log('No assets found');
        setAssets([]);
        setLoading(false);
        return;
      }
      
      console.log(`Fetching ${assetIds.length} assets from AssetRegistry...`);
      
      // Fetch each asset's details
      const assetPromises = assetIds.map(async (assetId) => {
        try {
          // Get asset data from AssetRegistry
          const asset = await assetRegistry.assets(assetId);
          
          // Skip inactive assets
          if (!asset.isActive) {
            console.log(`Asset ${assetId} is inactive, skipping`);
            return null;
          }
          
          // Detect model type (0 = FIXED, 1 = WEIGHTED)
          const isWeighted = asset.model === 1;
          
          console.log(`Asset ${assetId}: ${asset.assetName} - Model: ${isWeighted ? 'WEIGHTED' : 'FIXED'}`);
          
          // Build base asset object
          const baseAsset = {
            assetId: assetId.toString(),
            assetType: asset.assetType,
            assetName: asset.assetName,
            assetDescription: asset.assetDescription,
            assetImageUrl: getImageUrl(asset.mainImageUrl),
            mainImageUrl: getImageUrl(asset.mainImageUrl),
            model: asset.model,
            isActive: asset.isActive,
            createdAt: asset.createdAt.toString(),
            maxPositionsPerUser: asset.maxPositionsPerUser.toString(),
            totalRevenue: asset.totalRevenue,
            ethRewardPool: asset.ethRewardPool,
            usdcRewardPool: asset.usdcRewardPool
          };
          
          // Add model-specific fields
          if (isWeighted) {
            // WEIGHTED MODEL
            const soldWeight = asset.soldWeight.toNumber();
            const availableWeight = 10000 - soldWeight;
            
            console.log(`  - Total Value: ${ethers.utils.formatEther(asset.totalValue)} OPN`);
            console.log(`  - Sold Weight: ${soldWeight} basis points (${(soldWeight/100).toFixed(2)}%)`);
            console.log(`  - Available: ${availableWeight} basis points (${(availableWeight/100).toFixed(2)}%)`);
            
            return {
              ...baseAsset,
              totalValue: asset.totalValue, // Keep as BigNumber
              soldWeight: soldWeight,
              minPurchaseWeight: asset.minPurchaseAmount.toNumber(),
              maxPurchaseWeight: asset.maxPurchaseAmount.toNumber(),
              availableWeight: availableWeight
            };
          } else {
            // FIXED MODEL
            const totalSupply = asset.totalSupply;
            const soldTokens = asset.soldTokens;
            const availableTokens = totalSupply.sub(soldTokens);
            
            console.log(`  - Price per Token: ${ethers.utils.formatEther(asset.pricePerToken)} OPN`);
            console.log(`  - Total Supply: ${totalSupply.toString()} tokens`);
            console.log(`  - Sold: ${soldTokens.toString()} tokens`);
            console.log(`  - Available: ${availableTokens.toString()} tokens`);
            
            return {
              ...baseAsset,
              totalSupply: totalSupply, // Keep as BigNumber
              totalShares: totalSupply, // Alias for compatibility
              pricePerToken: asset.pricePerToken, // Keep as BigNumber
              pricePerShare: asset.pricePerToken, // Alias for compatibility
              soldTokens: soldTokens, // Keep as BigNumber
              minPurchaseAmount: asset.minPurchaseAmount,
              maxPurchaseAmount: asset.maxPurchaseAmount,
              availableShares: availableTokens // Keep as BigNumber
            };
          }
        } catch (error) {
          console.error(`Error fetching asset ${assetId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(assetPromises);
      const validAssets = results.filter(a => a !== null);
      
      console.log(`Successfully fetched ${validAssets.length} valid assets`);
      
      setAssets(validAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [assetRegistry, isConnected]);

  // Get user's positions for a specific asset
  const getUserPositions = useCallback(async (assetId) => {
    if (!positionManager || !address) return [];
    
    try {
      const positionIds = await positionManager.getUserPositions(address, assetId);
      
      const positions = await Promise.all(
        positionIds.map(async (posId) => {
          const position = await positionManager.positions(posId);
          return {
            positionId: posId.toString(),
            assetId: position.assetId.toString(),
            owner: position.owner,
            amount: position.amount, // For FIXED: token count, For WEIGHTED: basis points
            purchasePrice: position.purchasePrice,
            purchaseTimestamp: position.purchaseTimestamp.toString(),
            lastRewardClaim: position.lastRewardClaim.toString()
          };
        })
      );
      
      return positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      return [];
    }
  }, [positionManager, address]);

  // Get user's total ownership percentage/amount for an asset
  const getUserOwnership = useCallback(async (assetId) => {
    if (!positionManager || !address) return { amount: 0, percentage: 0 };
    
    try {
      const positions = await getUserPositions(assetId);
      
      if (positions.length === 0) {
        return { amount: 0, percentage: 0 };
      }
      
      // Sum up all position amounts
      const totalAmount = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.amount.toString());
      }, 0);
      
      // Get asset to determine model and calculate percentage
      const asset = assets.find(a => a.assetId === assetId.toString());
      
      if (!asset) {
        return { amount: totalAmount, percentage: 0 };
      }
      
      let percentage = 0;
      
      if (asset.model === 1) {
        // WEIGHTED: amount is in basis points (10000 = 100%)
        percentage = (totalAmount / 100); // Convert basis points to percentage
      } else {
        // FIXED: calculate from total supply
        const totalSupply = parseFloat(asset.totalSupply.toString());
        if (totalSupply > 0) {
          percentage = (totalAmount / totalSupply) * 100;
        }
      }
      
      return {
        amount: totalAmount,
        percentage: percentage
      };
    } catch (error) {
      console.error('Error calculating user ownership:', error);
      return { amount: 0, percentage: 0 };
    }
  }, [positionManager, address, assets, getUserPositions]);

  // Initial fetch
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Listen for blockchain events to auto-refresh
  useEffect(() => {
    if (!assetRegistry) return;

    const handleAssetCreated = (assetId, creator) => {
      console.log('AssetCreated event:', assetId.toString(), 'by', creator);
      fetchAssets();
    };
    
    const handleAssetStatusChanged = (assetId, isActive) => {
      console.log('AssetStatusChanged event:', assetId.toString(), 'active:', isActive);
      fetchAssets();
    };

    try {
      assetRegistry.on('AssetCreated', handleAssetCreated);
      assetRegistry.on('AssetStatusChanged', handleAssetStatusChanged);

      return () => {
        assetRegistry.off('AssetCreated', handleAssetCreated);
        assetRegistry.off('AssetStatusChanged', handleAssetStatusChanged);
      };
    } catch (err) {
      console.log('Event listeners not set up:', err.message);
    }
  }, [assetRegistry, fetchAssets]);

  // Listen for position changes
  useEffect(() => {
    if (!positionManager) return;

    const handlePositionCreated = () => {
      console.log('PositionCreated event - refreshing assets');
      fetchAssets();
    };
    
    const handlePositionsMerged = () => {
      console.log('PositionsMerged event - refreshing assets');
      fetchAssets();
    };
    
    const handlePositionSplit = () => {
      console.log('PositionSplit event - refreshing assets');
      fetchAssets();
    };

    try {
      positionManager.on('PositionCreated', handlePositionCreated);
      positionManager.on('PositionsMerged', handlePositionsMerged);
      positionManager.on('PositionSplit', handlePositionSplit);

      return () => {
        positionManager.off('PositionCreated', handlePositionCreated);
        positionManager.off('PositionsMerged', handlePositionsMerged);
        positionManager.off('PositionSplit', handlePositionSplit);
      };
    } catch (err) {
      console.log('Position event listeners not set up:', err.message);
    }
  }, [positionManager, fetchAssets]);

  return {
    assets,
    loading,
    error,
    refreshAssets: fetchAssets,
    getUserPositions,
    getUserOwnership
  };
};