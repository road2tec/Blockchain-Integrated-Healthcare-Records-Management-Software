const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate SHA-256 hash from file buffer
const generateHashFromBuffer = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Generate SHA-256 hash from file path
const generateHashFromFile = async (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (error) => reject(error));
    });
};

// Generate SHA-256 hash from string
const generateHashFromString = (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

// Verify file hash matches expected hash
const verifyFileHash = async (filePath, expectedHash) => {
    try {
        const actualHash = await generateHashFromFile(filePath);
        return {
            valid: actualHash === expectedHash,
            actualHash,
            expectedHash
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
};

// Verify buffer hash matches expected hash
const verifyBufferHash = (buffer, expectedHash) => {
    const actualHash = generateHashFromBuffer(buffer);
    return {
        valid: actualHash === expectedHash,
        actualHash,
        expectedHash
    };
};

// Generate unique record ID from hash + timestamp
const generateRecordId = (fileHash, timestamp = Date.now()) => {
    const combined = `${fileHash}-${timestamp}`;
    return generateHashFromString(combined).substring(0, 32);
};

module.exports = {
    generateHashFromBuffer,
    generateHashFromFile,
    generateHashFromString,
    verifyFileHash,
    verifyBufferHash,
    generateRecordId
};
