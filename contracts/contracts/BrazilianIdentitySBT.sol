// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BrazilianIdentitySBT
 * @dev Soulbound Token (SBT) for Brazilian identity verification via PIX payments
 * @notice This contract mints non-transferable tokens representing verified Brazilian identities
 */
contract BrazilianIdentitySBT is ERC721, Ownable, Pausable, ReentrancyGuard {
    uint256 private _nextTokenId = 1;
    
    // Mapping from CPF hash to token ID (prevents duplicate verifications)
    mapping(bytes32 => uint256) public cpfToTokenId;
    
    // Mapping from token ID to CPF hash (for verification lookups)
    mapping(uint256 => bytes32) public tokenIdToCpf;
    
    // Mapping from address to token ID (one token per address)
    mapping(address => uint256) public addressToTokenId;
    
    // Authorized minter address (backend service)
    address public minter;
    
    // Events
    event IdentityVerified(address indexed user, uint256 indexed tokenId, bytes32 cpfHash);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    
    // Custom errors
    error NotMinter();
    error AlreadyVerified();
    error CPFAlreadyUsed();
    error InvalidCPF();
    error TokenNotTransferable();
    
    constructor(
        string memory name,
        string memory symbol,
        address _minter
    ) ERC721(name, symbol) {
        minter = _minter;
    }
    
    /**
     * @dev Modifier to check if caller is authorized minter
     */
    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }
    
    /**
     * @dev Mint a new SBT for a verified Brazilian identity
     * @param to The address to mint the token to
     * @param cpfHash The keccak256 hash of the verified CPF
     */
    function mint(address to, bytes32 cpfHash) 
        external 
        onlyMinter 
        whenNotPaused 
        nonReentrant 
    {
        if (cpfHash == bytes32(0)) revert InvalidCPF();
        if (addressToTokenId[to] != 0) revert AlreadyVerified();
        if (cpfToTokenId[cpfHash] != 0) revert CPFAlreadyUsed();
        
        uint256 tokenId = _nextTokenId++;
        
        // Store mappings
        cpfToTokenId[cpfHash] = tokenId;
        tokenIdToCpf[tokenId] = cpfHash;
        addressToTokenId[to] = tokenId;
        
        // Mint the token
        _mint(to, tokenId);
        
        emit IdentityVerified(to, tokenId, cpfHash);
    }
    
    /**
     * @dev Check if an address is verified (has an SBT)
     * @param user The address to check
     * @return True if the address has been verified
     */
    function isVerified(address user) external view returns (bool) {
        return addressToTokenId[user] != 0;
    }
    
    /**
     * @dev Check if a CPF hash has been used for verification
     * @param cpfHash The keccak256 hash of the CPF
     * @return True if the CPF has been used
     */
    function isCPFUsed(bytes32 cpfHash) external view returns (bool) {
        return cpfToTokenId[cpfHash] != 0;
    }
    
    /**
     * @dev Get token ID for a given address
     * @param user The address to query
     * @return The token ID (0 if not verified)
     */
    function getTokenId(address user) external view returns (uint256) {
        return addressToTokenId[user];
    }
    
    /**
     * @dev Update the authorized minter address
     * @param newMinter The new minter address
     */
    function updateMinter(address newMinter) external onlyOwner {
        address oldMinter = minter;
        minter = newMinter;
        emit MinterUpdated(oldMinter, newMinter);
    }
    
    /**
     * @dev Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get total number of verified identities
     * @return The total supply of tokens
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    // Override transfer functions to make tokens soulbound (non-transferable)
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal pure override {
        // Allow minting (from == address(0)) but prevent all transfers
        if (from != address(0)) revert TokenNotTransferable();
    }
    
    /**
     * @dev Override approve to prevent approvals since tokens are non-transferable
     */
    function approve(address, uint256) public pure override {
        revert TokenNotTransferable();
    }
    
    /**
     * @dev Override setApprovalForAll to prevent approvals since tokens are non-transferable
     */
    function setApprovalForAll(address, bool) public pure override {
        revert TokenNotTransferable();
    }
    
    /**
     * @dev Override getApproved to always return address(0) since approvals are not allowed
     */
    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }
    
    /**
     * @dev Override isApprovedForAll to always return false since approvals are not allowed
     */
    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }
}