// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IOPNAssetRegistry {
    function getAssetLimits(uint256 _assetId) external view returns (uint256,uint256,uint256);
}

interface IOPNPositionNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function positions(uint256) external view returns (uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256);
    function splitPosition(uint256 _positionId, uint256 _amountToSplit, address _recipient) external returns (uint256);
    function getUserPositionCount(address _user, uint256 _assetId) external view returns (uint256);
}

contract OPNSecondaryMarket is AccessControl, ReentrancyGuard, Pausable {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct Listing {
        uint256 listingId;
        uint256 positionId;
        address seller;
        uint256 assetId;
        uint256 amountListed; // tokens or basis points being sold
        uint256 price; // total price for the amount
        bool isPartialSale; // true if splitting position
        bool isActive;
        uint256 createdAt;
    }
    
    IOPNPositionNFT public positionNFT;
    IOPNAssetRegistry public assetRegistry;
    
    address public feeRecipient;
    uint256 public marketplaceFee = 200; // 2%
    
    uint256 private _listingIdCounter;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public positionToListing; // positionId => listingId
    uint256[] public activeListingIds;
    
    event Listed(uint256 indexed listingId, uint256 indexed positionId, address indexed seller, uint256 assetId, uint256 amount, uint256 price, bool isPartial);
    event ListingCancelled(uint256 indexed listingId);
    event PositionSold(uint256 indexed listingId, uint256 indexed positionId, address indexed buyer, address seller, uint256 amount, uint256 price, uint256 fee);
    event MarketplaceFeeUpdated(uint256 newFee);
    
    constructor(
        address _positionNFT,
        address _assetRegistry,
        address _feeRecipient
    ) {
        require(_positionNFT != address(0), "Invalid position NFT");
        require(_assetRegistry != address(0), "Invalid registry");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        positionNFT = IOPNPositionNFT(_positionNFT);
        assetRegistry = IOPNAssetRegistry(_assetRegistry);
        feeRecipient = _feeRecipient;
    }
    
    // =========================================================================
    // LISTING FUNCTIONS - CLEAN, NO COMMAS!
    // =========================================================================
    
    function listPosition(
        uint256 _positionId,
        uint256 _amountToSell,
        uint256 _price
    ) external nonReentrant whenNotPaused {
        require(positionNFT.ownerOf(_positionId) == msg.sender, "Not owner");
        require(_price > 0, "Invalid price");
        require(positionToListing[_positionId] == 0, "Already listed");
        
        // Get position details - clean, no commas!
        (,uint256 assetId,,uint256 totalAmount,,,,,) = positionNFT.positions(_positionId);
        
        require(_amountToSell > 0 && _amountToSell <= totalAmount, "Invalid amount");
        
        bool isPartial = _amountToSell < totalAmount;
        
        // Check NFT approval for full sales
        if (!isPartial) {
            require(
                IERC721(address(positionNFT)).getApproved(_positionId) == address(this) ||
                IERC721(address(positionNFT)).isApprovedForAll(msg.sender, address(this)),
                "Marketplace not approved"
            );
        }
        
        uint256 listingId = _listingIdCounter++;
        
        listings[listingId] = Listing({
            listingId: listingId,
            positionId: _positionId,
            seller: msg.sender,
            assetId: assetId,
            amountListed: _amountToSell,
            price: _price,
            isPartialSale: isPartial,
            isActive: true,
            createdAt: block.timestamp
        });
        
        positionToListing[_positionId] = listingId;
        activeListingIds.push(listingId);
        
        emit Listed(listingId, _positionId, msg.sender, assetId, _amountToSell, _price, isPartial);
    }
    
    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Not active");
        require(listing.seller == msg.sender, "Not seller");
        
        listing.isActive = false;
        delete positionToListing[listing.positionId];
        
        emit ListingCancelled(_listingId);
    }
    
    function buyPosition(uint256 _listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Not active");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        
        // Calculate fee
        uint256 fee = (listing.price * marketplaceFee) / 10000;
        uint256 totalCost = listing.price + fee;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Check max positions limit - clean, no commas!
        (,,uint256 maxPositions) = assetRegistry.getAssetLimits(listing.assetId);
        
        if (maxPositions > 0) {
            uint256 buyerPositionCount = positionNFT.getUserPositionCount(msg.sender, listing.assetId);
            require(buyerPositionCount < maxPositions, "Max positions reached");
        }
        
        // Mark as sold
        listing.isActive = false;
        delete positionToListing[listing.positionId];
        
        if (listing.isPartialSale) {
            // Split position - seller keeps remainder, buyer gets split
            uint256 newPositionId = positionNFT.splitPosition(
                listing.positionId,
                listing.amountListed,
                msg.sender
            );
            
            emit PositionSold(_listingId, newPositionId, msg.sender, listing.seller, listing.amountListed, listing.price, fee);
        } else {
            // Full transfer
            IERC721(address(positionNFT)).safeTransferFrom(listing.seller, msg.sender, listing.positionId);
            
            emit PositionSold(_listingId, listing.positionId, msg.sender, listing.seller, listing.amountListed, listing.price, fee);
        }
        
        // Transfer payments
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        payable(listing.seller).transfer(listing.price);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }
    
    function calculateBuyerCost(uint256 _listingId) 
        external view returns (uint256 price, uint256 fee, uint256 total) 
    {
        Listing storage listing = listings[_listingId];
        price = listing.price;
        fee = (price * marketplaceFee) / 10000;
        total = price + fee;
    }
    
    // View functions
    function getActiveListings(uint256 _offset, uint256 _limit) 
        external view returns (Listing[] memory results, bool hasMore) 
    {
        uint256 total = activeListingIds.length;
        if (_offset >= total) return (new Listing[](0), false);
        
        uint256 end = _offset + _limit > total ? total : _offset + _limit;
        uint256 len = end - _offset;
        
        results = new Listing[](len);
        for (uint256 i = 0; i < len; i++) {
            uint256 listingId = activeListingIds[_offset + i];
            if (listings[listingId].isActive) {
                results[i] = listings[listingId];
            }
        }
        
        hasMore = end < total;
    }
    
    function getListingsByAsset(uint256 _assetId, uint256 _offset, uint256 _limit) 
        external view returns (Listing[] memory results, bool hasMore) 
    {
        // Count matching listings
        uint256 matchCount = 0;
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            uint256 listingId = activeListingIds[i];
            if (listings[listingId].isActive && listings[listingId].assetId == _assetId) {
                matchCount++;
            }
        }
        
        if (_offset >= matchCount) return (new Listing[](0), false);
        
        uint256 end = _offset + _limit > matchCount ? matchCount : _offset + _limit;
        uint256 len = end - _offset;
        
        results = new Listing[](len);
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < activeListingIds.length && resultIndex < len; i++) {
            uint256 listingId = activeListingIds[i];
            if (listings[listingId].isActive && listings[listingId].assetId == _assetId) {
                if (currentIndex >= _offset) {
                    results[resultIndex] = listings[listingId];
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        hasMore = end < matchCount;
    }
    
    // Admin functions
    function updateMarketplaceFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _newFee;
        emit MarketplaceFeeUpdated(_newFee);
    }
    
    function updateFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
    
    receive() external payable {}
}