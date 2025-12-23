// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AuditLog
 * @dev Immutable audit logging for compliance
 * Records all significant actions in the system
 */
contract AuditLog {
    struct LogEntry {
        address actor;          // Who performed the action
        address target;         // Who was affected
        string action;          // Action type (e.g., "RECORD_ACCESSED", "CONSENT_GRANTED")
        string recordId;        // Related record ID (if applicable)
        uint256 timestamp;      // When it happened
        string metadata;        // Additional JSON metadata
    }
    
    // All log entries
    LogEntry[] public logs;
    
    // User => their log entry indices
    mapping(address => uint256[]) public userLogs;
    
    // Action type => log entry indices
    mapping(string => uint256[]) public actionLogs;
    
    event ActionLogged(
        uint256 indexed logIndex,
        address indexed actor,
        address indexed target,
        string action,
        string recordId,
        uint256 timestamp
    );
    
    /**
     * @dev Log an action
     * @param actor Who performed the action
     * @param target Who was affected
     * @param action Action type
     * @param recordId Related record ID
     */
    function logAction(
        address actor,
        address target,
        string memory action,
        string memory recordId
    ) external {
        _log(actor, target, action, recordId, "");
    }
    
    /**
     * @dev Log an action with metadata
     * @param actor Who performed the action
     * @param target Who was affected
     * @param action Action type
     * @param recordId Related record ID
     * @param metadata Additional JSON metadata
     */
    function logActionWithMetadata(
        address actor,
        address target,
        string memory action,
        string memory recordId,
        string memory metadata
    ) external {
        _log(actor, target, action, recordId, metadata);
    }
    
    /**
     * @dev Internal log function
     */
    function _log(
        address actor,
        address target,
        string memory action,
        string memory recordId,
        string memory metadata
    ) internal {
        require(bytes(action).length > 0, "Action required");
        
        uint256 logIndex = logs.length;
        
        logs.push(LogEntry({
            actor: actor,
            target: target,
            action: action,
            recordId: recordId,
            timestamp: block.timestamp,
            metadata: metadata
        }));
        
        // Index by actor
        userLogs[actor].push(logIndex);
        
        // Index by target (if different from actor)
        if (target != actor && target != address(0)) {
            userLogs[target].push(logIndex);
        }
        
        // Index by action type
        actionLogs[action].push(logIndex);
        
        emit ActionLogged(logIndex, actor, target, action, recordId, block.timestamp);
    }
    
    /**
     * @dev Get a specific log entry
     * @param index Log entry index
     */
    function getLog(uint256 index) external view returns (LogEntry memory) {
        require(index < logs.length, "Invalid index");
        return logs[index];
    }
    
    /**
     * @dev Get all log indices for a user
     * @param userAddress User's address
     */
    function getLogsByUser(address userAddress) external view returns (uint256[] memory) {
        return userLogs[userAddress];
    }
    
    /**
     * @dev Get log entries for a user (limited to avoid gas issues)
     * @param userAddress User's address
     * @param limit Maximum entries to return
     */
    function getUserLogEntries(address userAddress, uint256 limit) external view returns (LogEntry[] memory) {
        uint256[] memory indices = userLogs[userAddress];
        uint256 count = indices.length < limit ? indices.length : limit;
        
        LogEntry[] memory entries = new LogEntry[](count);
        
        // Get most recent entries (from end)
        for (uint256 i = 0; i < count; i++) {
            entries[i] = logs[indices[indices.length - 1 - i]];
        }
        
        return entries;
    }
    
    /**
     * @dev Get log indices by action type
     * @param action Action type
     */
    function getLogsByAction(string memory action) external view returns (uint256[] memory) {
        return actionLogs[action];
    }
    
    /**
     * @dev Get total log count
     */
    function getTotalLogs() external view returns (uint256) {
        return logs.length;
    }
    
    /**
     * @dev Get logs in a range
     * @param startIndex Start index
     * @param endIndex End index (exclusive)
     */
    function getLogsInRange(uint256 startIndex, uint256 endIndex) external view returns (LogEntry[] memory) {
        require(startIndex < endIndex, "Invalid range");
        require(endIndex <= logs.length, "End index out of bounds");
        
        uint256 count = endIndex - startIndex;
        LogEntry[] memory entries = new LogEntry[](count);
        
        for (uint256 i = 0; i < count; i++) {
            entries[i] = logs[startIndex + i];
        }
        
        return entries;
    }
}
