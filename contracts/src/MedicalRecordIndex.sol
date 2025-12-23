// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MedicalRecordIndex
 * @dev Stores medical record hashes and metadata on-chain
 * Actual files are stored off-chain, only SHA-256 hashes are stored here
 */
contract MedicalRecordIndex {
    struct Record {
        string recordId;        // Unique record identifier
        string fileHash;        // SHA-256 hash of the file
        address patient;        // Patient's Ethereum address
        address doctor;         // Doctor who uploaded
        string metadata;        // JSON metadata (title, type, etc.)
        uint256 timestamp;      // When stored on-chain
        bool exists;
    }
    
    // recordId => Record
    mapping(string => Record) public records;
    
    // patient => list of record IDs
    mapping(address => string[]) public patientRecords;
    
    // doctor => list of record IDs they uploaded
    mapping(address => string[]) public doctorRecords;
    
    // Total record count
    uint256 public totalRecords;
    
    event RecordStored(
        string indexed recordId,
        address indexed patient,
        address indexed doctor,
        string fileHash,
        uint256 timestamp
    );
    
    event RecordUpdated(
        string indexed recordId,
        string oldHash,
        string newHash,
        uint256 timestamp
    );
    
    /**
     * @dev Store a new medical record hash
     * @param recordId Unique identifier for the record
     * @param fileHash SHA-256 hash of the file
     * @param patientAddress Patient's Ethereum address
     * @param doctorAddress Doctor's Ethereum address
     * @param metadata JSON string with record metadata
     */
    function storeRecord(
        string memory recordId,
        string memory fileHash,
        address patientAddress,
        address doctorAddress,
        string memory metadata
    ) external {
        require(bytes(recordId).length > 0, "Record ID required");
        require(bytes(fileHash).length > 0, "File hash required");
        require(patientAddress != address(0), "Invalid patient address");
        require(!records[recordId].exists, "Record already exists");
        
        records[recordId] = Record({
            recordId: recordId,
            fileHash: fileHash,
            patient: patientAddress,
            doctor: doctorAddress,
            metadata: metadata,
            timestamp: block.timestamp,
            exists: true
        });
        
        patientRecords[patientAddress].push(recordId);
        doctorRecords[doctorAddress].push(recordId);
        totalRecords++;
        
        emit RecordStored(recordId, patientAddress, doctorAddress, fileHash, block.timestamp);
    }
    
    /**
     * @dev Verify if a hash matches the stored hash
     * @param recordId The record ID to verify
     * @param hashToVerify The hash to compare against
     */
    function verifyHash(string memory recordId, string memory hashToVerify) external view returns (bool) {
        require(records[recordId].exists, "Record does not exist");
        return keccak256(bytes(records[recordId].fileHash)) == keccak256(bytes(hashToVerify));
    }
    
    /**
     * @dev Get record details
     * @param recordId The record ID to query
     */
    function getRecord(string memory recordId) external view returns (Record memory) {
        require(records[recordId].exists, "Record does not exist");
        return records[recordId];
    }
    
    /**
     * @dev Get all record IDs for a patient
     * @param patientAddress The patient's address
     */
    function getPatientRecordIds(address patientAddress) external view returns (string[] memory) {
        return patientRecords[patientAddress];
    }
    
    /**
     * @dev Get all record IDs uploaded by a doctor
     * @param doctorAddress The doctor's address
     */
    function getDoctorRecordIds(address doctorAddress) external view returns (string[] memory) {
        return doctorRecords[doctorAddress];
    }
    
    /**
     * @dev Get record count for a patient
     * @param patientAddress The patient's address
     */
    function getPatientRecordCount(address patientAddress) external view returns (uint256) {
        return patientRecords[patientAddress].length;
    }
    
    /**
     * @dev Check if a record exists
     * @param recordId The record ID to check
     */
    function recordExists(string memory recordId) external view returns (bool) {
        return records[recordId].exists;
    }
}
