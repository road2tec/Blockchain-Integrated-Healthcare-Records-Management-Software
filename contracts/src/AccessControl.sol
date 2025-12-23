// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ConsentManager.sol";
import "./UserRegistry.sol";

/**
 * @title AccessControl
 * @dev Enforces access control based on consent and user roles
 */
contract AccessControl {
    ConsentManager public consentManager;
    UserRegistry public userRegistry;
    address public owner;
    
    // Emergency access grants
    mapping(address => mapping(address => bool)) public emergencyAccess;
    
    event EmergencyAccessGranted(
        address indexed patient,
        address indexed accessor,
        address grantedBy,
        uint256 timestamp
    );
    
    event EmergencyAccessRevoked(
        address indexed patient,
        address indexed accessor,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyRegistered() {
        require(userRegistry.isRegistered(msg.sender), "Not registered");
        _;
    }
    
    constructor(address _consentManager, address _userRegistry) {
        consentManager = ConsentManager(_consentManager);
        userRegistry = UserRegistry(_userRegistry);
        owner = msg.sender;
    }
    
    /**
     * @dev Check if doctor has access to patient data
     * Either through consent or emergency access
     * @param patientAddress Patient's address
     * @param doctorAddress Doctor's address
     */
    function checkAccess(address patientAddress, address doctorAddress) external view returns (bool) {
        // Check normal consent
        if (consentManager.hasConsent(patientAddress, doctorAddress)) {
            return true;
        }
        
        // Check emergency access
        if (emergencyAccess[patientAddress][doctorAddress]) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Enforce that caller has consent from patient
     * Reverts if no consent
     * @param patientAddress Patient's address
     */
    function enforceConsent(address patientAddress) external view {
        require(
            consentManager.hasConsent(patientAddress, msg.sender) ||
            emergencyAccess[patientAddress][msg.sender],
            "No consent or emergency access"
        );
    }
    
    /**
     * @dev Grant emergency access (only owner/admin)
     * @param patientAddress Patient's address
     * @param accessorAddress Who gets access
     */
    function grantEmergencyAccess(
        address patientAddress,
        address accessorAddress
    ) external onlyOwner {
        require(patientAddress != address(0), "Invalid patient");
        require(accessorAddress != address(0), "Invalid accessor");
        
        emergencyAccess[patientAddress][accessorAddress] = true;
        
        emit EmergencyAccessGranted(
            patientAddress,
            accessorAddress,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Revoke emergency access
     * @param patientAddress Patient's address
     * @param accessorAddress Who to revoke from
     */
    function revokeEmergencyAccess(
        address patientAddress,
        address accessorAddress
    ) external {
        require(
            msg.sender == owner || msg.sender == patientAddress,
            "Not authorized"
        );
        
        emergencyAccess[patientAddress][accessorAddress] = false;
        
        emit EmergencyAccessRevoked(
            patientAddress,
            accessorAddress,
            block.timestamp
        );
    }
    
    /**
     * @dev Check user role
     * @param userAddress User to check
     * @param expectedRole Expected role (0=Admin, 1=Doctor, 2=Patient)
     */
    function hasRole(address userAddress, UserRegistry.Role expectedRole) external view returns (bool) {
        if (!userRegistry.isRegistered(userAddress)) {
            return false;
        }
        return userRegistry.getUserRole(userAddress) == expectedRole;
    }
    
    /**
     * @dev Update contract references (only owner)
     */
    function updateContracts(
        address _consentManager,
        address _userRegistry
    ) external onlyOwner {
        if (_consentManager != address(0)) {
            consentManager = ConsentManager(_consentManager);
        }
        if (_userRegistry != address(0)) {
            userRegistry = UserRegistry(_userRegistry);
        }
    }
}
