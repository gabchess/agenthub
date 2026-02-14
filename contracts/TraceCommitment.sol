// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TraceCommitment
 * @notice Stores SHA-256 hashes of AgentHub workflow execution traces on Monad.
 *         Each workflow run produces a deterministic trace; the hash is committed
 *         on-chain so anyone can verify the execution was not tampered with.
 */
contract TraceCommitment {
    struct Commitment {
        bytes32 traceHash;
        address committer;
        uint256 timestamp;
        uint256 blockNumber;
    }

    /// runId (bytes32) => Commitment
    mapping(bytes32 => Commitment) public commitments;

    /// Total number of commitments
    uint256 public totalCommitments;

    event TraceCommitted(
        bytes32 indexed runId,
        bytes32 traceHash,
        address indexed committer,
        uint256 timestamp
    );

    /**
     * @notice Commit a trace hash for a workflow run.
     * @param runId   The workflow run identifier (keccak256 of the UUID string).
     * @param traceHash The SHA-256 hash of the full execution trace JSON.
     */
    function commitTrace(bytes32 runId, bytes32 traceHash) external {
        require(traceHash != bytes32(0), "Empty trace hash");
        require(commitments[runId].traceHash == bytes32(0), "Already committed");

        commitments[runId] = Commitment({
            traceHash: traceHash,
            committer: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        totalCommitments++;

        emit TraceCommitted(runId, traceHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify a trace hash matches what was committed.
     * @param runId     The workflow run identifier.
     * @param traceHash The hash to verify against.
     * @return valid    True if the hash matches the committed value.
     */
    function verifyTrace(bytes32 runId, bytes32 traceHash) external view returns (bool valid) {
        return commitments[runId].traceHash == traceHash && traceHash != bytes32(0);
    }

    /**
     * @notice Get the full commitment details for a run.
     * @param runId The workflow run identifier.
     */
    function getCommitment(bytes32 runId) external view returns (
        bytes32 traceHash,
        address committer,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        Commitment memory c = commitments[runId];
        return (c.traceHash, c.committer, c.timestamp, c.blockNumber);
    }
}
