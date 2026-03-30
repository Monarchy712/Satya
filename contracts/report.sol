// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Report {

    address public owner;

    struct ReportData {
        string cid;
        bytes32 identityHash;
        uint256 confidence;
        uint256 timestamp;
    }

    mapping(bytes32 => bool) public registered;
    mapping(bytes32 => uint256) public banUntil;
    mapping(bytes32 => uint256) public lastReportTime;

    ReportData[] public reports;

    event UserRegistered(bytes32 identityHash);
    event ReportSubmitted(string cid, bytes32 identityHash, uint256 confidence);
    event UserBanned(bytes32 identityHash, uint256 until);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyBackend() {
        require(msg.sender == owner, "Not backend");
        _;
    }

    function registerUser(bytes32 identityHash) external onlyBackend {
        require(!registered[identityHash], "Already registered");
        registered[identityHash] = true;

        emit UserRegistered(identityHash);
    }

    function isBanned(bytes32 identityHash) public view returns (bool) {
        return block.timestamp < banUntil[identityHash];
    }

    function banUser(bytes32 identityHash) external onlyBackend {
        banUntil[identityHash] = block.timestamp + 30 days;
        emit UserBanned(identityHash, banUntil[identityHash]);
    }

    function submitReport(
        string memory cid,
        bytes32 identityHash,
        uint256 confidence
    ) external onlyBackend {

        require(registered[identityHash], "Not registered");
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

        lastReportTime[identityHash] = block.timestamp;

        emit ReportSubmitted(cid, identityHash, confidence);
    }

    function getReport(uint256 index) external view returns (ReportData memory) {
        return reports[index];
    }

    function totalReports() external view returns (uint256) {
        return reports.length;
    }

    function getLatestReportTimestamp(bytes32 identityHash) external view returns (uint256) {
        return lastReportTime[identityHash];
    }
}