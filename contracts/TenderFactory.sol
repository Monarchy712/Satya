// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Tender.sol";

contract TenderFactory {

    // ---------------- STATE ----------------
    mapping(address => bool) public isGovernment;
    address[] public governmentList;

    struct TenderMeta {
        address tender;
        uint256 startTime;
        uint256 endTime;
        uint256 biddingEndTime;
    }

    TenderMeta[] public tenders;

    // ---------------- EVENTS ----------------
    event TenderCreated(address tenderAddress);
    event GovernmentAdded(address gov);
    event GovernmentRemoved(address gov);

    // ---------------- MODIFIERS ----------------
    modifier onlyGovernment() {
        require(isGovernment[msg.sender], "Not government");
        _;
    }

    // ---------------- CONSTRUCTOR ----------------
    constructor() {
        isGovernment[msg.sender] = true;
        governmentList.push(msg.sender);
    }

    // ---------------- GOVERNMENT MANAGEMENT ----------------
    function addGovernment(address _gov) external onlyGovernment {
        require(!isGovernment[_gov], "Already gov");

        isGovernment[_gov] = true;
        governmentList.push(_gov);

        emit GovernmentAdded(_gov);
    }

    function removeGovernment(address _gov) external onlyGovernment {
        require(isGovernment[_gov], "Not gov");

        isGovernment[_gov] = false;

        emit GovernmentRemoved(_gov);
    }

    // ---------------- CREATE TENDER ----------------
    function createTender(
        address[] memory _admins,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _biddingEndTime,
        uint256 _retainedPercent,
        string[] memory _names,
        uint256[] memory _percentages,
        uint256[] memory _deadlines
    ) external onlyGovernment returns (address) {

        Tender newTender = new Tender(
            address(this), // 🔥 pass factory instead
            _admins,
            _startTime,
            _endTime,
            _biddingEndTime,
            _retainedPercent,
            _names,
            _percentages,
            _deadlines
        );

        tenders.push(TenderMeta({
            tender: address(newTender),
            startTime: _startTime,
            endTime: _endTime,
            biddingEndTime: _biddingEndTime
        }));

        emit TenderCreated(address(newTender));

        return address(newTender);
    }

    // ---------------- GETTERS ----------------
    function getAllTenders() external view returns (TenderMeta[] memory) {
        return tenders;
    }
}