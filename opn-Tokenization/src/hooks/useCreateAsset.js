import { useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useCreateAsset = () => {
  const { tokenization } = useContract();
  const { address } = useWeb3();
  const [loading, setLoading] = useState(false);

  const createAsset = async (formData) => {
    if (!tokenization) throw new Error('Contract not connected');

    try {
      setLoading(true);

      // ETHERS V5 SYNTAX - utils.parseEther
      const priceInWei = ethers.utils.parseEther(formData.pricePerShare.toString());
      const totalSupply = ethers.utils.parseEther(formData.totalShares.toString());
      const minPurchase = ethers.utils.parseEther((formData.minPurchaseAmount || 1).toString());
      const maxPurchase = ethers.utils.parseEther((formData.maxPurchaseAmount || 0).toString());

      // Call createAsset with ALL 9 parameters
      const tx = await tokenization.createAsset(
        formData.assetType || 'Real Estate',    // 1. assetType
        formData.assetName,                      // 2. assetName
        formData.assetDescription,               // 3. assetDescription
        formData.assetImageUrl,                  // 4. mainImageUrl
        formData.metadataUrl || "",              // 5. metadataUrl
        totalSupply,                             // 6. totalSupply
        priceInWei,                              // 7. pricePerFraction
        minPurchase,                             // 8. minPurchaseAmount
        maxPurchase                              // 9. maxPurchaseAmount
      );

      const receipt = await tx.wait();
      
      let tokenId = null;
      
      const assetCreatedEvent = receipt.events?.find(
        e => e.event === 'AssetCreated'
      );
      
      if (assetCreatedEvent) {
        tokenId = assetCreatedEvent.args.tokenId.toString();
      }

      // Add images separately if provided
      if (formData.images && formData.images.length > 0 && tokenId) {
        console.log('Adding images to asset:', tokenId);
        for (const imageUrl of formData.images) {
          try {
            const imgTx = await tokenization.addAssetImage(tokenId, imageUrl);
            await imgTx.wait();
            console.log('Added image:', imageUrl);
          } catch (imgError) {
            console.error('Error adding image:', imgError);
          }
        }
      }
      
      return { 
        tx, 
        receipt,
        requestId: tokenId,
        assetId: tokenId,
        tokenId: tokenId,
        isAutoApproved: true
      };
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkAlphaMode = async () => {
    return true;
  };

  const getPlatformFee = async () => {
    if (!tokenization) return 250;
    try {
      const fee = await tokenization.platformFee();
      return fee.toNumber(); // ethers v5 - use toNumber()
    } catch (error) {
      console.error('Error getting platform fee:', error);
      return 250;
    }
  };

  const cancelRequest = async (requestId) => {
    console.log('Cancel request not available - assets are created directly');
    return null;
  };

  return {
    createAsset,
    checkAlphaMode,
    getPlatformFee,
    cancelRequest,
    loading
  };
};