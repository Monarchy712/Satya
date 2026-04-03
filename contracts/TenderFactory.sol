// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Tender.sol";

contract TenderFactory {

    mapping(address => bool) public isGovernment;
    address[] public governmentList;

    struct TenderMeta {
        address tender;
        uint256 startTime;
        uint256 endTime;
        uint256 biddingEndTime;
    }

    TenderMeta[] public tenders;

    mapping(address => address[]) public userToTenders;

    event TenderCreated(address tenderAddress);

    modifier onlyGovernment() {
        require(isGovernment[msg.sender], "Not government");
        _;
    }

    constructor() {
        isGovernment[msg.sender] = true;
        governmentList.push(msg.sender);
    }

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
            address(this),
            _admins,
            _startTime,
            _endTime,
            _biddingEndTime,
            _retainedPercent,
            _names,
            _percentages,
            _deadlines
        );

        address tAddr = address(newTender);

        tenders.push(TenderMeta({
            tender: tAddr,
            startTime: _startTime,
            endTime: _endTime,
            biddingEndTime: _biddingEndTime
        }));

        for (uint i = 0; i < _admins.length; i++) {
            userToTenders[_admins[i]].push(tAddr);
        }

        userToTenders[msg.sender].push(tAddr);

        emit TenderCreated(tAddr);

        return tAddr;
    }

    function getUserTenders(address user)
        external
        view
        returns (address[] memory)
    {
        return userToTenders[user];
    }

    function getAllTenders()
        external
        view
        returns (TenderMeta[] memory)
    {
        return tenders;
    }
}