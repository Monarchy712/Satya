// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Tender.sol";

contract TenderFactory {
    mapping(address => bool) public isGovernment;
    address[] public governmentList;
    address[] public onSiteEngineers;
    address[] public complianceOfficers;
    address[] public financialAuditors;
    address[] public sanctioningAuthorities;

    mapping(address => bool) public hasRole;

    struct TenderMeta {
        address tender;
        uint256 startTime;
        uint256 endTime;
        uint256 biddingEndTime;
    }
    enum RoleType {
        NONE,
        ON_SITE_ENGINEER,
        COMPLIANCE_OFFICER,
        FINANCIAL_AUDITOR,
        SANCTIONING_AUTHORITY
    }

    mapping(address => RoleType) public roleOf;

    TenderMeta[] public tenders;

    mapping(address => address[]) public userToTenders;

    event TenderCreated(address tenderAddress);

    // ✅ NEW: owner
    address public owner;

    modifier onlyGovernment() {
        require(isGovernment[msg.sender], "Not government");
        _;
    }

    // ✅ NEW: onlyOwner modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        isGovernment[msg.sender] = true;
        governmentList.push(msg.sender);

        // ✅ NEW: set deployer as owner
        owner = msg.sender;
    }

    function createTender(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _biddingEndTime,
        uint256 _retainedPercent,
        string[] memory _names,
        uint256[] memory _percentages,
        uint256[] memory _deadlines
    ) external onlyGovernment returns (address) {
        require(onSiteEngineers.length > 0, "No engineers");
        require(complianceOfficers.length > 0, "No compliance");
        require(financialAuditors.length > 0, "No auditors");
        require(sanctioningAuthorities.length > 0, "No authorities");
        address[] memory _admins = new address[](4);

        _admins[0] = _random(onSiteEngineers, 1);
        _admins[1] = _random(complianceOfficers, 2);
        _admins[2] = _random(financialAuditors, 3);
        _admins[3] = _random(sanctioningAuthorities, 4);
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

        tenders.push(
            TenderMeta({
                tender: tAddr,
                startTime: _startTime,
                endTime: _endTime,
                biddingEndTime: _biddingEndTime
            })
        );

        for (uint i = 0; i < _admins.length; i++) {
            userToTenders[_admins[i]].push(tAddr);
        }

        userToTenders[msg.sender].push(tAddr);

        emit TenderCreated(tAddr);

        return tAddr;
    }

    function getUserTenders(
        address user
    ) external view returns (address[] memory) {
        return userToTenders[user];
    }

    function getAllTenders() external view returns (TenderMeta[] memory) {
        return tenders;
    }

    // =========================================================
    // ✅ NEW FUNCTIONS (NO EXISTING LOGIC TOUCHED)
    // =========================================================

    function addGovernment(address user) external onlyOwner {
        require(user != address(0), "Invalid address");
        require(!isGovernment[user], "Already government");

        isGovernment[user] = true;
        governmentList.push(user);
    }

    function removeGovernment(address user) external onlyOwner {
        require(isGovernment[user], "Not government");

        isGovernment[user] = false;

        // swap & pop removal
        for (uint i = 0; i < governmentList.length; i++) {
            if (governmentList[i] == user) {
                governmentList[i] = governmentList[governmentList.length - 1];
                governmentList.pop();
                break;
            }
        }
    }

    function addToRole(address user, RoleType role) external onlyOwner {
        require(user != address(0), "Invalid");
        require(roleOf[user] == RoleType.NONE, "Already assigned");

        roleOf[user] = role;

        if (role == RoleType.ON_SITE_ENGINEER) onSiteEngineers.push(user);
        else if (role == RoleType.COMPLIANCE_OFFICER)
            complianceOfficers.push(user);
        else if (role == RoleType.FINANCIAL_AUDITOR)
            financialAuditors.push(user);
        else if (role == RoleType.SANCTIONING_AUTHORITY)
            sanctioningAuthorities.push(user);
    }

    function removeFromRole(address user) external onlyOwner {
        RoleType role = roleOf[user];
        require(role != RoleType.NONE, "No role assigned");

        if (role == RoleType.ON_SITE_ENGINEER) {
            _removeFromArray(onSiteEngineers, user);
        } else if (role == RoleType.COMPLIANCE_OFFICER) {
            _removeFromArray(complianceOfficers, user);
        } else if (role == RoleType.FINANCIAL_AUDITOR) {
            _removeFromArray(financialAuditors, user);
        } else if (role == RoleType.SANCTIONING_AUTHORITY) {
            _removeFromArray(sanctioningAuthorities, user);
        }

        roleOf[user] = RoleType.NONE;
    }

    function _removeFromArray(address[] storage arr, address user) internal {
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i] == user) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }
    }
    function _random(
        address[] storage arr,
        uint salt
    ) internal view returns (address) {
        require(arr.length > 0, "Empty pool");

        uint rand = uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    salt
                )
            )
        );

        return arr[rand % arr.length];
    }

    

    function getAllRolePools() external view returns (
    address[] memory,
    address[] memory,
    address[] memory,
    address[] memory
) {
    return (
        onSiteEngineers,
        complianceOfficers,
        financialAuditors,
        sanctioningAuthorities
    );
}   
}
