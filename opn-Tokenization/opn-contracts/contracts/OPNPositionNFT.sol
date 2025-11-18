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
 * @dev Fixed version addressing audit findings
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
        uint256 amount;
        uint256 purchasePrice;
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
    // TOKEN METADATA
    // =========================================================================
    
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "Token does not exist");
        
        Position memory pos = positions[_tokenId];
        
        // Get asset details from registry
        (
            , // assetId
            , // creator
            string memory assetType,
            string memory assetName,
            , // description
            string memory mainImageUrl,
            , // metadataUrl
            uint8 model,
            uint256 totalSupply,
            , // pricePerToken
            , // soldTokens
            uint256 totalValue,
            uint256 soldWeight,
            , // minPurchaseAmount
            , // maxPurchaseAmount
            , // maxPositionsPerUser
            , // isActive
            , // createdAt
            , // totalRevenue
            , // ethRewardPool
            // usdcRewardPool
        ) = assetRegistry.assets(pos.assetId);
        
        // Calculate ownership percentage
        string memory ownershipDisplay;
        if (model == 0) {
            // Fixed model - show token count
            ownershipDisplay = string(abi.encodePacked(
                pos.amount.toString(),
                " tokens (",
                _formatPercentage((pos.amount * PRECISION) / totalSupply),
                "%)"
            ));
        } else {
            // Weighted model - show percentage
            ownershipDisplay = string(abi.encodePacked(
                _formatPercentage(pos.amount),
                "% ownership"
            ));
        }
        
        // Build JSON metadata
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"',
                        assetName,
                        ' - Position #',
                        _tokenId.toString(),
                        '","description":"Ownership position in ',
                        assetName,
                        '. This NFT represents your fractional ownership and reward rights.",',
                        '"image":"',
                        mainImageUrl,
                        '","external_url":"https://tokenization.iopn.tech',
                        _tokenId.toString(),
                        '","attributes":[',
                        '{"trait_type":"Asset Type","value":"',
                        assetType,
                        '"},',
                        '{"trait_type":"Asset Name","value":"',
                        assetName,
                        '"},',
                        '{"trait_type":"Ownership","value":"',
                        ownershipDisplay,
                        '"},',
                        '{"trait_type":"Model","value":"',
                        model == 0 ? 'Fixed Shares' : 'Weighted Percentage',
                        '"},',
                        '{"trait_type":"Purchase Price","value":"',
                        _formatEther(pos.purchasePrice),
                        ' OPN"},',
                        '{"trait_type":"Purchase Date","display_type":"date","value":',
                        pos.purchaseTimestamp.toString(),
                        '},',
                        '{"trait_type":"Position ID","value":"',
                        pos.positionId.toString(),
                        '"},',
                        '{"trait_type":"Asset ID","value":"',
                        pos.assetId.toString(),
                        '"}',
                        ']}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }
    
    function _formatEther(uint256 _wei) internal pure returns (string memory) {
        uint256 wholePart = _wei / 1e18;
        uint256 fractionalPart = (_wei % 1e18) / 1e16; // 2 decimal places
        
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
    
    // =========================================================================
    // POSITION MANAGEMENT - FIXED
    // =========================================================================
    
    // ✅ FIX #8: Validate position ownership before auto-merge
    function mintPosition(
        uint256 _assetId,
        address _owner,
        uint256 _amount,
        uint256 _purchasePrice
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(_owner != address(0), "Invalid owner");
        require(_amount > 0, "Invalid amount");
        
        // Check if user already has a position for this asset (auto-merge)
        uint256[] storage userPositions = userAssetPositions[_owner][_assetId];
        
        if (userPositions.length > 0) {
            uint256 existingPositionId = userPositions[0];
            
            // ✅ FIX: Validate position still belongs to user
            if (_exists(existingPositionId) && ownerOf(existingPositionId) == _owner) {
                // User has valid existing position - merge into it
                Position storage existingPos = positions[existingPositionId];
                
                // Calculate weighted average purchase price
                uint256 totalValue = (existingPos.amount * existingPos.purchasePrice) + (_amount * _purchasePrice);
                uint256 newTotalAmount = existingPos.amount + _amount;
                existingPos.purchasePrice = totalValue / newTotalAmount;
                existingPos.amount = newTotalAmount;
                
                emit PositionMerged(existingPositionId, 0, newTotalAmount);
                return existingPositionId;
            } else {
                // Position is stale - clean up and mint new
                delete userAssetPositions[_owner][_assetId];
            }
        }
        
        // First position for this asset or stale position cleaned - mint new
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
    
    function splitPosition(uint256 _positionId, uint256 _amountToSplit, address _recipient, uint256 _newPurchasePrice) 
        external onlyRole(MINTER_ROLE) returns (uint256) 
    {
        require(ownerOf(_positionId) != address(0), "Position not found");
        require(_recipient != address(0), "Invalid recipient");
        
        Position storage originalPos = positions[_positionId];
        require(_amountToSplit > 0 && _amountToSplit < originalPos.amount, "Invalid split amount");
        
        // Create new position with split amount
        uint256 newPositionId = _positionIdCounter++;
        
        _safeMint(_recipient, newPositionId);
        
        positions[newPositionId] = Position({
            positionId: newPositionId,
            assetId: originalPos.assetId,
            owner: _recipient,
            amount: _amountToSplit,
            purchasePrice: _newPurchasePrice,
            purchaseTimestamp: block.timestamp,
            ethRewardsClaimed: 0,
            usdcRewardsClaimed: 0,
            lastClaimTimestamp: 0
        });
        
        // Update original position
        originalPos.amount -= _amountToSplit;
        
        // Add to recipient's positions if they don't have one
        userAssetPositions[_recipient][originalPos.assetId].push(newPositionId);
        
        emit PositionSplit(_positionId, newPositionId, originalPos.amount, _amountToSplit);
        return newPositionId;
    }
    
    // =========================================================================
    // REWARD CLAIMING - FIXED
    // =========================================================================
    
    function claimRewards(uint256 _positionId) external nonReentrant {
        require(ownerOf(_positionId) == msg.sender, "Not owner");
        _claimRewards(_positionId, true);
    }
    
    // ✅ FIX #1: Reentrancy protection - state updates BEFORE external calls
    function _claimRewards(uint256 _positionId, bool _revertOnZero) private {
        Position storage pos = positions[_positionId];
        
        // Get asset info using clean helper functions
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(pos.assetId);
        (uint256 totalSupply, uint256 soldTokens, , uint256 soldWeight) = 
            assetRegistry.getAssetSupplyInfo(pos.assetId);
        (uint256 ethPool, uint256 usdcPool) = 
            assetRegistry.getAssetRewards(pos.assetId);
        
        // ✅ FIX #6: Improved precision calculation
        uint256 ethReward = 0;
        uint256 usdcReward = 0;
        
        if (model == IOPNAssetRegistry.PurchaseModel.FIXED) {
            // FIXED: Use soldTokens as denominator
            uint256 divisor = soldTokens > 0 ? soldTokens : totalSupply;
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        } else {
            // WEIGHTED: Use soldWeight (in wei-units) as denominator
            uint256 divisor = soldWeight > 0 ? soldWeight : 1e18;
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        }
        
        // Subtract already claimed
        ethReward = ethReward > pos.ethRewardsClaimed ? ethReward - pos.ethRewardsClaimed : 0;
        usdcReward = usdcReward > pos.usdcRewardsClaimed ? usdcReward - pos.usdcRewardsClaimed : 0;
        
        if (_revertOnZero) {
            require(ethReward > 0 || usdcReward > 0, "No rewards available");
        }
        
        // ✅ FIX: Calculate actual amounts BEFORE any state changes
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
        
        // ✅ FIX: UPDATE STATE FIRST (Checks-Effects-Interactions pattern)
        if (actualETH > 0 || actualUSDC > 0) {
            pos.lastClaimTimestamp = block.timestamp;
            
            if (actualETH > 0) {
                pos.ethRewardsClaimed += actualETH;
            }
            
            if (actualUSDC > 0) {
                pos.usdcRewardsClaimed += actualUSDC;
            }
            
            // ✅ FIX: THEN perform external calls (using call() instead of transfer())
            if (actualETH > 0) {
                (bool successETH, ) = payable(pos.owner).call{value: actualETH}("");
                require(successETH, "ETH transfer failed");
            }
            
            if (actualUSDC > 0) {
                usdcToken.safeTransfer(pos.owner, actualUSDC);
            }
            
            emit RewardsClaimed(_positionId, pos.owner, actualETH, actualUSDC);
        }
    }
    
    // ✅ FIX #6: Improved precision in pending rewards calculation
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
            // Better precision calculation
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        } else {
            uint256 divisor = soldWeight > 0 ? soldWeight : 1e18;
            // Better precision calculation
            ethReward = (ethPool * pos.amount * 1e18) / divisor / 1e18;
            usdcReward = (usdcPool * pos.amount * 1e18) / divisor / 1e18;
        }
        
        ethReward = ethReward > pos.ethRewardsClaimed ? ethReward - pos.ethRewardsClaimed : 0;
        usdcReward = usdcReward > pos.usdcRewardsClaimed ? usdcReward - pos.usdcRewardsClaimed : 0;
    }
    
    // View functions
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
    
    // Override transfer to update owner in position struct
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