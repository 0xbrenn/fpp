import React, { useState, useMemo } from 'react';
import { X, Loader2, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';

const SellSharesModal = ({ isOpen, onClose, asset, onSellComplete }) => {
  const { secondaryMarket, assetRegistry } = useContract();
  const { address } = useWeb3();
  const { showNotification } = useApp();
  
  const [amount, setAmount] = useState('');
  const [selling, setSelling] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  
  // Determine if this is a weighted model asset
  const isWeighted = useMemo(() => {
    // Check if asset has model field or if shares are in basis points range
    return asset?.model === 1 || asset?.model === 'WEIGHTED';
  }, [asset]);
  
  // Calculate holdings based on model
  const { maxAmount, displayAmount, unitLabel } = useMemo(() => {
    if (!asset) return { maxAmount: 0, displayAmount: '0', unitLabel: 'shares' };
    
    const shares = parseFloat(asset.shares || 0);
    
    if (isWeighted) {
      // WEIGHTED: shares are in basis points
      // 100 basis points = 1%
      return {
        maxAmount: shares,
        displayAmount: (shares / 100).toFixed(3) + '%',
        unitLabel: '% ownership'
      };
    } else {
      // FIXED: shares are actual token count
      return {
        maxAmount: shares,
        displayAmount: shares.toString(),
        unitLabel: 'shares'
      };
    }
  }, [asset, isWeighted]);
  
  const pricePerShare = parseFloat(asset?.pricePerShare || 0);
  
  // Calculate value based on amount entered
  const calculatedValue = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '0.00';
    
    if (isWeighted) {
      // User enters percentage, convert to basis points for calculation
      const percentageAmount = parseFloat(amount);
      const basisPoints = percentageAmount * 100;
      
      // Value = (basis points / 10000) * total asset value
      // But we can use: basis points * price per basis point
      return (basisPoints * pricePerShare).toFixed(2);
    } else {
      // FIXED: simple multiplication
      return (parseFloat(amount) * pricePerShare).toFixed(2);
    }
  }, [amount, pricePerShare, isWeighted]);
  
  // Calculate platform fee (2%)
  const platformFee = (parseFloat(calculatedValue) * 0.02).toFixed(2);
  const netProceeds = (parseFloat(calculatedValue) - parseFloat(platformFee)).toFixed(2);

  const handleSell = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      showNotification('Please enter a listing price', 'error');
      return;
    }

    let amountToSell;
    if (isWeighted) {
      // Convert percentage to basis points
      amountToSell = Math.floor(parseFloat(amount) * 100);
    } else {
      // Use as-is for fixed model
      amountToSell = parseInt(amount);
    }

    if (amountToSell > maxAmount) {
      showNotification(`Amount exceeds your holdings (${displayAmount})`, 'error');
      return;
    }

    setSelling(true);
    try {
      // Get the position ID (assuming first position for simplicity)
      const positionId = asset.positionIds?.[0];
      
      if (!positionId) {
        throw new Error('No position ID found');
      }

      // List on secondary market
      const priceInWei = ethers.utils.parseEther(listingPrice);
      
      const tx = await secondaryMarket.listPosition(
        positionId,
        amountToSell,
        priceInWei
      );
      
      await tx.wait();
      
      showNotification(
        `Successfully listed ${isWeighted ? amount + '%' : amount + ' shares'} for sale`,
        'success'
      );
      
      onSellComplete();
      onClose();
    } catch (error) {
      console.error('Error listing for sale:', error);
      showNotification('Failed to list for sale: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setSelling(false);
    }
  };

  const handleQuickAmount = (percentage) => {
    if (isWeighted) {
      // For weighted, percentage is % of ownership
      const percentageAmount = (maxAmount / 100) * (percentage / 100);
      setAmount(percentageAmount.toFixed(3));
    } else {
      // For fixed, percentage of shares
      const shareAmount = Math.floor(maxAmount * (percentage / 100));
      setAmount(shareAmount.toString());
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-black border border-neutral-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Sell {isWeighted ? 'Ownership' : 'Shares'}
              </h2>
              <p className="text-sm text-neutral-400 mt-1">{asset.assetName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-900 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Holdings */}
          <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neutral-400">Your Holdings</span>
              <span className="text-lg font-semibold text-white">{displayAmount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Current Value</span>
              <span className="text-lg font-semibold text-green-400">
                {(parseFloat(asset.totalValue)).toFixed(2)} OPN
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {isWeighted ? 'Percentage to Sell (%)' : 'Shares to Sell'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step={isWeighted ? "0.001" : "1"}
                min={isWeighted ? "0.001" : "1"}
                max={isWeighted ? (maxAmount / 100).toString() : maxAmount.toString()}
                className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
                placeholder={isWeighted ? "Enter percentage (e.g., 0.5 for 0.5%)" : "Enter number of shares"}
              />
              {isWeighted && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
              )}
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => handleQuickAmount(pct)}
                  className="py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-xs text-white transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Listing Price Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Listing Price (OPN)
            </label>
            <input
              type="number"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
              placeholder="Enter listing price in OPN"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Suggested: {calculatedValue} OPN (current market value)
            </p>
          </div>

          {/* Transaction Summary */}
          {amount && parseFloat(amount) > 0 && listingPrice && parseFloat(listingPrice) > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Amount</span>
                <span className="text-white">
                  {isWeighted ? `${amount}%` : `${amount} shares`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Listing Price</span>
                <span className="text-white">{listingPrice} OPN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Platform Fee (2%)</span>
                <span className="text-red-400">-{(parseFloat(listingPrice) * 0.02).toFixed(2)} OPN</span>
              </div>
              <div className="pt-3 border-t border-neutral-800 flex justify-between">
                <span className="text-white font-medium">You'll Receive</span>
                <span className="text-green-400 font-semibold text-lg">
                  {(parseFloat(listingPrice) * 0.98).toFixed(2)} OPN
                </span>
              </div>
            </div>
          )}

          {/* Warning for selling all */}
          {amount && (
            (isWeighted && parseFloat(amount) >= (maxAmount / 100)) ||
            (!isWeighted && parseInt(amount) >= maxAmount)
          ) && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-500 font-medium">
                    Selling All {isWeighted ? 'Ownership' : 'Shares'}
                  </p>
                  <p className="text-xs text-yellow-400 mt-1">
                    You will no longer have any stake in this asset
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info about listing */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm text-blue-400">
                  This will create a listing on the secondary marketplace. Buyers can purchase at your listed price.
                </p>
              </div>
            </div>
          </div>

          {/* List Button */}
          <button
            onClick={handleSell}
            disabled={
              !amount || 
              parseFloat(amount) <= 0 || 
              !listingPrice ||
              parseFloat(listingPrice) <= 0 ||
              selling ||
              (isWeighted ? parseFloat(amount) * 100 > maxAmount : parseInt(amount) > maxAmount)
            }
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {selling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Listing...
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" />
                List for Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellSharesModal;