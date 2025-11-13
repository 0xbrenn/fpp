// src/utils/contracts.js
import { ethers } from 'ethers';

// Tokenization Contract ABI - CORRECT for deployed contract
export const TOKENIZATION_ABI = [
  // Constructor
  "constructor(string _uri, address _feeRecipient)",
  
  // Admin Management
  "function addAdmin(address _newAdmin)",
  "function removeAdmin(address _admin)",
  "function getAllAdmins() view returns (address[])",
  "function getAdminCount() view returns (uint256)",
  "function isAdmin(address account) view returns (bool)",
  
  // Asset Management (Admin only)
  "function createAsset(string _assetType, string _assetName, string _assetDescription, string _mainImageUrl, string _metadataUrl, uint256 _totalSupply, uint256 _pricePerFraction, uint256 _minPurchaseAmount, uint256 _maxPurchaseAmount) returns (uint256)",
  "function addAssetImage(uint256 _tokenId, string _imageUrl)",
  "function editAsset(uint256 _tokenId, string _name, string _desc, string _img, uint256 _price)",
  "function deactivateAsset(uint256 _tokenId)",
  "function updatePlatformFee(uint256 _newFee)",
  "function updateFeeRecipient(address _newRecipient)",
  "function pause()",
  "function unpause()",
  
  // Buy/Sell Functions
  "function purchaseFractions(uint256 _tokenId, uint256 _amount) payable",
  "function sellFractions(uint256 _tokenId, uint256 _amount)",
  
  // DAO Governance Functions
  "function createProposal(uint256 _assetId, string _ipfsHash, uint256 _estimatedCost, uint256 _votingPeriodDays) returns (uint256)",
  "function vote(uint256 _proposalId, bool _support)",
  "function executeProposal(uint256 _proposalId)",
  "function cancelProposal(uint256 _proposalId)",
  "function proposals(uint256) view returns (uint256 id, uint256 assetId, address proposer, string ipfsHash, uint256 estimatedCost, uint256 votingDeadline, uint256 yesVotes, uint256 noVotes, uint256 totalVoted, bool executed, bool cancelled)",
  "function getAssetProposalCount(uint256 _assetId) view returns (uint256)",
  "function hasVoted(uint256 _proposalId, address _voter) view returns (bool)",
  "function voteChoice(uint256 _proposalId, address _voter) view returns (bool)",
  
  // Asset View Functions - CRITICAL: NO imageUrls[] in assetDetails!
  "function assetDetails(uint256) view returns (uint256 tokenId, address creator, string assetType, string assetName, string assetDescription, string mainImageUrl, string metadataUrl, uint256 totalSupply, uint256 availableSupply, uint256 pricePerFraction, uint256 minPurchaseAmount, uint256 maxPurchaseAmount, bool isActive, uint256 totalRevenue, uint256 totalInvestors, uint256 createdAt)",
  "function getActiveAssets(uint256 offset, uint256 limit) view returns (uint256[] assetIds, bool hasMore)",
  "function getAssetImages(uint256 _tokenId) view returns (string[])",
  "function getUserTokens(address _user) view returns (uint256[])",
  "function getUserShares(address _user, uint256 _tokenId) view returns (uint256)",
  "function getAssetHolders(uint256 _tokenId) view returns (address[])",
  "function calculatePurchaseCost(uint256 _tokenId, uint256 _amount) view returns (uint256 c, uint256 f, uint256 t)",
  "function platformFee() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  "function paused() view returns (bool)",
  
  // ERC1155 Functions
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
  
  // Access Control
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function renounceRole(bytes32 role, address account)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  
  // Events
  "event AssetCreated(uint256 indexed tokenId, address indexed creator, string assetName, uint256 totalSupply, uint256 pricePerFraction)",
  "event FractionsPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost)",
  "event FractionsSold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 totalReceived)",
  "event ProposalCreated(uint256 indexed proposalId, uint256 indexed assetId, address indexed proposer, string ipfsHash)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)",
  "event ProposalExecuted(uint256 indexed proposalId)",
  "event ProposalCancelled(uint256 indexed proposalId)",
  "event AssetDeactivated(uint256 indexed tokenId)",
  "event PlatformFeeUpdated(uint256 newFee)",
  "event AdminAdded(address indexed admin, address indexed addedBy)",
  "event AdminRemoved(address indexed admin, address indexed removedBy)",
  "event Paused(address account)",
  "event Unpaused(address account)"
];

// For backwards compatibility
export const Tokenization_ABI = TOKENIZATION_ABI;

// Dummy KYC ABI for compatibility
export const KYC_ABI = [];

// Contract addresses
export const CONTRACTS = {
  opn: {
    tokenization: '0xf39aEAF70eF82fc53627e5e21CC042B699F014CF',
    fractionalization: '0xf39aEAF70eF82fc53627e5e21CC042B699F014CF', // Alias
    kyc: '0x0000000000000000000000000000000000000000' // Dummy address
  },
  sage: {
    tokenization: '0xf39aEAF70eF82fc53627e5e21CC042B699F014CF',
    fractionalization: '0xf39aEAF70eF82fc53627e5e21CC042B699F014CF',
    kyc: '0x0000000000000000000000000000000000000000'
  }
};

// Helper function to get contract
export const getContract = (contractName, signer) => {
  const address = CONTRACTS.opn[contractName];
  const abi = contractName === 'tokenization' ? TOKENIZATION_ABI : [];
  return new ethers.Contract(address, abi, signer);
};

export const getNetworkName = (chainId) => {
  switch (chainId) {
    case 1: return 'mainnet';
    case 137: return 'polygon';
    case 42161: return 'arbitrum';
    case 403: return 'sage';  // SAGE network chainId is 403
    case 984: return 'opn';   // Keep for compatibility
    default: return 'sage';
  }
};

export const estimateGas = async (contract, method, args, value = '0') => {
  try {
    const gasEstimate = await contract.estimateGas[method](...args, { value });
    return gasEstimate.mul(110).div(100); // Add 10% buffer
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
};

export const formatBalance = (balance, decimals = 18) => {
  return ethers.utils.formatUnits(balance, decimals);
};

export const parseAmount = (amount, decimals = 18) => {
  return ethers.utils.parseUnits(amount.toString(), decimals);
};

// Constants
export const PRICE_PRECISION = ethers.utils.parseEther('1'); // 1e18
export const BASIS_POINTS = 10000;
export const MAX_PLATFORM_FEE = 1000; // 10%

// Enums
export const ShareType = {
  WeightedShares: 0,
  EqualShares: 1
};

export const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3
};

// Proposal Status
export const ProposalStatus = {
  Active: 'active',
  Executed: 'executed',
  Cancelled: 'cancelled',
  Expired: 'expired'
};