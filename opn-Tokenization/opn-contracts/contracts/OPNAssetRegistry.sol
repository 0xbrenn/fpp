// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title OPNAssetRegistry - FINAL VERSION WITH SECONDARY MARKET PRICING
 * @notice Central registry for tokenized real-world assets
 * @dev Includes dynamic pricing based on secondary market sales
 */
contract OPNAssetRegistry is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    uint256 public constant PRECISION = 1e18;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    enum PurchaseModel { FIXED, WEIGHTED }
    
    struct Asset {
        uint256 assetId;
        address creator;
        string assetType;
        string assetName;
        string assetDescription;
        string mainImageUrl;
        string metadataUrl;
        
        PurchaseModel model;
        
        // Fixed Model
        uint256 totalSupply;
        uint256 pricePerToken;
        uint256 soldTokens;
        
        // Weighted Model
        uint256 totalValue;
        uint256 soldWeight;
        
        // Limits
        uint256 minPurchaseAmount;
        uint256 maxPurchaseAmount;
        uint256 maxPositionsPerUser;
        
        // State
        bool isActive;
        uint256 createdAt;
        uint256 totalRevenue;
        
        // Rewards
        uint256 ethRewardPool;
        uint256 usdcRewardPool;
    }
    
    // ✅ NEW: Secondary market pricing
    struct SecondaryPrice {
        uint256 price;           // Last recorded secondary market price
        uint256 lastUpdateTime;  // When price was last updated
        bool hasSecondaryData;   // Whether secondary market sales have occurred
    }
    
    uint256 private _assetIdCounter;
    mapping(uint256 => Asset) public assets;
    mapping(uint256 => string[]) private assetImageUrls;
    uint256[] public activeAssetIds;
    
    // ✅ NEW: Track secondary market prices
    mapping(uint256 => SecondaryPrice) public secondaryPrices;
    
    // Admin tracking
    address[] private adminAddresses;
    mapping(address => bool) private isAdminTracked;
    mapping(address => uint256) private adminIndex;
    
    // Contract addresses
    address public positionNFTContract;
    address public secondaryMarketContract;
    
    IERC20 public usdcToken;
    
    event AssetCreated(
        uint256 indexed assetId,
        address indexed creator,
        string assetName,
        PurchaseModel model,
        uint256 totalSupplyOrValue
    );
    event AssetEdited(uint256 indexed assetId);
    event AssetDeactivated(uint256 indexed assetId);
    event RewardsDeposited(uint256 indexed assetId, uint256 ethAmount, uint256 usdcAmount);
    event ImageAdded(uint256 indexed assetId, string imageUrl);
    // ✅ NEW: Secondary market price update event
    event SecondaryPriceUpdated(uint256 indexed assetId, uint256 newPrice, uint256 timestamp);
    
    constructor(address _usdcToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        adminAddresses.push(msg.sender);
        isAdminTracked[msg.sender] = true;
        adminIndex[msg.sender] = 0;
        
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
    }
    
    function setPositionNFTContract(address _positionNFT) external onlyRole(ADMIN_ROLE) {
        require(positionNFTContract == address(0), "Already set");
        positionNFTContract = _positionNFT;
    }
    
    // ✅ NEW: Set secondary market contract
    function setSecondaryMarketContract(address _secondaryMarket) external onlyRole(ADMIN_ROLE) {
        require(secondaryMarketContract == address(0), "Already set");
        secondaryMarketContract = _secondaryMarket;
    }
    
    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================
    
    function getAssetCreator(uint256 _assetId) external view returns (address) {
        return assets[_assetId].creator;
    }
    
    function getAssetModel(uint256 _assetId) external view returns (PurchaseModel) {
        return assets[_assetId].model;
    }
    
    function isAssetActive(uint256 _assetId) external view returns (bool) {
        return assets[_assetId].isActive;
    }
    
    function getAssetSupplyInfo(uint256 _assetId) external view returns (
        uint256 totalSupply,
        uint256 soldTokens,
        uint256 totalValue,
        uint256 soldWeight
    ) {
        Asset storage a = assets[_assetId];
        return (a.totalSupply, a.soldTokens, a.totalValue, a.soldWeight);
    }
    
    function getAssetLimits(uint256 _assetId) external view returns (
        uint256 minPurchase,
        uint256 maxPurchase,
        uint256 maxPositions
    ) {
        Asset storage a = assets[_assetId];
        return (a.minPurchaseAmount, a.maxPurchaseAmount, a.maxPositionsPerUser);
    }
    
    function getAssetRewards(uint256 _assetId) external view returns (
        uint256 ethRewardPool,
        uint256 usdcRewardPool
    ) {
        Asset storage a = assets[_assetId];
        return (a.ethRewardPool, a.usdcRewardPool);
    }
    
    // ✅ NEW: Get current market price (considers secondary market data)
    function getCurrentPrice(uint256 _assetId) external view returns (uint256) {
        Asset storage a = assets[_assetId];
        SecondaryPrice storage secPrice = secondaryPrices[_assetId];
        
        // If secondary market data exists and is recent (< 30 days)
        if (secPrice.hasSecondaryData && 
            block.timestamp - secPrice.lastUpdateTime < 30 days) {
            return secPrice.price;
        }
        
        // Otherwise return primary market price
        if (a.model == PurchaseModel.FIXED) {
            return a.pricePerToken;
        } else {
            return a.totalValue;
        }
    }
    
    // =========================================================================
    // ASSET CREATION
    // =========================================================================
    
    function createFixedAsset(
        string calldata _assetType,
        string calldata _assetName,
        string calldata _assetDescription,
        string calldata _mainImageUrl,
        string calldata _metadataUrl,
        uint256 _totalSupply,
        uint256 _pricePerToken,
        uint256 _minPurchaseAmount,
        uint256 _maxPurchaseAmount,
        uint256 _maxPositionsPerUser
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(_totalSupply > 0, "Invalid supply");
        require(_pricePerToken > 0, "Invalid price");
        require(bytes(_assetName).length > 0, "Name required");
        
        uint256 assetId = _assetIdCounter++;
        Asset storage a = assets[assetId];
        
        a.assetId = assetId;
        a.creator = msg.sender;
        a.assetType = _assetType;
        a.assetName = _assetName;
        a.assetDescription = _assetDescription;
        a.mainImageUrl = _mainImageUrl;
        a.metadataUrl = _metadataUrl;
        a.model = PurchaseModel.FIXED;
        a.totalSupply = _totalSupply;
        a.pricePerToken = _pricePerToken;
        a.minPurchaseAmount = _minPurchaseAmount;
        a.maxPurchaseAmount = _maxPurchaseAmount;
        a.maxPositionsPerUser = _maxPositionsPerUser;
        a.isActive = true;
        a.createdAt = block.timestamp;
        
        activeAssetIds.push(assetId);
        
        emit AssetCreated(assetId, msg.sender, _assetName, PurchaseModel.FIXED, _totalSupply);
        return assetId;
    }
    
    function createWeightedAsset(
        string calldata _assetType,
        string calldata _assetName,
        string calldata _assetDescription,
        string calldata _mainImageUrl,
        string calldata _metadataUrl,
        uint256 _totalValue,
        uint256 _minPurchaseWeight,
        uint256 _maxPurchaseWeight,
        uint256 _maxPositionsPerUser
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(_totalValue > 0, "Invalid value");
        require(bytes(_assetName).length > 0, "Name required");
        require(_minPurchaseWeight > 0 && _minPurchaseWeight <= PRECISION, "Invalid min weight");
        require(_maxPurchaseWeight == 0 || _maxPurchaseWeight <= PRECISION, "Invalid max weight");
        
        uint256 assetId = _assetIdCounter++;
        Asset storage a = assets[assetId];
        
        a.assetId = assetId;
        a.creator = msg.sender;
        a.assetType = _assetType;
        a.assetName = _assetName;
        a.assetDescription = _assetDescription;
        a.mainImageUrl = _mainImageUrl;
        a.metadataUrl = _metadataUrl;
        a.model = PurchaseModel.WEIGHTED;
        a.totalValue = _totalValue;
        a.minPurchaseAmount = _minPurchaseWeight;
        a.maxPurchaseAmount = _maxPurchaseWeight;
        a.maxPositionsPerUser = _maxPositionsPerUser;
        a.isActive = true;
        a.createdAt = block.timestamp;
        
        activeAssetIds.push(assetId);
        
        emit AssetCreated(assetId, msg.sender, _assetName, PurchaseModel.WEIGHTED, _totalValue);
        return assetId;
    }
    
    function addAssetImage(uint256 _assetId, string calldata _imageUrl) 
        external onlyRole(ADMIN_ROLE) 
    {
        require(assets[_assetId].creator != address(0), "Asset not found");
        require(assetImageUrls[_assetId].length < 25, "Max images reached");
        assetImageUrls[_assetId].push(_imageUrl);
        emit ImageAdded(_assetId, _imageUrl);
    }
    
    function editAsset(
        uint256 _assetId,
        string calldata _assetName,
        string calldata _assetDescription,
        string calldata _mainImageUrl,
        uint256 _priceOrValue
    ) external onlyRole(ADMIN_ROLE) {
        Asset storage a = assets[_assetId];
        require(a.creator != address(0), "Asset not found");
        
        a.assetName = _assetName;
        a.assetDescription = _assetDescription;
        a.mainImageUrl = _mainImageUrl;
        
        if (a.model == PurchaseModel.FIXED) {
            a.pricePerToken = _priceOrValue;
        } else {
            a.totalValue = _priceOrValue;
        }
        
        emit AssetEdited(_assetId);
    }
    
    function deactivateAsset(uint256 _assetId) external {
        Asset storage asset = assets[_assetId];
        require(asset.creator != address(0), "Asset not found");
        
        require(
            msg.sender == asset.creator || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only creator or super admin"
        );
        
        asset.isActive = false;
        emit AssetDeactivated(_assetId);
    }
    
    function depositRewards(uint256 _assetId, uint256 _usdcAmount) 
        external payable nonReentrant 
    {
        Asset storage a = assets[_assetId];
        require(msg.sender == a.creator, "Only creator");
        require(msg.value > 0 || _usdcAmount > 0, "No rewards");
        
        if (a.model == PurchaseModel.FIXED) {
            require(a.soldTokens > 0, "No tokens sold yet");
        } else {
            require(a.soldWeight > 0, "No weight sold yet");
        }
        
        if (msg.value > 0) {
            a.ethRewardPool += msg.value;
        }
        
        if (_usdcAmount > 0) {
            usdcToken.safeTransferFrom(msg.sender, address(this), _usdcAmount);
            a.usdcRewardPool += _usdcAmount;
        }
        
        emit RewardsDeposited(_assetId, msg.value, _usdcAmount);
    }
    
    function recordSale(uint256 _assetId, uint256 _tokensOrWeight, uint256 _revenue) 
        external 
    {
        require(msg.sender == positionNFTContract, "Only position NFT");
        Asset storage a = assets[_assetId];
        
        if (a.model == PurchaseModel.FIXED) {
            a.soldTokens += _tokensOrWeight;
        } else {
            a.soldWeight += _tokensOrWeight;
        }
        
        a.totalRevenue += _revenue;
    }
    
    // ✅ NEW: Update price from secondary market sales
    function updateSecondaryPrice(uint256 _assetId, uint256 _newPrice) external {
        require(msg.sender == secondaryMarketContract, "Only secondary market");
        
        secondaryPrices[_assetId] = SecondaryPrice({
            price: _newPrice,
            lastUpdateTime: block.timestamp,
            hasSecondaryData: true
        });
        
        emit SecondaryPriceUpdated(_assetId, _newPrice, block.timestamp);
    }
    
    function getAvailableSupply(uint256 _assetId) external view returns (uint256) {
        Asset storage a = assets[_assetId];
        if (a.model == PurchaseModel.FIXED) {
            return a.totalSupply - a.soldTokens;
        } else {
            return PRECISION - a.soldWeight;
        }
    }
    
    function calculatePurchaseCost(uint256 _assetId, uint256 _amount) 
        external view returns (uint256) 
    {
        Asset storage a = assets[_assetId];
        if (a.model == PurchaseModel.FIXED) {
            return a.pricePerToken * _amount;
        } else {
            return (a.totalValue * _amount) / PRECISION;
        }
    }
    
    function getAssetImages(uint256 _assetId) external view returns (string[] memory) {
        return assetImageUrls[_assetId];
    }
    
    function getActiveAssets(uint256 _offset, uint256 _limit) 
        external view returns (uint256[] memory ids, bool hasMore) 
    {
        uint256 total = activeAssetIds.length;
        if (_offset >= total) return (new uint256[](0), false);
        
        uint256 end = _offset + _limit > total ? total : _offset + _limit;
        uint256 len = end - _offset;
        
        ids = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            ids[i] = activeAssetIds[_offset + i];
        }
        
        hasMore = end < total;
    }
    
    // =========================================================================
    // ADMIN MANAGEMENT
    // =========================================================================
    
    function addAdmin(address _newAdmin) external onlyRole(ADMIN_ROLE) {
        require(_newAdmin != address(0), "Invalid address");
        require(!hasRole(ADMIN_ROLE, _newAdmin), "Already admin");
        
        grantRole(ADMIN_ROLE, _newAdmin);
        
        if (!isAdminTracked[_newAdmin]) {
            adminIndex[_newAdmin] = adminAddresses.length;
            adminAddresses.push(_newAdmin);
            isAdminTracked[_newAdmin] = true;
        }
    }
    
    function removeAdmin(address _admin) external onlyRole(ADMIN_ROLE) {
        require(_admin != address(0), "Invalid address");
        require(hasRole(ADMIN_ROLE, _admin), "Not admin");
        require(_admin != msg.sender, "Cannot remove self");
        
        revokeRole(ADMIN_ROLE, _admin);
        
        if (isAdminTracked[_admin]) {
            uint256 indexToRemove = adminIndex[_admin];
            uint256 lastIndex = adminAddresses.length - 1;
            address lastAdmin = adminAddresses[lastIndex];
            
            adminAddresses[indexToRemove] = lastAdmin;
            adminIndex[lastAdmin] = indexToRemove;
            
            adminAddresses.pop();
            delete adminIndex[_admin];
            isAdminTracked[_admin] = false;
        }
    }
    
    function getAllAdmins() external view returns (address[] memory) {
        return adminAddresses;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
    
    receive() external payable {}
}