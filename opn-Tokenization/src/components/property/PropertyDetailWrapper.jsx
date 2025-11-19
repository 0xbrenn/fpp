// src/components/property/PropertyDetailWrapper.jsx
// ✅ FIXED - Matches PropertyView's exact data structure
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { ethers } from 'ethers';
import PropertyDetailView from './PropertyDetailView';

// ✅ COPY PARSING FUNCTIONS FROM PROPERTYVIEW
const parseAdditionalImages = (description) => {
  const images = [];
  if (!description) return images;
  
  const additionalImagesMatch = description.match(/Additional Images:([\s\S]*?)(?:\n\n|Documents:|$)/);
  
  if (additionalImagesMatch && additionalImagesMatch[1]) {
    const imagesSection = additionalImagesMatch[1];
    const imageMatches = imagesSection.matchAll(/Image \d+: (https?:\/\/[^\s\n]+)/g);
    
    for (const match of imageMatches) {
      if (match[1]) {
        images.push(match[1]);
      }
    }
  }
  return images;
};

const parseRealEstateData = (description) => {
  const data = {
    location: 'Dubai, United Arab Emirates',
    propertyType: null,
    size: null,
    yearBuilt: null
  };
  
  if (!description) return data;
  
  const locationMatch = description.match(/Location: ([^\n]+)/i);
  if (locationMatch) data.location = locationMatch[1].trim();
  
  const sizeMatch = description.match(/Size: ([\d,.]+ (?:sq\.?\s*ft|sqft|square feet|acres))/i);
  if (sizeMatch) data.size = sizeMatch[1].trim();
  
  if (description.includes('Residential Property')) data.propertyType = 'Residential';
  else if (description.includes('Commercial Property')) data.propertyType = 'Commercial';
  else if (description.includes('Land')) data.propertyType = 'Land';
  
  return data;
};

const parseAssetData = (asset) => {
  const { assetDescription: description, assetType } = asset;
  
  // Base parsed data
  const parsedData = {
    ...asset,
    additionalImages: parseAdditionalImages(description),
    propertyData: parseRealEstateData(description)
  };
  
  return parsedData;
};

const PropertyDetailWrapper = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { assetRegistry } = useContract();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch asset data from blockchain
  useEffect(() => {
    const fetchAsset = async () => {
      if (!assetRegistry || !assetId) {
        setError('Missing required data');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch asset from contract
        const asset = await assetRegistry.assets(assetId);
        
        // Check if asset exists
        if (!asset || asset.assetId.toString() === '0') {
          setError('Asset not found');
          setLoading(false);
          return;
        }

        // Fetch additional images
        const additionalImages = await assetRegistry.getAssetImages(assetId);

        // ✅ BUILD ASSET EXACTLY LIKE PROPERTYVIEW DOES
        const isWeighted = asset.model === 1;
        
        // Build base asset object - EXACT SAME AS PROPERTYVIEW
        const baseAsset = {
          assetId: assetId.toString(),
          assetType: asset.assetType,
          assetName: asset.assetName,
          assetDescription: asset.assetDescription,
          assetImageUrl: asset.mainImageUrl,
          model: asset.model,
          isActive: asset.isActive,
          createdAt: asset.createdAt.toString(),
          requiresPurchaserKYC: asset.requiresPurchaserKYC,
          
          // Model-specific fields - EXACT SAME AS PROPERTYVIEW
          ...(isWeighted ? {
            // WEIGHTED MODEL - soldWeight is in wei units (1e18 = 100%)
            // formatUnits with 16 decimals converts to percentage (1e16 = 1%)
            totalValue: asset.totalValue,
            soldWeight: parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)), // Convert to percentage
            availableWeight: 100 - parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)),
            soldPercentage: parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)),
            availablePercentage: 100 - parseFloat(ethers.utils.formatUnits(asset.soldWeight, 16)),
            minPurchaseWeight: parseFloat(ethers.utils.formatUnits(asset.minPurchaseAmount, 16)),
            maxPurchaseWeight: parseFloat(ethers.utils.formatUnits(asset.maxPurchaseAmount, 16)),
            // Also keep raw values for PropertyModal
            minPurchaseAmount: asset.minPurchaseAmount,
            maxPurchaseAmount: asset.maxPurchaseAmount
          } : {
            // FIXED MODEL
            totalSupply: asset.totalSupply,
            pricePerToken: asset.pricePerToken,
            pricePerShare: asset.pricePerToken, // alias for compatibility
            soldTokens: asset.soldTokens,
            minPurchaseAmount: asset.minPurchaseAmount,
            maxPurchaseAmount: asset.maxPurchaseAmount,
            availableShares: asset.totalSupply.sub(asset.soldTokens)
          }),
          
          // Common fields
          maxPositionsPerUser: asset.maxPositionsPerUser,
          totalRevenue: asset.totalRevenue
        };
        
        // ✅ PARSE ADDITIONAL DATA - EXACT SAME AS PROPERTYVIEW
        const formattedProperty = parseAssetData(baseAsset);

        setProperty(formattedProperty);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching asset:', error);
        setError('Failed to load asset details');
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetRegistry, assetId]);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Handle purchase success
  const handlePurchaseSuccess = () => {
    window.location.reload();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading asset details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Asset Not Found</h2>
          <p className="text-neutral-400 text-sm mb-6">
            {error || 'The asset you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render the actual detail view with fetched property
  return (
    <PropertyDetailView
      property={property}
      onBack={handleBack}
      onPurchaseSuccess={handlePurchaseSuccess}
    />
  );
};

export default PropertyDetailWrapper;