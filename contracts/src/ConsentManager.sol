// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ConsentManager
 * @dev Manages patient consent for doctor access
 * Consent is granted/revoked by patients and recorded immutably on-chain
 */
contract ConsentManager {
    struct Consent {
        address patient;
        address doctor;
        bool isGranted;
        uint256 grantedAt;
        uint256 revokedAt;
    }
    
    // patient => doctor => consent
    mapping(address => mapping(address => Consent)) public consents;
    
    // patient => list of doctors with consent history
    mapping(address => address[]) public patientDoctors;
    
    // doctor => list of patients who granted consent
    mapping(address => address[]) public doctorPatients;
    
    event ConsentGranted(
        address indexed patient,
        address indexed doctor,
        uint256 timestamp
    );
    
    event ConsentRevoked(
        address indexed patient,
        address indexed doctor,
        uint256 timestamp
    );
    
    /**
     * @dev Grant access to a doctor (called by patient)
     * @param doctorAddress The doctor's Ethereum address
     */
    function grantAccess(address doctorAddress) external {
        require(doctorAddress != address(0), "Invalid doctor address");
        require(doctorAddress != msg.sender, "Cannot grant consent to yourself");
        require(!consents[msg.sender][doctorAddress].isGranted, "Consent already granted");
        
        Consent storage consent = consents[msg.sender][doctorAddress];
        
        // If first time granting to this doctor
        if (consent.patient == address(0)) {
            consent.patient = msg.sender;
            consent.doctor = doctorAddress;
            patientDoctors[msg.sender].push(doctorAddress);
            doctorPatients[doctorAddress].push(msg.sender);
        }
        
        consent.isGranted = true;
        consent.grantedAt = block.timestamp;
        consent.revokedAt = 0;
        
        emit ConsentGranted(msg.sender, doctorAddress, block.timestamp);
    }
    
    /**
     * @dev Revoke access from a doctor (called by patient)
     * @param doctorAddress The doctor's Ethereum address
     */
    function revokeAccess(address doctorAddress) external {
        require(consents[msg.sender][doctorAddress].isGranted, "No active consent to revoke");
        
        consents[msg.sender][doctorAddress].isGranted = false;
        consents[msg.sender][doctorAddress].revokedAt = block.timestamp;
        
        emit ConsentRevoked(msg.sender, doctorAddress, block.timestamp);
    }
    
    /**
     * @dev Check if doctor has consent from patient
     * @param patientAddress The patient's address
     * @param doctorAddress The doctor's address
     */
    function hasConsent(address patientAddress, address doctorAddress) external view returns (bool) {
        return consents[patientAddress][doctorAddress].isGranted;
    }
    
    /**
     * @dev Get consent details
     * @param patientAddress The patient's address
     * @param doctorAddress The doctor's address
     */
    function getConsent(address patientAddress, address doctorAddress) external view returns (Consent memory) {
        return consents[patientAddress][doctorAddress];
    }
    
    /**
     * @dev Get all doctors a patient has granted consent to
     * @param patientAddress The patient's address
     */
    function getPatientDoctors(address patientAddress) external view returns (address[] memory) {
        return patientDoctors[patientAddress];
    }
    
    /**
     * @dev Get all patients who granted consent to a doctor
     * @param doctorAddress The doctor's address
     */
    function getDoctorPatients(address doctorAddress) external view returns (address[] memory) {
        return doctorPatients[doctorAddress];
    }
    
    /**
     * @dev Get count of active consents for a patient
     * @param patientAddress The patient's address
     */
    function getActiveConsentCount(address patientAddress) external view returns (uint256) {
        uint256 count = 0;
        address[] memory doctors = patientDoctors[patientAddress];
        
        for (uint256 i = 0; i < doctors.length; i++) {
            if (consents[patientAddress][doctors[i]].isGranted) {
                count++;
            }
        }
        
        return count;
    }
}
