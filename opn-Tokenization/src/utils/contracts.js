// src/utils/contracts.js
// OPN Protocol - Contract Configuration - UPDATED FOR SECONDARY MARKET PRICING
// Network: OPN (Chain ID: 403)
// Deployed: November 14, 2025
// Updated: November 17, 2025 - Security Audit Fixes + Secondary Market Pricing

import { ethers } from 'ethers';

// ============================================================================
// CONTRACT ADDRESSES - DEPLOYED ON OPN NETWORK
// ============================================================================

export const CONTRACT_ADDRESSES = {
  ASSET_REGISTRY: import.meta.env.VITE_ASSET_REGISTRY,
  POSITION_NFT: import.meta.env.VITE_POSITION_NFT,
  PRIMARY_MARKET: import.meta.env.VITE_PRIMARY_MARKET,
  SECONDARY_MARKET: import.meta.env.VITE_SECONDARY_MARKET,
  GOVERNANCE: import.meta.env.VITE_GOVERNANCE 
};

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 403,
  chainIdHex: '0x193',
  name: 'OPN',
  rpcUrl: 'https://rpc.cor3innovations.io/',
  explorerUrl: 'https://explorer.cor3innovations.io',
  nativeCurrency: {
    name: 'OPN',
    symbol: 'OPN',
    decimals: 18
  }
};

// ============================================================================
// CONTRACT ABIs - UPDATED FOR SECONDARY MARKET PRICING
// ============================================================================

export const ASSET_REGISTRY_ABI = [
  // Admin Management
  "function addAdmin(address _newAdmin)",
  "function removeAdmin(address _admin)",
  "function getAllAdmins() view returns (address[])",
  
  // Asset Creation
  "function createFixedAsset(string _assetType, string _assetName, string _assetDescription, string _mainImageUrl, string _metadataUrl, uint256 _totalSupply, uint256 _pricePerToken, uint256 _minPurchaseAmount, uint256 _maxPurchaseAmount, uint256 _maxPositionsPerUser) returns (uint256)",
  "function createWeightedAsset(string _assetType, string _assetName, string _assetDescription, string _mainImageUrl, string _metadataUrl, uint256 _totalValue, uint256 _minPurchaseWeight, uint256 _maxPurchaseWeight, uint256 _maxPositionsPerUser) returns (uint256)",
  
  // Asset Management
  "function addAssetImage(uint256 _assetId, string _imageUrl)",
  "function editAsset(uint256 _assetId, string _assetName, string _assetDescription, string _mainImageUrl, uint256 _priceOrValue)",
  "function deactivateAsset(uint256 _assetId)",
  
  // Rewards
  "function depositRewards(uint256 _assetId, uint256 _usdcAmount) payable",
  
  // View Functions - Clean helper functions!
  "function getAssetCreator(uint256 _assetId) view returns (address)",
  "function getAssetModel(uint256 _assetId) view returns (uint8)",
  "function isAssetActive(uint256 _assetId) view returns (bool)",
  "function getAssetSupplyInfo(uint256 _assetId) view returns (uint256, uint256, uint256, uint256)",
  "function getAssetLimits(uint256 _assetId) view returns (uint256, uint256, uint256)",
  "function getAssetRewards(uint256 _assetId) view returns (uint256, uint256)",
  
  // ✅ NEW: Secondary Market Pricing Functions
  "function getCurrentPrice(uint256 _assetId) view returns (uint256)",
  "function setSecondaryMarketContract(address _secondaryMarket)",
  "function updateSecondaryPrice(uint256 _assetId, uint256 _newPrice)",
  "function secondaryPrices(uint256 _assetId) view returns (uint256 price, uint256 lastUpdateTime, bool hasSecondaryData)",
  "function secondaryMarketContract() view returns (address)",
  
  "function assets(uint256) view returns (uint256 assetId, address creator, string assetType, string assetName, string assetDescription, string mainImageUrl, string metadataUrl, uint8 model, uint256 totalSupply, uint256 pricePerToken, uint256 soldTokens, uint256 totalValue, uint256 soldWeight, uint256 minPurchaseAmount, uint256 maxPurchaseAmount, uint256 maxPositionsPerUser, bool isActive, uint256 createdAt, uint256 totalRevenue, uint256 ethRewardPool, uint256 usdcRewardPool)",
  "function getAvailableSupply(uint256 _assetId) view returns (uint256)",
  "function calculatePurchaseCost(uint256 _assetId, uint256 _amount) view returns (uint256)",
  "function getAssetImages(uint256 _assetId) view returns (string[])",
  "function getActiveAssets(uint256 _offset, uint256 _limit) view returns (uint256[], bool)",
  
  // Utility
  "function pause()",
  "function unpause()",
  
  // Events
  "event AssetCreated(uint256 indexed assetId, address indexed creator, string assetName, uint8 model, uint256 totalSupplyOrValue)",
  "event AssetEdited(uint256 indexed assetId)",
  "event AssetDeactivated(uint256 indexed assetId)",
  "event RewardsDeposited(uint256 indexed assetId, uint256 ethAmount, uint256 usdcAmount)",
  "event ImageAdded(uint256 indexed assetId, string imageUrl)",
  // ✅ NEW: Secondary market price update event
  "event SecondaryPriceUpdated(uint256 indexed assetId, uint256 newPrice, uint256 timestamp)"
];

export const POSITION_NFT_ABI = [
  // ERC721 Standard
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  
  // Position Management
  "function positions(uint256) view returns (uint256 positionId, uint256 assetId, address owner, uint256 amount, uint256 purchasePrice, uint256 purchaseTimestamp, uint256 ethRewardsClaimed, uint256 usdcRewardsClaimed, uint256 lastClaimTimestamp)",
  "function getUserPositions(address _user, uint256 _assetId) view returns (uint256[])",
  "function getUserPositionCount(address _user, uint256 _assetId) view returns (uint256)",
  "function getPositionDetails(uint256 _positionId) view returns (tuple(uint256 positionId, uint256 assetId, address owner, uint256 amount, uint256 purchasePrice, uint256 purchaseTimestamp, uint256 ethRewardsClaimed, uint256 usdcRewardsClaimed, uint256 lastClaimTimestamp))",
  
  // Rewards claiming
  "function claimRewards(uint256 _positionId)",
  "function calculatePendingRewards(uint256 _positionId) view returns (uint256 ethReward, uint256 usdcReward)",
  
  // Events
  "event PositionMinted(uint256 indexed positionId, uint256 indexed assetId, address indexed owner, uint256 amount, uint256 purchasePrice)",
  "event PositionSplit(uint256 indexed originalPositionId, uint256 indexed newPositionId, uint256 originalAmount, uint256 splitAmount)",
  "event PositionMerged(uint256 indexed keepPositionId, uint256 indexed burnPositionId, uint256 newTotalAmount)",
  "event RewardsClaimed(uint256 indexed positionId, address indexed owner, uint256 ethAmount, uint256 usdcAmount)"
];

export const PRIMARY_MARKET_ABI = [
  // Purchase Functions with slippage protection
  "function purchaseFixed(uint256 _assetId, uint256 _tokenAmount, uint256 _maxTotalCost) payable",
  "function purchaseWeighted(uint256 _assetId, uint256 _weightWeiUnits, uint256 _maxTotalCost) payable",
  
  // View Functions
  "function calculateTotalCost(uint256 _assetId, uint256 _amount) view returns (uint256 cost, uint256 fee, uint256 total)",
  "function platformFee() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  
  // Admin Functions
  "function updatePlatformFee(uint256 _newFee)",
  "function updateFeeRecipient(address _newRecipient)",
  "function pause()",
  "function unpause()",
  
  // Events
  "event FractionsPurchased(uint256 indexed assetId, address indexed buyer, uint256 amount, uint256 cost, uint256 fee, uint256 indexed positionId)",
  "event PlatformFeeUpdated(uint256 newFee)",
  "event FeeRecipientUpdated(address newRecipient)"
];

export const SECONDARY_MARKET_ABI = [
  // Listing Functions
  "function listPosition(uint256 _positionId, uint256 _amountToSell, uint256 _price)",
  "function cancelListing(uint256 _listingId)",
  "function buyPosition(uint256 _listingId) payable",
  
  // View Functions
  "function listings(uint256) view returns (uint256 listingId, uint256 positionId, address seller, uint256 assetId, uint256 amountListed, uint256 price, bool isPartialSale, bool isActive, uint256 createdAt)",
  "function getActiveListings(uint256 _offset, uint256 _limit) view returns (tuple(uint256 listingId, uint256 positionId, address seller, uint256 assetId, uint256 amountListed, uint256 price, bool isPartialSale, bool isActive, uint256 createdAt)[], bool)",
  "function getListingsByAsset(uint256 _assetId, uint256 _offset, uint256 _limit) view returns (tuple(uint256 listingId, uint256 positionId, address seller, uint256 assetId, uint256 amountListed, uint256 price, bool isPartialSale, bool isActive, uint256 createdAt)[], bool)",
  "function calculateBuyerCost(uint256 _listingId) view returns (uint256 price, uint256 fee, uint256 total)",
  "function marketplaceFee() view returns (uint256)",
  
  // Admin Functions
  "function updateMarketplaceFee(uint256 _newFee)",
  "function updateFeeRecipient(address _newRecipient)",
  "function pause()",
  "function unpause()",
  
  // Events
  "event Listed(uint256 indexed listingId, uint256 indexed positionId, address indexed seller, uint256 assetId, uint256 amount, uint256 price, bool isPartial)",
  "event ListingCancelled(uint256 indexed listingId)",
  "event PositionSold(uint256 indexed listingId, uint256 indexed positionId, address indexed buyer, address seller, uint256 amount, uint256 price, uint256 fee)",
  "event MarketplaceFeeUpdated(uint256 newFee)"
];

export const GOVERNANCE_ABI = [
  // Proposal Functions with pausable protection
  "function createProposal(uint256 _assetId, string _title, string _description, string _ipfsHash, uint256 _estimatedCost, uint256 _votingPeriodDays) returns (uint256)",
  "function vote(uint256 _proposalId, bool _support)",
  "function executeProposal(uint256 _proposalId)",
  "function cancelProposal(uint256 _proposalId)",
  
  // View Functions
  "function proposals(uint256) view returns (uint256 proposalId, uint256 assetId, address proposer, string title, string description, string ipfsHash, uint256 estimatedCost, uint256 votingDeadline, uint256 yesVotes, uint256 noVotes, uint256 totalVoted, uint8 status, uint256 createdAt)",
  "function getProposalVotes(uint256 _proposalId) view returns (uint256 yesVotes, uint256 noVotes, uint256 totalVoted, uint256 yesPercentage, uint256 noPercentage)",
  "function getAssetProposals(uint256 _assetId) view returns (uint256[])",
  "function getUserVotingPower(address _user, uint256 _assetId) view returns (uint256)",
  "function hasUserVoted(uint256 _proposalId, address _user) view returns (bool voted, bool support)",
  
  // Pausable functions
  "function pause()",
  "function unpause()",
  
  // Events
  "event ProposalCreated(uint256 indexed proposalId, uint256 indexed assetId, address indexed proposer, string title, uint256 votingDeadline)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)",
  "event ProposalExecuted(uint256 indexed proposalId)",
  "event ProposalCancelled(uint256 indexed proposalId)",
  "event ProposalRejected(uint256 indexed proposalId)"
];

// ============================================================================
// Helper Functions
// ============================================================================

export const getAssetRegistry = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.ASSET_REGISTRY,
    ASSET_REGISTRY_ABI,
    signerOrProvider
  );
};

export const getPositionNFT = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.POSITION_NFT,
    POSITION_NFT_ABI,
    signerOrProvider
  );
};

export const getPrimaryMarket = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.PRIMARY_MARKET,
    PRIMARY_MARKET_ABI,
    signerOrProvider
  );
};

export const getSecondaryMarket = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.SECONDARY_MARKET,
    SECONDARY_MARKET_ABI,
    signerOrProvider
  );
};

export const getGovernance = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.GOVERNANCE,
    GOVERNANCE_ABI,
    signerOrProvider
  );
};

// ============================================================================
// Network Helper Functions
// ============================================================================

export const switchToOPNNetwork = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed!");
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
    });
  } catch (switchError) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: NETWORK_CONFIG.chainIdHex,
            chainName: NETWORK_CONFIG.name,
            nativeCurrency: NETWORK_CONFIG.nativeCurrency,
            rpcUrls: [NETWORK_CONFIG.rpcUrl],
            blockExplorerUrls: [NETWORK_CONFIG.explorerUrl]
          }],
        });
      } catch (addError) {
        throw new Error("Failed to add OPN network to MetaMask");
      }
    } else {
      throw switchError;
    }
  }
};

// ============================================================================
// Helper Functions for Security Features
// ============================================================================

/**
 * Calculate maximum total cost with slippage tolerance
 * @param {string} cost - Base cost in wei
 * @param {number} slippagePercent - Slippage tolerance (default 1%)
 * @returns {string} Maximum total cost with slippage in wei
 */
export const calculateMaxTotalCost = (cost, slippagePercent = 1) => {
  const costBN = ethers.BigNumber.from(cost);
  const slippageMultiplier = ethers.BigNumber.from(100 + slippagePercent);
  const maxCost = costBN.mul(slippageMultiplier).div(100);
  return maxCost.toString();
};

/**
 * Helper to purchase fixed asset with slippage protection
 */
export const purchaseFixedWithSlippage = async (
  primaryMarket,
  assetId,
  tokenAmount,
  value,
  slippagePercent = 1
) => {
  const maxTotalCost = calculateMaxTotalCost(value, slippagePercent);
  return await primaryMarket.purchaseFixed(
    assetId,
    tokenAmount,
    maxTotalCost,
    { value }
  );
};

/**
 * Helper to purchase weighted asset with slippage protection
 */
export const purchaseWeightedWithSlippage = async (
  primaryMarket,
  assetId,
  weightWeiUnits,
  value,
  slippagePercent = 1
) => {
  const maxTotalCost = calculateMaxTotalCost(value, slippagePercent);
  return await primaryMarket.purchaseWeighted(
    assetId,
    weightWeiUnits,
    maxTotalCost,
    { value }
  );
};

/**
 * Convert percentage to wei units for weighted purchases
 */
export const percentageToWeiUnits = (percentage) => {
  const weiUnits = ethers.utils.parseEther(percentage.toString()).div(100);
  return weiUnits.toString();
};

/**
 * Convert wei units to percentage for display
 */
export const weiUnitsToPercentage = (weiUnits) => {
  const weiUnitsBN = ethers.BigNumber.from(weiUnits);
  const percentage = weiUnitsBN.mul(100).div(ethers.utils.parseEther("1"));
  return percentage.toNumber();
};

// ============================================================================
// ✅ NEW: Secondary Market Pricing Helpers
// ============================================================================

/**
 * Get current market price for an asset (includes secondary market data)
 * @param {Contract} assetRegistry - Asset registry contract instance
 * @param {number} assetId - Asset ID
 * @returns {Promise<string>} Current price in wei
 */
export const getCurrentMarketPrice = async (assetRegistry, assetId) => {
  return await assetRegistry.getCurrentPrice(assetId);
};

/**
 * Get secondary market price data for an asset
 * @param {Contract} assetRegistry - Asset registry contract instance
 * @param {number} assetId - Asset ID
 * @returns {Promise<Object>} Secondary price data
 */
export const getSecondaryPriceData = async (assetRegistry, assetId) => {
  const data = await assetRegistry.secondaryPrices(assetId);
  return {
    price: data.price || data[0],
    lastUpdateTime: data.lastUpdateTime || data[1],
    hasSecondaryData: data.hasSecondaryData || data[2]
  };
};

/**
 * Check if asset has recent secondary market data
 * @param {Contract} assetRegistry - Asset registry contract instance
 * @param {number} assetId - Asset ID
 * @param {number} maxAgeDays - Maximum age in days (default 30)
 * @returns {Promise<boolean>} True if recent data exists
 */
export const hasRecentSecondaryData = async (assetRegistry, assetId, maxAgeDays = 30) => {
  const data = await getSecondaryPriceData(assetRegistry, assetId);
  if (!data.hasSecondaryData) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const maxAge = maxAgeDays * 24 * 60 * 60;
  return (now - data.lastUpdateTime.toNumber()) < maxAge;
};

// ============================================================================
// Constants
// ============================================================================

export const PURCHASE_MODEL = {
  FIXED: 0,
  WEIGHTED: 1
};

export const PROPOSAL_STATUS = {
  ACTIVE: 0,
  EXECUTED: 1,
  CANCELLED: 2,
  REJECTED: 3
};

export const PRECISION_CONSTANTS = {
  WEI_UNITS: ethers.utils.parseEther("1"), // 1e18 = 100%
  ONE_PERCENT: ethers.utils.parseEther("1").div(100), // 1e16 = 1%
  HALF_PERCENT: ethers.utils.parseEther("1").div(200), // 5e15 = 0.5%
  TENTH_PERCENT: ethers.utils.parseEther("1").div(1000), // 1e15 = 0.1%
};

export const DEFAULT_SLIPPAGE_PERCENT = 1;

// ============================================================================
// Legacy Compatibility
// ============================================================================

export const CONTRACTS = {
  opn: {
    tokenization: CONTRACT_ADDRESSES.ASSET_REGISTRY,
    assetRegistry: CONTRACT_ADDRESSES.ASSET_REGISTRY,
    positionNFT: CONTRACT_ADDRESSES.POSITION_NFT,
    primaryMarket: CONTRACT_ADDRESSES.PRIMARY_MARKET,
    secondaryMarket: CONTRACT_ADDRESSES.SECONDARY_MARKET,
    governance: CONTRACT_ADDRESSES.GOVERNANCE
  },
  mainnet: {
    tokenization: CONTRACT_ADDRESSES.ASSET_REGISTRY,
    assetRegistry: CONTRACT_ADDRESSES.ASSET_REGISTRY,
    positionNFT: CONTRACT_ADDRESSES.POSITION_NFT,
    primaryMarket: CONTRACT_ADDRESSES.PRIMARY_MARKET,
    secondaryMarket: CONTRACT_ADDRESSES.SECONDARY_MARKET,
    governance: CONTRACT_ADDRESSES.GOVERNANCE
  }
};

export default {
  CONTRACT_ADDRESSES,
  NETWORK_CONFIG,
  ASSET_REGISTRY_ABI,
  POSITION_NFT_ABI,
  PRIMARY_MARKET_ABI,
  SECONDARY_MARKET_ABI,
  GOVERNANCE_ABI,
  getAssetRegistry,
  getPositionNFT,
  getPrimaryMarket,
  getSecondaryMarket,
  getGovernance,
  switchToOPNNetwork,
  PURCHASE_MODEL,
  PROPOSAL_STATUS,
  CONTRACTS,
  calculateMaxTotalCost,
  purchaseFixedWithSlippage,
  purchaseWeightedWithSlippage,
  percentageToWeiUnits,
  weiUnitsToPercentage,
  PRECISION_CONSTANTS,
  DEFAULT_SLIPPAGE_PERCENT,
  // ✅ NEW: Secondary market pricing helpers
  getCurrentMarketPrice,
  getSecondaryPriceData,
  hasRecentSecondaryData
};