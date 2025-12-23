// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UserRegistry
 * @dev Manages user registration on the blockchain
 * Users register their Ethereum address and role after traditional authentication
 */
contract UserRegistry {
    enum Role { Admin, Doctor, Patient }
    
    struct UserInfo {
        address userAddress;
        Role role;
        bool isRegistered;
        uint256 registeredAt;
    }
    
    mapping(address => UserInfo) public users;
    address[] public registeredAddresses;
    address public owner;
    
    event UserRegistered(address indexed userAddress, Role role, uint256 timestamp);
    event UserRoleUpdated(address indexed userAddress, Role oldRole, Role newRole, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new user
     * @param userAddress The Ethereum address to register
     * @param role The role of the user (0=Admin, 1=Doctor, 2=Patient)
     */
    function registerUser(address userAddress, Role role) external {
        require(userAddress != address(0), "Invalid address");
        require(!users[userAddress].isRegistered, "User already registered");
        
        users[userAddress] = UserInfo({
            userAddress: userAddress,
            role: role,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        
        registeredAddresses.push(userAddress);
        
        emit UserRegistered(userAddress, role, block.timestamp);
    }
    
    /**
     * @dev Check if an address is registered
     * @param userAddress The address to check
     */
    function isRegistered(address userAddress) external view returns (bool) {
        return users[userAddress].isRegistered;
    }
    
    /**
     * @dev Get user role
     * @param userAddress The address to check
     */
    function getUserRole(address userAddress) external view returns (Role) {
        require(users[userAddress].isRegistered, "User not registered");
        return users[userAddress].role;
    }
    
    /**
     * @dev Get user info
     * @param userAddress The address to query
     */
    function getUserInfo(address userAddress) external view returns (UserInfo memory) {
        require(users[userAddress].isRegistered, "User not registered");
        return users[userAddress];
    }
    
    /**
     * @dev Update user role (only owner)
     * @param userAddress The address to update
     * @param newRole The new role
     */
    function updateUserRole(address userAddress, Role newRole) external onlyOwner {
        require(users[userAddress].isRegistered, "User not registered");
        
        Role oldRole = users[userAddress].role;
        users[userAddress].role = newRole;
        
        emit UserRoleUpdated(userAddress, oldRole, newRole, block.timestamp);
    }
    
    /**
     * @dev Get total registered users
     */
    function getTotalUsers() external view returns (uint256) {
        return registeredAddresses.length;
    }
}
