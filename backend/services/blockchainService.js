const { getProvider, getContracts, getSigner } = require('../config/blockchain');
const { ethers } = require('ethers');

class BlockchainService {
    constructor() {
        this.provider = null;
        this.contracts = null;
    }

    // Initialize blockchain connection
    async initialize(privateKey = null) {
        try {
            this.provider = getProvider();

            // Check connection
            const network = await this.provider.getNetwork();
            console.log(`Connected to blockchain network: Chain ID ${network.chainId}`);

            // Get contracts with signer if private key provided
            if (privateKey) {
                const signer = getSigner(privateKey);
                this.contracts = getContracts(signer);
            } else {
                this.contracts = getContracts(this.provider);
            }

            return true;
        } catch (error) {
            console.error('Blockchain initialization error:', error);
            return false;
        }
    }

    // Register user on blockchain
    async registerUser(userAddress, role) {
        try {
            if (!this.contracts.userRegistry) {
                throw new Error('UserRegistry contract not initialized');
            }

            const roleIndex = this.getRoleIndex(role);
            const tx = await this.contracts.userRegistry.registerUser(userAddress, roleIndex);
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Register user error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user is registered
    async isUserRegistered(userAddress) {
        try {
            if (!this.contracts.userRegistry) {
                return false;
            }

            return await this.contracts.userRegistry.isRegistered(userAddress);
        } catch (error) {
            console.error('Check registration error:', error);
            return false;
        }
    }

    // Get user role from blockchain
    async getUserRole(userAddress) {
        try {
            if (!this.contracts.userRegistry) {
                return null;
            }

            const roleIndex = await this.contracts.userRegistry.getUserRole(userAddress);
            return this.getRoleName(roleIndex);
        } catch (error) {
            console.error('Get user role error:', error);
            return null;
        }
    }

    // Grant consent (called by patient)
    async grantConsent(patientAddress, doctorAddress, signerPrivateKey) {
        try {
            if (!this.contracts.consentManager) {
                throw new Error('ConsentManager contract not initialized');
            }

            const signer = getSigner(signerPrivateKey);
            const consentManager = this.contracts.consentManager.connect(signer);

            const tx = await consentManager.grantAccess(doctorAddress);
            const receipt = await tx.wait();

            // Parse events
            const event = receipt.logs.find(log => {
                try {
                    return consentManager.interface.parseLog(log)?.name === 'ConsentGranted';
                } catch {
                    return false;
                }
            });

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                event: event ? consentManager.interface.parseLog(event) : null
            };
        } catch (error) {
            console.error('Grant consent error:', error);
            return { success: false, error: error.message };
        }
    }

    // Revoke consent (called by patient)
    async revokeConsent(patientAddress, doctorAddress, signerPrivateKey) {
        try {
            if (!this.contracts.consentManager) {
                throw new Error('ConsentManager contract not initialized');
            }

            const signer = getSigner(signerPrivateKey);
            const consentManager = this.contracts.consentManager.connect(signer);

            const tx = await consentManager.revokeAccess(doctorAddress);
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Revoke consent error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if doctor has consent from patient
    async hasConsent(patientAddress, doctorAddress) {
        try {
            if (!this.contracts.consentManager) {
                return false;
            }

            return await this.contracts.consentManager.hasConsent(patientAddress, doctorAddress);
        } catch (error) {
            console.error('Check consent error:', error);
            return false;
        }
    }

    // Store medical record hash on blockchain
    async storeRecordHash(recordId, fileHash, patientAddress, doctorAddress, metadata = '', signerPrivateKey) {
        try {
            if (!this.contracts.medicalRecordIndex) {
                throw new Error('MedicalRecordIndex contract not initialized');
            }

            const signer = getSigner(signerPrivateKey);
            const recordIndex = this.contracts.medicalRecordIndex.connect(signer);

            const tx = await recordIndex.storeRecord(recordId, fileHash, patientAddress, doctorAddress, metadata);
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                recordId
            };
        } catch (error) {
            console.error('Store record hash error:', error);
            return { success: false, error: error.message };
        }
    }

    // Verify record hash on blockchain
    async verifyRecordHash(recordId, expectedHash) {
        try {
            if (!this.contracts.medicalRecordIndex) {
                throw new Error('MedicalRecordIndex contract not initialized');
            }

            const isValid = await this.contracts.medicalRecordIndex.verifyHash(recordId, expectedHash);
            const record = await this.contracts.medicalRecordIndex.getRecord(recordId);

            return {
                valid: isValid,
                onChainHash: record.fileHash,
                expectedHash,
                storedAt: new Date(Number(record.timestamp) * 1000)
            };
        } catch (error) {
            console.error('Verify record hash error:', error);
            return { valid: false, error: error.message };
        }
    }

    // Log access on blockchain
    async logAccess(actorAddress, targetAddress, action, recordId = '', signerPrivateKey) {
        try {
            if (!this.contracts.auditLog) {
                throw new Error('AuditLog contract not initialized');
            }

            const signer = getSigner(signerPrivateKey);
            const auditLog = this.contracts.auditLog.connect(signer);

            const tx = await auditLog.logAction(actorAddress, targetAddress, action, recordId);
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Log access error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get audit logs for a user
    async getAuditLogs(userAddress, limit = 50) {
        try {
            if (!this.contracts.auditLog) {
                return [];
            }

            const logs = await this.contracts.auditLog.getLogsByUser(userAddress);

            return logs.slice(-limit).map(log => ({
                actor: log.actor,
                target: log.target,
                action: log.action,
                recordId: log.recordId,
                timestamp: new Date(Number(log.timestamp) * 1000)
            }));
        } catch (error) {
            console.error('Get audit logs error:', error);
            return [];
        }
    }

    // Utility: Convert role string to index
    getRoleIndex(role) {
        const roles = { 'admin': 0, 'doctor': 1, 'patient': 2 };
        return roles[role.toLowerCase()] ?? 2;
    }

    // Utility: Convert role index to string
    getRoleName(index) {
        const roles = ['admin', 'doctor', 'patient'];
        return roles[Number(index)] || 'unknown';
    }

    // Verify signature (for frontend-signed messages)
    async verifySignature(message, signature, expectedAddress) {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        } catch (error) {
            console.error('Verify signature error:', error);
            return false;
        }
    }

    // Get transaction details
    async getTransaction(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            const receipt = await this.provider.getTransactionReceipt(txHash);

            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                blockNumber: receipt?.blockNumber,
                status: receipt?.status === 1 ? 'success' : 'failed',
                gasUsed: receipt?.gasUsed?.toString()
            };
        } catch (error) {
            console.error('Get transaction error:', error);
            return null;
        }
    }
}

// Singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
