// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IOPNAssetRegistry {
    enum PurchaseModel { FIXED, WEIGHTED }
    
    function getAssetModel(uint256 _assetId) external view returns (PurchaseModel);
    function getAssetSupplyInfo(uint256 _assetId) external view returns (uint256,uint256,uint256,uint256);
    function getAssetRewards(uint256 _assetId) external view returns (uint256,uint256);
    function recordSale(uint256 _assetId, uint256 _tokensOrWeight, uint256 _revenue) external;
    function assets(uint256) external view returns (
        uint256 assetId,
        address creator,
        string memory assetType,
        string memory assetName,
        string memory assetDescription,
        string memory mainImageUrl,
        string memory metadataUrl,
        uint8 model,
        uint256 totalSupply,
        uint256 pricePerToken,
        uint256 soldTokens,
        uint256 totalValue,
        uint256 soldWeight,
        uint256 minPurchaseAmount,
        uint256 maxPurchaseAmount,
        uint256 maxPositionsPerUser,
        bool isActive,
        uint256 createdAt,
        uint256 totalRevenue,
        uint256 ethRewardPool,
        uint256 usdcRewardPool
    );
}

/**
 * @title OPNPositionNFT - FIXED VERSION
 * @notice ERC721 NFT representing ownership positions with auto-merge
 * @dev CRITICAL FIX: purchasePrice now correctly accumulates total cost basis on merge
 */
contract OPNPositionNFT is ERC721Enumerable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 public constant PRECISION = 1e18;
    
    struct Position {
        uint256 positionId;
        uint256 assetId;
        address owner;
        uint256 amount;              // For FIXED: token count, for WEIGHTED: wei-units (1e18 = 100%)
        uint256 purchasePrice;       // Total cost basis in wei (accumulated on merge)
        uint256 purchaseTimestamp;
        uint256 ethRewardsClaimed;
        uint256 usdcRewardsClaimed;
        uint256 lastClaimTimestamp;
    }
    
    IOPNAssetRegistry public assetRegistry;
    IERC20 public usdcToken;
    
    uint256 private _positionIdCounter;
    mapping(uint256 => Position) public positions;
    mapping(address => mapping(uint256 => uint256[])) private userAssetPositions;
    
    event PositionMinted(uint256 indexed positionId, uint256 indexed assetId, address indexed owner, uint256 amount, uint256 purchasePrice);
    event PositionSplit(uint256 indexed originalPositionId, uint256 indexed newPositionId, uint256 originalAmount, uint256 splitAmount);
    event PositionMerged(uint256 indexed keepPositionId, uint256 indexed burnPositionId, uint256 newTotalAmount);
    event RewardsClaimed(uint256 indexed positionId, address indexed owner, uint256 ethAmount, uint256 usdcAmount);
    
    constructor(address _assetRegistry, address _usdcToken) 
        ERC721("OPN Position NFT", "OPNPOS") 
    {
        require(_assetRegistry != address(0), "Invalid registry address");
        require(_usdcToken != address(0), "Invalid USDC address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        assetRegistry = IOPNAssetRegistry(_assetRegistry);
        usdcToken = IERC20(_usdcToken);
    }
    
    // =========================================================================
    // POSITION MANAGEMENT - FIXED
    // =========================================================================
    
    /**
     * @notice Mint a new position or merge with existing position
     * @param _assetId Asset ID
     * @param _owner Position owner
     * @param _amount Amount being purchased (tokens or wei-units)
     * @param _purchasePrice Total cost of this purchase in wei
     * @return positionId The position ID (new or existing)
     * 
     * ✅ CRITICAL FIX: purchasePrice now accumulates correctly
     * 
     * Previous version incorrectly calculated weighted average:
     *   totalValue = (existingPos.amount * existingPos.purchasePrice) + (_amount * _purchasePrice)
     *   existingPos.purchasePrice = totalValue / newTotalAmount
     * 
     * This was wrong because:
     * - amount is in wei-units (e.g., 0.001% = 1e16)
     * - purchasePrice should be TOTAL cost basis, not per-unit price
     * 
     * New version simply accumulates total cost:
     *   existingPos.purchasePrice = existingPos.purchasePrice + _purchasePrice
     */
    function mintPosition(
        uint256 _assetId,
        address _owner,
        uint256 _amount,
        uint256 _purchasePrice
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(_owner != address(0), "Invalid owner");
        require(_amount > 0, "Invalid amount");
        
        // Record sale in registry
        assetRegistry.recordSale(_assetId, _amount, _purchasePrice);
        
        uint256[] storage userPositions = userAssetPositions[_owner][_assetId];
        
        // Check if user already has a position for this asset (auto-merge)
        if (userPositions.length > 0) {
            uint256 existingPositionId = userPositions[0];
            
            if (_exists(existingPositionId) && ownerOf(existingPositionId) == _owner) {
                Position storage existingPos = positions[existingPositionId];
                
                // ✅ FIX: Simply accumulate total cost basis
                existingPos.purchasePrice = existingPos.purchasePrice + _purchasePrice;
                existingPos.amount = existingPos.amount + _amount;
                
                emit PositionMerged(existingPositionId, 0, existingPos.amount);
                return existingPositionId;
            } else {
                // Clean up invalid position reference
                delete userAssetPositions[_owner][_assetId];
            }
        }
        
        // Create new position
        uint256 positionId = _positionIdCounter++;
        
        _safeMint(_owner, positionId);
        
        positions[positionId] = Position({
            positionId: positionId,
            assetId: _assetId,
            owner: _owner,
            amount: _amount,
            purchasePrice: _purchasePrice,
            purchaseTimestamp: block.timestamp,
            ethRewardsClaimed: 0,
            usdcRewardsClaimed: 0,
            lastClaimTimestamp: 0
        });
        
        userAssetPositions[_owner][_assetId].push(positionId);
        
        emit PositionMinted(positionId, _assetId, _owner, _amount, _purchasePrice);
        return positionId;
    }
    
    /**
     * @notice Split a position for secondary market sales
     * @param _positionId Position to split
     * @param _amountToSplit Amount to split off
     * @param _recipient Buyer receiving the split position
     * @param _newPurchasePrice Buyer's actual purchase price
     * @return newPositionId The newly created position ID
     * 
     * This proportionally adjusts the cost basis of both positions
     */
    function splitPosition(
        uint256 _positionId, 
        uint256 _amountToSplit, 
        address _recipient, 
        uint256 _newPurchasePrice
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(ownerOf(_positionId) != address(0), "Position not found");
        require(_recipient != address(0), "Invalid recipient");
        
        Position storage originalPos = positions[_positionId];
        require(_amountToSplit > 0 && _amountToSplit < originalPos.amount, "Invalid split amount");
        
        // Calculate proportional cost basis
        uint256 originalAmount = originalPos.amount;
        uint256 remainingAmount = originalAmount - _amountToSplit;
        
        // How much of original cost basis goes to the split
        uint256 splitCostBasis = (originalPos.purchasePrice * _amountToSplit) / originalAmount;
        uint256 remainingCostBasis = originalPos.purchasePrice - splitCostBasis;
        
        // Create new position for buyer
        uint256 newPositionId = _positionIdCounter++;
        
        _safeMint(_recipient, newPositionId);
        
        positions[newPositionId] = Position({
            positionId: newPositionId,
            assetId: originalPos.assetId,
            owner: _recipient,
            amount: _amountToSplit,
            purchasePrice: _newPurchasePrice,  // Buyer's actual purchase price
            purchaseTimestamp: block.timestamp,
            ethRewardsClaimed: 0,
            usdcRewardsClaimed: 0,
            lastClaimTimestamp: 0
        });
        
        // Update original position
        originalPos.amount = remainingAmount;
        originalPos.purchasePrice = remainingCostBasis;  // Proportional cost basis
        
        // Add to recipient's positions
        userAssetPositions[_recipient][originalPos.assetId].push(newPositionId);
        
        emit PositionSplit(_positionId, newPositionId, remainingAmount, _amountToSplit);
        return newPositionId;
    }
    
    // =========================================================================
    // REWARD CLAIMING
    // =========================================================================
    
    function claimRewards(uint256 _positionId) external nonReentrant {
        require(ownerOf(_positionId) == msg.sender, "Not owner");
        _claimRewards(_positionId, true);
    }
    
    function _claimRewards(uint256 _positionId, bool _revertOnZero) private {
        Position storage pos = positions[_positionId];
        
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(pos.assetId);
        (uint256 totalSupply, uint256 soldTokens, , uint256 soldWeight) = 
            assetRegistry.getAssetSupplyInfo(pos.assetId);
        (uint256 ethPool, uint256 usdcPool) = 
            assetRegistry.getAssetRewards(pos.assetId);
        
        uint256 ethReward = 0;
        uint256 usdcReward = 0;
        
        if (model == IOPNAssetRegistry.PurchaseModel.FIXED) {
            uint256 divisor = soldTokens > 0 ? soldTokens : totalSupply;
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        } else {
            uint256 divisor = soldWeight > 0 ? soldWeight : 1e18;
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        }
        
        ethReward = ethReward > pos.ethRewardsClaimed ? ethReward - pos.ethRewardsClaimed : 0;
        usdcReward = usdcReward > pos.usdcRewardsClaimed ? usdcReward - pos.usdcRewardsClaimed : 0;
        
        if (_revertOnZero) {
            require(ethReward > 0 || usdcReward > 0, "No rewards available");
        }
        
        uint256 actualETH = 0;
        uint256 actualUSDC = 0;
        
        if (ethReward > 0) {
            uint256 availableETH = address(this).balance;
            actualETH = ethReward > availableETH ? availableETH : ethReward;
        }
        
        if (usdcReward > 0) {
            uint256 availableUSDC = usdcToken.balanceOf(address(this));
            actualUSDC = usdcReward > availableUSDC ? availableUSDC : usdcReward;
        }
        
        if (actualETH > 0) {
            pos.ethRewardsClaimed += actualETH;
            (bool success, ) = payable(msg.sender).call{value: actualETH}("");
            require(success, "ETH transfer failed");
        }
        
        if (actualUSDC > 0) {
            pos.usdcRewardsClaimed += actualUSDC;
            usdcToken.safeTransfer(msg.sender, actualUSDC);
        }
        
        pos.lastClaimTimestamp = block.timestamp;
        
        emit RewardsClaimed(_positionId, msg.sender, actualETH, actualUSDC);
    }
    
    function calculatePendingRewards(uint256 _positionId) 
        external view returns (uint256 ethReward, uint256 usdcReward) 
    {
        Position storage pos = positions[_positionId];
        
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(pos.assetId);
        (uint256 totalSupply, uint256 soldTokens, , uint256 soldWeight) = 
            assetRegistry.getAssetSupplyInfo(pos.assetId);
        (uint256 ethPool, uint256 usdcPool) = 
            assetRegistry.getAssetRewards(pos.assetId);
        
        if (model == IOPNAssetRegistry.PurchaseModel.FIXED) {
            uint256 divisor = soldTokens > 0 ? soldTokens : totalSupply;
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        } else {
            uint256 divisor = soldWeight > 0 ? soldWeight : 1e18;
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        }
        
        ethReward = ethReward > pos.ethRewardsClaimed ? ethReward - pos.ethRewardsClaimed : 0;
        usdcReward = usdcReward > pos.usdcRewardsClaimed ? usdcReward - pos.usdcRewardsClaimed : 0;
    }
    
    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================
    
    function getUserPositions(address _user, uint256 _assetId) 
        external view returns (uint256[] memory) 
    {
        return userAssetPositions[_user][_assetId];
    }
    
    function getUserPositionCount(address _user, uint256 _assetId) 
        external view returns (uint256) 
    {
        return userAssetPositions[_user][_assetId].length;
    }
    
    function getPositionDetails(uint256 _positionId) 
        external view returns (Position memory) 
    {
        return positions[_positionId];
    }
    
    // =========================================================================
    // TOKEN URI (NFT METADATA)
    // =========================================================================
    
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "Token does not exist");
        
        Position storage pos = positions[_tokenId];
        (, , , , , , , uint8 model, , , , , , , , , , , , , ) = 
            assetRegistry.assets(pos.assetId);
        
        string memory amountDisplay = model == 0 
            ? string(abi.encodePacked(_formatNumber(pos.amount), " Shares"))
            : string(abi.encodePacked(_formatPercentage(pos.amount), "%"));
        
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"OPN Position #',
                        pos.positionId.toString(),
                        '","description":"Ownership position in tokenized asset","attributes":[',
                        '{"trait_type":"Amount","value":"',
                        amountDisplay,
                        '"},',
                        '{"trait_type":"Model","value":"',
                        model == 0 ? 'Fixed Shares' : 'Weighted Percentage',
                        '"},',
                        '{"trait_type":"Purchase Price","value":"',
                        _formatEther(pos.purchasePrice),
                        ' OPN"},',
                        '{"trait_type":"Purchase Date","display_type":"date","value":',
                        pos.purchaseTimestamp.toString(),
                        '}]}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }
    
    function _formatEther(uint256 _wei) internal pure returns (string memory) {
        uint256 wholePart = _wei / 1e18;
        uint256 fractionalPart = (_wei % 1e18) / 1e16;
        
        if (fractionalPart == 0) {
            return wholePart.toString();
        }
        
        return string(abi.encodePacked(
            wholePart.toString(),
            ".",
            fractionalPart < 10 ? "0" : "",
            fractionalPart.toString()
        ));
    }
    
    function _formatPercentage(uint256 _weiUnits) internal pure returns (string memory) {
        uint256 percentage = (_weiUnits * 10000) / 1e18;
        uint256 wholePart = percentage / 100;
        uint256 fractionalPart = percentage % 100;
        
        if (fractionalPart == 0) {
            return wholePart.toString();
        }
        
        return string(abi.encodePacked(
            wholePart.toString(),
            ".",
            fractionalPart < 10 ? "0" : "",
            fractionalPart.toString()
        ));
    }
    
    function _formatNumber(uint256 _number) internal pure returns (string memory) {
        return _number.toString();
    }
    
    // =========================================================================
    // OVERRIDES
    // =========================================================================
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            positions[firstTokenId].owner = to;
        }
    }
    
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    receive() external payable {}
}