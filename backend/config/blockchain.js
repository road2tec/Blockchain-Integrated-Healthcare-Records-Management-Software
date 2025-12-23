const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Contract ABIs
let UserRegistryABI, ConsentManagerABI, MedicalRecordIndexABI, AccessControlABI, AuditLogABI;

// Load ABIs if they exist
const loadABIs = () => {
    const abiPath = path.join(__dirname, '../contracts/abis');

    try {
        if (fs.existsSync(path.join(abiPath, 'UserRegistry.json'))) {
            UserRegistryABI = require(path.join(abiPath, 'UserRegistry.json'));
        }
        if (fs.existsSync(path.join(abiPath, 'ConsentManager.json'))) {
            ConsentManagerABI = require(path.join(abiPath, 'ConsentManager.json'));
        }
        if (fs.existsSync(path.join(abiPath, 'MedicalRecordIndex.json'))) {
            MedicalRecordIndexABI = require(path.join(abiPath, 'MedicalRecordIndex.json'));
        }
        if (fs.existsSync(path.join(abiPath, 'AccessControl.json'))) {
            AccessControlABI = require(path.join(abiPath, 'AccessControl.json'));
        }
        if (fs.existsSync(path.join(abiPath, 'AuditLog.json'))) {
            AuditLogABI = require(path.join(abiPath, 'AuditLog.json'));
        }
    } catch (error) {
        console.log('ABIs not yet available. Deploy contracts first.');
    }
};

// Initialize provider
const getProvider = () => {
    return new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545');
};

// Get signer (for backend transactions)
const getSigner = (privateKey) => {
    const provider = getProvider();
    return new ethers.Wallet(privateKey, provider);
};

// Contract instances
const getContracts = (signerOrProvider) => {
    loadABIs();

    const contracts = {};

    if (process.env.USER_REGISTRY_ADDRESS && UserRegistryABI) {
        contracts.userRegistry = new ethers.Contract(
            process.env.USER_REGISTRY_ADDRESS,
            UserRegistryABI.abi || UserRegistryABI,
            signerOrProvider
        );
    }

    if (process.env.CONSENT_MANAGER_ADDRESS && ConsentManagerABI) {
        contracts.consentManager = new ethers.Contract(
            process.env.CONSENT_MANAGER_ADDRESS,
            ConsentManagerABI.abi || ConsentManagerABI,
            signerOrProvider
        );
    }

    if (process.env.MEDICAL_RECORD_INDEX_ADDRESS && MedicalRecordIndexABI) {
        contracts.medicalRecordIndex = new ethers.Contract(
            process.env.MEDICAL_RECORD_INDEX_ADDRESS,
            MedicalRecordIndexABI.abi || MedicalRecordIndexABI,
            signerOrProvider
        );
    }

    if (process.env.ACCESS_CONTROL_ADDRESS && AccessControlABI) {
        contracts.accessControl = new ethers.Contract(
            process.env.ACCESS_CONTROL_ADDRESS,
            AccessControlABI.abi || AccessControlABI,
            signerOrProvider
        );
    }

    if (process.env.AUDIT_LOG_ADDRESS && AuditLogABI) {
        contracts.auditLog = new ethers.Contract(
            process.env.AUDIT_LOG_ADDRESS,
            AuditLogABI.abi || AuditLogABI,
            signerOrProvider
        );
    }

    return contracts;
};

module.exports = {
    getProvider,
    getSigner,
    getContracts,
    loadABIs
};
