// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITenderFactory {
    function isGovernment(address) external view returns (bool);
}

contract Tender {

    // ---------------- ENUMS ----------------
    enum TenderStatus { BIDDING, ACTIVE, COMPLETED, CANCELLED }
    enum MilestoneStatus { PENDING, UNDER_REVIEW, APPROVED }

    // ---------------- STATE ----------------
    address public factory;
    address public contractor;

    uint256 public startTime;
    uint256 public endTime;
    uint256 public biddingEndTime;

    uint256 public winningBid;
    uint256 public contractorDeposit;
    uint256 public retainedPercent;

    uint256 public currentMilestone;

    TenderStatus public tenderStatus;

    // ---------------- ROLES ----------------
    address public onSiteEngineer;
    address public complianceOfficer;
    address public financialAuditor;
    address public sanctioningAuthority;

    // ---------------- BIDDING ----------------
    struct Bid {
        address bidder;
        uint256 amount;
    }

    Bid[] public bids;
    mapping(address => bool) public hasBid;

    // ---------------- MILESTONES ----------------
    struct Milestone {
        string name;
        uint256 percentage;
        uint256 deadline;
        uint256 completionPercent;
        uint256 depositShare;
        MilestoneStatus status;
    }

    Milestone[] public milestones;

    // ---------------- MODIFIERS ----------------
    modifier onlyGovernment() {
        require(
            ITenderFactory(factory).isGovernment(msg.sender),
            "Not government"
        );
        _;
    }

    modifier onlyContractor() {
        require(msg.sender == contractor, "Not contractor");
        _;
    }

    modifier onlyActive() {
        require(tenderStatus == TenderStatus.ACTIVE, "Not active");
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == onSiteEngineer ||
            msg.sender == complianceOfficer ||
            msg.sender == financialAuditor ||
            msg.sender == sanctioningAuthority,
            "Not admin"
        );
        _;
    }

    // ---------------- CONSTRUCTOR ----------------
    constructor(
        address _factory,
        address[] memory _admins, // 🔥 FIXED
        uint256 _startTime,
        uint256 _endTime,
        uint256 _biddingEndTime,
        uint256 _retainedPercent,
        string[] memory _names,
        uint256[] memory _percentages,
        uint256[] memory _deadlines
    ) {
        require(_admins.length == 4, "Need 4 admins");

        factory = _factory;

        // 🔥 assign roles
        onSiteEngineer = _admins[0];
        complianceOfficer = _admins[1];
        financialAuditor = _admins[2];
        sanctioningAuthority = _admins[3];

        require(_startTime < _endTime, "Invalid time");
        require(_biddingEndTime < _startTime, "Bidding must end first");

        require(
            _names.length == _percentages.length &&
            _names.length == _deadlines.length,
            "Array mismatch"
        );

        uint256 totalPercent;
        for (uint i = 0; i < _percentages.length; i++) {
            totalPercent += _percentages[i];
        }
        require(totalPercent == 100, "Percent must be 100");

        startTime = _startTime;
        endTime = _endTime;
        biddingEndTime = _biddingEndTime;

        retainedPercent = _retainedPercent;

        for (uint i = 0; i < _names.length; i++) {
            milestones.push(Milestone({
                name: _names[i],
                percentage: _percentages[i],
                deadline: _deadlines[i],
                completionPercent: 0,
                depositShare: 0,
                status: MilestoneStatus.PENDING
            }));
        }

        tenderStatus = TenderStatus.BIDDING;
    }

    // ---------------- GET ADMINS ----------------
    function getAdmins() external view returns (
        address,
        address,
        address,
        address
    ) {
        return (
            onSiteEngineer,
            complianceOfficer,
            financialAuditor,
            sanctioningAuthority
        );
    }

    // ---------------- FUNDING ----------------
    function fundContract() external payable onlyGovernment {}

    // ---------------- BIDDING ----------------
    function placeBid(uint256 _amount) external {
        require(block.timestamp < biddingEndTime, "Bidding ended");
        require(!hasBid[msg.sender], "Already bid");

        bids.push(Bid(msg.sender, _amount));
        hasBid[msg.sender] = true;
    }

    function selectContractor(address _contractor, uint256 _winningBid)
        external
        onlyGovernment
    {
        require(block.timestamp >= biddingEndTime, "Bidding not over");
        require(hasBid[_contractor], "Not bidder");

        bool validBid = false;
        for (uint i = 0; i < bids.length; i++) {
            if (
                bids[i].bidder == _contractor &&
                bids[i].amount == _winningBid
            ) {
                validBid = true;
                break;
            }
        }
        require(validBid, "Bid mismatch");

        contractor = _contractor;
        winningBid = _winningBid;

        tenderStatus = TenderStatus.ACTIVE;
    }

    // ---------------- REVIEW ----------------
    function submitWorkForReview(uint256 id)
        external
        onlyGovernment
        onlyActive
    {
        require(id == currentMilestone, "Wrong milestone");

        Milestone storage m = milestones[id];
        require(m.status == MilestoneStatus.PENDING, "Invalid state");

        m.status = MilestoneStatus.UNDER_REVIEW;
    }

    function evaluateMilestone(uint256 id, uint256 percent)
        external
        onlyGovernment
        onlyActive
    {
        require(id == currentMilestone, "Wrong milestone");
        require(percent <= 100, "Invalid percent");

        Milestone storage m = milestones[id];
        require(m.status == MilestoneStatus.UNDER_REVIEW, "Invalid state");

        m.completionPercent = percent;

        if (percent >= 90 && block.timestamp <= m.deadline) {
            _finalize(id);
        } else if (percent < 90 && block.timestamp <= m.deadline) {
            m.status = MilestoneStatus.PENDING;
        } else {
            _finalize(id);
        }
    }

    // ---------------- FINALIZE ----------------
    function _finalize(uint256 id) internal {
        Milestone storage m = milestones[id];

        uint256 penalty = 0;
        if (block.timestamp > m.deadline) penalty = 50;

        uint256 slashAmount = (m.depositShare * penalty) / 100;
        uint256 returnAmount = m.depositShare - slashAmount;

        if (slashAmount > 0) {
            (bool s1,) = payable(msg.sender).call{value: slashAmount}("");
            require(s1, "Gov payment failed");
        }

        if (returnAmount > 0) {
            (bool s2,) = contractor.call{value: returnAmount}("");
            require(s2, "Return failed");
        }

        uint256 payout = (winningBid * m.percentage) / 100;
        (bool s3,) = contractor.call{value: payout}("");
        require(s3, "Payout failed");

        m.status = MilestoneStatus.APPROVED;

        currentMilestone++;

        if (currentMilestone == milestones.length) {
            tenderStatus = TenderStatus.COMPLETED;
        }
    }

    receive() external payable {}
}