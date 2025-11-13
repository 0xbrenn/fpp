import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useMarketplace = () => {
  const { tokenization, kyc } = useContract();
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

  const fetchAssets = useCallback(async () => {
    if (!tokenization || !isConnected) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const code = await tokenization.provider.getCode(tokenization.address);
      if (code === '0x') {
        console.log('Contract not deployed');
        setAssets([]);
        setLoading(false);
        return;
      }

      const result = await tokenization.getActiveAssets(0, 100);
      const assetIds = result[0] || [];
      
      if (!assetIds || assetIds.length === 0) {
        setAssets([]);
        setLoading(false);
        return;
      }
      
      const assetPromises = assetIds.map(async (assetId) => {
        try {
          const asset = await tokenization.assetDetails(assetId);
          
          // Get additional images
          let additionalImages = [];
          try {
            additionalImages = await tokenization.getAssetImages(assetId);
          } catch (err) {
            console.log('No additional images for asset', assetId.toString());
          }
          
          return {
            // Core identifiers
            assetId: assetId.toString(),
            tokenId: assetId.toString(),
            
            // Asset info - FIXED FIELD NAME
            creator: asset.creator,
            assetType: asset.assetType,
            assetName: asset.assetName,
            assetDescription: asset.assetDescription,
            assetImageUrl: getImageUrl(asset.mainImageUrl), // FIXED: mainImageUrl -> assetImageUrl with IPFS conversion
            mainImageUrl: getImageUrl(asset.mainImageUrl),  // Also keep original field name
            metadataUrl: asset.metadataUrl,
            additionalImages: additionalImages.map(img => getImageUrl(img)),
            
            // Share details - KEEP AS BIGNUMBER for calculations
            totalShares: asset.totalSupply,
            availableShares: asset.availableSupply,
            pricePerShare: asset.pricePerFraction, // Keep as BigNumber
            pricePerShareFormatted: ethers.utils.formatEther(asset.pricePerFraction), // Add formatted version
            minPurchaseAmount: asset.minPurchaseAmount,
            maxPurchaseAmount: asset.maxPurchaseAmount,
            
            // Settings
            isActive: asset.isActive,
            
            // Metrics - KEEP AS BIGNUMBER
            totalRevenue: asset.totalRevenue,
            totalRevenueFormatted: ethers.utils.formatEther(asset.totalRevenue),
            totalInvestors: asset.totalInvestors.toNumber(),
            
            // Timestamps
            createdAt: new Date(asset.createdAt.toNumber() * 1000).toISOString()
          };
        } catch (assetErr) {
          console.error(`Error fetching asset ${assetId}:`, assetErr);
          return null;
        }
      });

      const fetchedAssets = await Promise.all(assetPromises);
      const validAssets = fetchedAssets.filter(asset => asset !== null);
      setAssets(validAssets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      if (err.code !== 'CALL_EXCEPTION') {
        setError(err.message);
      }
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [tokenization, isConnected]);

  const purchaseShares = async (assetId, shareAmount) => {
    if (!tokenization) throw new Error('Contract not connected');

    try {
      if (kyc && address) {
        try {
          const isVerified = await kyc.isVerified(address);
          if (!isVerified) {
            const isTestnet = await kyc.isTestnet();
            if (isTestnet) {
              const kycTx = await kyc.completeMockKYC();
              await kycTx.wait();
            }
          }
        } catch (kycError) {
          console.log('KYC check skipped:', kycError.message);
        }
      }

      const result = await tokenization.calculatePurchaseCost(assetId, shareAmount);
      const totalCost = result.t; // 't' is the total cost from contract
      
      const tx = await tokenization.purchaseFractions(
        assetId, 
        shareAmount,
        { value: totalCost }
      );

      await tx.wait();
      await fetchAssets();
      return tx;
    } catch (err) {
      console.error('Purchase error:', err);
      throw err;
    }
  };

  const getUserShares = async (userAddress, assetId) => {
    if (!tokenization || !userAddress) return '0';
    
    try {
      const shares = await tokenization.getUserShares(userAddress, assetId);
      return shares.toString();
    } catch (err) {
      console.error('Error fetching shares:', err);
      return '0';
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (!tokenization) return;

    const handleAssetCreated = () => fetchAssets();
    const handleFractionsPurchased = () => fetchAssets();

    try {
      tokenization.on('AssetCreated', handleAssetCreated);
      tokenization.on('FractionsPurchased', handleFractionsPurchased);

      return () => {
        tokenization.off('AssetCreated', handleAssetCreated);
        tokenization.off('FractionsPurchased', handleFractionsPurchased);
      };
    } catch (err) {
      console.log('Event listeners not set up:', err.message);
    }
  }, [tokenization, fetchAssets]);

  return {
    assets,
    loading,
    error,
    purchaseShares,
    getUserShares,
    refreshAssets: fetchAssets
  };
};