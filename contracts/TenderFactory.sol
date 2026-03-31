// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Tender.sol";

contract TenderFactory {

    // ---------------- STATE ----------------
    address public government;

    struct TenderMeta {
        address tender;
        uint256 startTime;
        uint256 endTime;
        uint256 biddingEndTime;
    }

    TenderMeta[] public tenders;

    // ---------------- EVENTS ----------------
    event TenderCreated(address tenderAddress);

    // ---------------- MODIFIERS ----------------
    modifier onlyGovernment() {
        require(msg.sender == government, "Not government");
        _;
    }

    // ---------------- CONSTRUCTOR ----------------
    constructor() {
        government = msg.sender;
    }

    // ---------------- CREATE ----------------
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
            government,
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