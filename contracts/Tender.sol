// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Tender {

    // ---------------- ENUMS ----------------
    enum TenderStatus { BIDDING, ACTIVE, COMPLETED, CANCELLED }
    enum MilestoneStatus { PENDING, UNDER_REVIEW, APPROVED }

    // ---------------- STATE ----------------
    address public government;
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
        require(msg.sender == government, "Not government");
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

    // ---------------- CONSTRUCTOR ----------------
    constructor(
        address _government,
        address[] memory _admins,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _biddingEndTime,
        uint256 _retainedPercent,
        string[] memory _names,
        uint256[] memory _percentages,
        uint256[] memory _deadlines
    ) {
        require(_admins.length == 4, "Need 4 admins");
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

        government = _government;

        onSiteEngineer = _admins[0];
        complianceOfficer = _admins[1];
        financialAuditor = _admins[2];
        sanctioningAuthority = _admins[3];

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

    // ---------------- DEPOSIT ----------------
    function deposit() external payable onlyContractor {
        require(contractorDeposit == 0, "Already deposited");

        uint256 required = (winningBid * 30) / 100;
        require(msg.value == required, "Incorrect deposit");

        contractorDeposit = msg.value;

        uint256 distributable = contractorDeposit * (100 - retainedPercent) / 100;

        uint256 totalPercent;
        for (uint i = 0; i < milestones.length; i++) {
            totalPercent += milestones[i].percentage;
        }

        for (uint i = 0; i < milestones.length; i++) {
            milestones[i].depositShare =
                (distributable * milestones[i].percentage) / totalPercent;
        }
    }

    // ---------------- START REVIEW ----------------
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

    // ---------------- BACKEND EVALUATION ----------------
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

        if (block.timestamp > m.deadline) {
            penalty = 50;
        }

        uint256 slashAmount = (m.depositShare * penalty) / 100;
        uint256 returnAmount = m.depositShare - slashAmount;

        if (slashAmount > 0) {
            (bool successGov, ) = government.call{value: slashAmount}("");
            require(successGov, "Payment to government failed");
            contractorDeposit -= slashAmount;
        }

        if (returnAmount > 0) {
            (bool successCont, ) = contractor.call{value: returnAmount}("");
            require(successCont, "Payment to contractor failed");
            contractorDeposit -= returnAmount;
        }

        uint256 payout = (winningBid * m.percentage) / 100;
        require(address(this).balance >= payout, "Insufficient funds");

        (bool successPay, ) = contractor.call{value: payout}("");
        require(successPay, "Milestone payout failed");

        m.status = MilestoneStatus.APPROVED;

        currentMilestone++;

        if (currentMilestone == milestones.length) {
            tenderStatus = TenderStatus.COMPLETED;
        }
    }

    // ---------------- CANCEL ----------------
    function cancelTender() external onlyGovernment {
        require(tenderStatus != TenderStatus.COMPLETED, "Already completed");

        tenderStatus = TenderStatus.CANCELLED;

        if (contractorDeposit > 0) {
            uint256 refund = contractorDeposit;
            contractorDeposit = 0;

            (bool success, ) = contractor.call{value: refund}("");
            require(success, "Refund failed");
        }
    }

    // ---------------- GETTERS ----------------
    function getMilestone(uint256 id) external view returns (Milestone memory) {
        return milestones[id];
    }

    function getAllBids() external view returns (Bid[] memory) {
        return bids;
    }

    receive() external payable {}
}