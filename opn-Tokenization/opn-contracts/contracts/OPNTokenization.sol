// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";  // Changed
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";  // Changed path
import "@openzeppelin/contracts/security/Pausable.sol";  // Changed path

contract OPNTokenization is ERC1155, AccessControl, ReentrancyGuard, Pausable, IERC1155Receiver {
    
    uint256 private _assetIdCounter;
    uint256 private _proposalIdCounter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public platformFee = 250;
    address public feeRecipient;

    struct AssetDetails {
        uint256 tokenId;
        address creator;
        string assetType;
        string assetName;
        string assetDescription;
        string mainImageUrl;
        string metadataUrl;
        uint256 totalSupply;
        uint256 availableSupply;
        uint256 pricePerFraction;
        uint256 minPurchaseAmount;
        uint256 maxPurchaseAmount;
        bool isActive;
        uint256 totalRevenue;
        uint256 totalInvestors;
        uint256 createdAt;
    }

    struct Proposal {
        uint256 id;
        uint256 assetId;
        address proposer;
        string ipfsHash;
        uint256 estimatedCost;
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalVoted;
        bool executed;
        bool cancelled;
    }

    mapping(uint256 => AssetDetails) public assetDetails;
    mapping(uint256 => string[]) private assetImageUrls;
    mapping(address => uint256[]) public userTokens;
    mapping(uint256 => mapping(address => uint256)) public userPurchases;
    mapping(uint256 => address[]) public assetHolders;
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256[]) public assetProposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteChoice;
    
    uint256[] public activeAssetIds;
    
    address[] private adminAddresses;
    mapping(address => bool) private isAdminTracked;

    event AssetCreated(uint256 indexed tokenId, address indexed creator, string assetName, uint256 totalSupply, uint256 pricePerFraction);
    event FractionsPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost);
    event FractionsSold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 totalReceived);
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed assetId, address indexed proposer, string ipfsHash);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event AssetDeactivated(uint256 indexed tokenId);
    event PlatformFeeUpdated(uint256 newFee);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);

    constructor(string memory _uri, address _feeRecipient) ERC1155(_uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        adminAddresses.push(msg.sender);
        isAdminTracked[msg.sender] = true;
        
        address specificAdmin = 0xD715011858545620E23ac58dB8c9c1bE212A41E5;
        _grantRole(ADMIN_ROLE, specificAdmin);
        
        if (specificAdmin != msg.sender) {
            adminAddresses.push(specificAdmin);
            isAdminTracked[specificAdmin] = true;
        }
        
        feeRecipient = _feeRecipient;
    }

    function createAsset(
        string calldata _assetType,
        string calldata _assetName,
        string calldata _assetDescription,
        string calldata _mainImageUrl,
        string calldata _metadataUrl,
        uint256 _totalSupply,
        uint256 _pricePerFraction,
        uint256 _minPurchaseAmount,
        uint256 _maxPurchaseAmount
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(_totalSupply > 0);
        require(_pricePerFraction > 0);
        require(bytes(_assetName).length > 0);

        uint256 tokenId = _assetIdCounter++;
        
        AssetDetails storage a = assetDetails[tokenId];
        a.tokenId = tokenId;
        a.creator = msg.sender;
        a.assetType = _assetType;
        a.assetName = _assetName;
        a.assetDescription = _assetDescription;
        a.mainImageUrl = _mainImageUrl;
        a.metadataUrl = _metadataUrl;
        a.totalSupply = _totalSupply;
        a.availableSupply = _totalSupply;
        a.pricePerFraction = _pricePerFraction;
        a.minPurchaseAmount = _minPurchaseAmount;
        a.maxPurchaseAmount = _maxPurchaseAmount;
        a.isActive = true;
        a.createdAt = block.timestamp;
        
        activeAssetIds.push(tokenId);
        _mint(address(this), tokenId, _totalSupply, "");

        emit AssetCreated(tokenId, msg.sender, _assetName, _totalSupply, _pricePerFraction);
        return tokenId;
    }

    function addAssetImage(uint256 _tokenId, string calldata _imageUrl) external onlyRole(ADMIN_ROLE) {
        require(assetDetails[_tokenId].creator != address(0));
        require(assetImageUrls[_tokenId].length < 25);
        assetImageUrls[_tokenId].push(_imageUrl);
    }

    function purchaseFractions(uint256 _tokenId, uint256 _amount) external payable nonReentrant whenNotPaused {
        AssetDetails storage a = assetDetails[_tokenId];
        require(a.isActive);
        require(_amount > 0);
        require(_amount <= a.availableSupply);
        require(_amount >= a.minPurchaseAmount);
        
        if (a.maxPurchaseAmount > 0) {
            require(balanceOf(msg.sender, _tokenId) + _amount <= a.maxPurchaseAmount);
        }

        uint256 c = a.pricePerFraction * _amount;
        uint256 f = (c * platformFee) / 10000;
        uint256 t = c + f;
        
        require(msg.value >= t);

        bool isNew = balanceOf(msg.sender, _tokenId) == 0;

        a.availableSupply -= _amount;
        a.totalRevenue += c;
        userPurchases[_tokenId][msg.sender] += _amount;
        
        if (isNew) {
            a.totalInvestors++;
            assetHolders[_tokenId].push(msg.sender);
            userTokens[msg.sender].push(_tokenId);
        }

        _safeTransferFrom(address(this), msg.sender, _tokenId, _amount, "");

        if (f > 0) payable(feeRecipient).transfer(f);
        payable(a.creator).transfer(c);
        if (msg.value > t) payable(msg.sender).transfer(msg.value - t);

        emit FractionsPurchased(_tokenId, msg.sender, _amount, t);
    }

    function sellFractions(uint256 _tokenId, uint256 _amount) external nonReentrant whenNotPaused {
        AssetDetails storage a = assetDetails[_tokenId];
        require(a.isActive);
        require(_amount > 0);
        require(balanceOf(msg.sender, _tokenId) >= _amount);

        uint256 p = a.pricePerFraction * _amount;
        require(address(this).balance >= p);

        a.availableSupply += _amount;
        userPurchases[_tokenId][msg.sender] -= _amount;

        _safeTransferFrom(msg.sender, address(this), _tokenId, _amount, "");

        if (balanceOf(msg.sender, _tokenId) == 0) {
            a.totalInvestors--;
        }

        payable(msg.sender).transfer(p);
        emit FractionsSold(_tokenId, msg.sender, _amount, p);
    }

    function createProposal(uint256 _assetId, string memory _ipfsHash, uint256 _estimatedCost, uint256 _votingPeriodDays) 
        external whenNotPaused returns (uint256) 
    {
        AssetDetails storage a = assetDetails[_assetId];
        require(a.isActive);
        require(msg.sender == a.creator);
        require(_votingPeriodDays > 0 && _votingPeriodDays <= 30);

        uint256 pid = _proposalIdCounter++;
        
        Proposal storage p = proposals[pid];
        p.id = pid;
        p.assetId = _assetId;
        p.proposer = msg.sender;
        p.ipfsHash = _ipfsHash;
        p.estimatedCost = _estimatedCost;
        p.votingDeadline = block.timestamp + (_votingPeriodDays * 1 days);

        assetProposals[_assetId].push(pid);
        emit ProposalCreated(pid, _assetId, msg.sender, _ipfsHash);
        return pid;
    }

    function vote(uint256 _proposalId, bool _support) external whenNotPaused {
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp <= p.votingDeadline);
        require(!p.executed);
        require(!p.cancelled);
        require(!hasVoted[_proposalId][msg.sender]);

        uint256 s = balanceOf(msg.sender, p.assetId);
        require(s > 0);

        uint256 w = (s * 10000) / assetDetails[p.assetId].totalSupply;

        hasVoted[_proposalId][msg.sender] = true;
        voteChoice[_proposalId][msg.sender] = _support;

        if (_support) p.yesVotes += w;
        else p.noVotes += w;
        
        p.totalVoted += w;
        emit VoteCast(_proposalId, msg.sender, _support, w);
    }

    function executeProposal(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        address c = assetDetails[p.assetId].creator;
        
        require(msg.sender == c || hasRole(ADMIN_ROLE, msg.sender));
        require(block.timestamp > p.votingDeadline);
        require(!p.executed);
        require(!p.cancelled);
        require(p.yesVotes > p.noVotes);

        p.executed = true;
        emit ProposalExecuted(_proposalId);
    }

    function cancelProposal(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        address c = assetDetails[p.assetId].creator;
        
        require(msg.sender == c || hasRole(ADMIN_ROLE, msg.sender));
        require(!p.executed);
        require(!p.cancelled);

        p.cancelled = true;
        emit ProposalCancelled(_proposalId);
    }

    function addAdmin(address _newAdmin) external onlyRole(ADMIN_ROLE) {
        require(_newAdmin != address(0));
        require(!hasRole(ADMIN_ROLE, _newAdmin));
        
        grantRole(ADMIN_ROLE, _newAdmin);
        
        if (!isAdminTracked[_newAdmin]) {
            adminAddresses.push(_newAdmin);
            isAdminTracked[_newAdmin] = true;
        }
        
        emit AdminAdded(_newAdmin, msg.sender);
    }

    function removeAdmin(address _admin) external onlyRole(ADMIN_ROLE) {
        require(_admin != address(0));
        require(hasRole(ADMIN_ROLE, _admin));
        require(_admin != msg.sender);
        
        revokeRole(ADMIN_ROLE, _admin);
        
        if (isAdminTracked[_admin]) {
            for (uint256 i = 0; i < adminAddresses.length; i++) {
                if (adminAddresses[i] == _admin) {
                    adminAddresses[i] = adminAddresses[adminAddresses.length - 1];
                    adminAddresses.pop();
                    break;
                }
            }
            isAdminTracked[_admin] = false;
        }
        
        emit AdminRemoved(_admin, msg.sender);
    }

    function getAllAdmins() external view returns (address[] memory) { return adminAddresses; }
    function getAdminCount() external view returns (uint256) { return adminAddresses.length; }

    function updatePlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000);
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    function updateFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0));
        feeRecipient = _newRecipient;
    }

    function deactivateAsset(uint256 _tokenId) external onlyRole(ADMIN_ROLE) {
        assetDetails[_tokenId].isActive = false;
        emit AssetDeactivated(_tokenId);
    }

    function editAsset(uint256 _tokenId, string memory _name, string memory _desc, string memory _img, uint256 _price) 
        external onlyRole(ADMIN_ROLE) 
    {
        AssetDetails storage a = assetDetails[_tokenId];
        require(a.tokenId == _tokenId);
        a.assetName = _name;
        a.assetDescription = _desc;
        a.mainImageUrl = _img;
        a.pricePerFraction = _price;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function getActiveAssets(uint256 o, uint256 l) external view returns (uint256[] memory ids, bool more) {
        uint256 t = activeAssetIds.length;
        if (o >= t) return (new uint256[](0), false);
        uint256 e = o + l > t ? t : o + l;
        uint256 len = e - o;
        ids = new uint256[](len);
        for (uint256 i = 0; i < len; i++) ids[i] = activeAssetIds[o + i];
        more = e < t;
    }

    function getAssetImages(uint256 _tokenId) external view returns (string[] memory) {
        return assetImageUrls[_tokenId];
    }

    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    function getUserShares(address _user, uint256 _tokenId) external view returns (uint256) {
        return balanceOf(_user, _tokenId);
    }

    function getAssetHolders(uint256 _tokenId) external view returns (address[] memory) {
        return assetHolders[_tokenId];
    }

    function getAssetProposalCount(uint256 _assetId) external view returns (uint256) {
        return assetProposals[_assetId].length;
    }

    function calculatePurchaseCost(uint256 _tokenId, uint256 _amount) 
        external view returns (uint256 c, uint256 f, uint256 t) 
    {
        c = assetDetails[_tokenId].pricePerFraction * _amount;
        f = (c * platformFee) / 10000;
        t = c + f;
    }

    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory) 
        public virtual override returns (bytes4) 
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory) 
        public virtual override returns (bytes4) 
    {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl, IERC165) returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
