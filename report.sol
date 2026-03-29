// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Report {

    // ---------------- VARIABLES ----------------
    address public owner;

    // ---------------- STRUCTS ----------------
    struct ReportData {
        bytes32 cid;
        bytes32 identityHash;
        uint256 confidence;   // 0–100
        uint256 timestamp;
    }

    // ---------------- STORAGE ----------------
    mapping(bytes32 => bool) public registered;
    mapping(bytes32 => uint256) public banUntil;

    ReportData[] public reports;

    // ---------------- EVENTS ----------------
    event UserRegistered(bytes32 identityHash);
    event ReportSubmitted(bytes32 cid, bytes32 identityHash, uint256 confidence);
    event UserBanned(bytes32 identityHash, uint256 until);
    event ReputationUpdated(bytes32 identityHash, int256 newScore);

    // ---------------- CONSTRUCTOR ----------------
    constructor() {
        owner = msg.sender;
    }

    // ---------------- MODIFIER ----------------
    modifier onlyBackend() {
        require(msg.sender == owner, "Not backend");
        _;
    }

    // ---------------- USER MANAGEMENT ----------------

    function registerUser(bytes32 identityHash) external onlyBackend {
        require(!registered[identityHash], "Already registered");
        registered[identityHash] = true;

        emit UserRegistered(identityHash);
    }

    function isBanned(bytes32 identityHash) public view returns (bool) {
        return block.timestamp < banUntil[identityHash];
    }

    function banUser(bytes32 identityHash) external onlyBackend {
        banUntil[identityHash] = block.timestamp +2592000; // Ban for 30 days

        emit UserBanned(identityHash, banUntil[identityHash]);
    }

    // ---------------- REPORT SUBMISSION ----------------

    function submitReport(
        bytes32 cid,
        bytes32 identityHash,
        uint256 confidence
    ) external onlyBackend {

        require(!isBanned(identityHash), "User banned");
        require(confidence <= 100, "Invalid confidence");

        reports.push(
            ReportData({
                cid: cid,
                identityHash: identityHash,
                confidence: confidence,
                timestamp: block.timestamp
            })
        );

        emit ReportSubmitted(cid, identityHash, confidence);
    }



    // ---------------- VIEW FUNCTIONS ----------------

    function getReport(uint256 index) external view returns (ReportData memory) {
        return reports[index];
    }

    function totalReports() external view returns (uint256) {
        return reports.length;
    }
}