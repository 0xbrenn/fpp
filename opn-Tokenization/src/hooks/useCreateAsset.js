// src/hooks/useCreateAsset.js
// FIXED for new 5-contract architecture
import { useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useCreateAsset = () => {
  // FIXED: Use assetRegistry instead of tokenization
  const { assetRegistry } = useContract();
  const { address } = useWeb3();
  const [loading, setLoading] = useState(false);

  const createAsset = async (formData) => {
    if (!assetRegistry) throw new Error('Contract not connected');

    try {
      setLoading(true);

      let tx;
      let assetId;

      // FIXED: Call different functions based on share type
      if (formData.shareType === 'equal') {
        // ============================================
        // FIXED MODEL - createFixedAsset
        // ============================================
        const priceInWei = ethers.utils.parseEther(formData.pricePerShare.toString());
        
        console.log('Creating FIXED asset:', {
          totalSupply: formData.totalShares,
          pricePerToken: formData.pricePerShare,
          minPurchase: formData.minPurchaseAmount,
          maxPurchase: formData.maxPurchaseAmount || formData.totalShares
        });

        tx = await assetRegistry.createFixedAsset(
          formData.assetType || 'Real Estate',
          formData.assetName,
          formData.assetDescription,
          formData.assetImageUrl,
          formData.metadataUrl || "",
          formData.totalShares,              // totalSupply (not in wei for FIXED)
          priceInWei,                         // pricePerToken in wei
          formData.minPurchaseAmount,         // min tokens
          formData.maxPurchaseAmount || formData.totalShares, // max tokens (or total supply if 0)
          formData.maxPositionsPerUser || 10  // max positions
        );
        
      } else {
        // ============================================
        // WEIGHTED MODEL - createWeightedAsset
        // ============================================
        const totalValueInWei = ethers.utils.parseEther(formData.totalValue.toString());
        
        // Convert percentages to basis points (1% = 100 basis points)
        const minWeightBasisPoints = Math.floor(parseFloat(formData.minPurchaseWeight) * 100);
        const maxWeightBasisPoints = Math.floor(parseFloat(formData.maxPurchaseWeight) * 100);
        
        console.log('Creating WEIGHTED asset:', {
          totalValue: formData.totalValue,
          minWeight: formData.minPurchaseWeight + '% (' + minWeightBasisPoints + ' bp)',
          maxWeight: formData.maxPurchaseWeight + '% (' + maxWeightBasisPoints + ' bp)'
        });

        tx = await assetRegistry.createWeightedAsset(
          formData.assetType || 'Real Estate',
          formData.assetName,
          formData.assetDescription,
          formData.assetImageUrl,
          formData.metadataUrl || "",
          totalValueInWei,                    // total value in wei
          minWeightBasisPoints,               // min % in basis points
          maxWeightBasisPoints,               // max % in basis points
          formData.maxPositionsPerUser || 10  // max positions
        );
      }

      const receipt = await tx.wait();
      
      // Extract asset ID from event
      const assetCreatedEvent = receipt.events?.find(
        e => e.event === 'AssetCreated'
      );
      
      if (assetCreatedEvent) {
        assetId = assetCreatedEvent.args.assetId || assetCreatedEvent.args[0];
        console.log('Asset created with ID:', assetId.toString());
      }

      // FIXED: Add additional images if provided
      if (formData.additionalImageUrls && assetId) {
        const validImages = formData.additionalImageUrls.filter(url => url && url.trim());
        
        if (validImages.length > 0) {
          console.log('Adding', validImages.length, 'additional images to asset:', assetId.toString());
          
          for (const imageUrl of validImages) {
            try {
              const imgTx = await assetRegistry.addAssetImage(assetId, imageUrl);
              await imgTx.wait();
              console.log('Added image:', imageUrl);
            } catch (error) {
              console.error('Failed to add image:', error);
              // Continue with other images even if one fails
            }
          }
        }
      }

      return {
        tx: receipt,
        requestId: assetId ? assetId.toString() : 'unknown'
      };

    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check alpha mode (optional - for auto-approval feature)
  const checkAlphaMode = async () => {
    if (!assetRegistry) return false;
    
    try {
      // This function may not exist in your contract
      // Return false by default
      return false;
    } catch (error) {
      return false;
    }
  };

  return {
    createAsset,
    checkAlphaMode,
    loading
  };
};