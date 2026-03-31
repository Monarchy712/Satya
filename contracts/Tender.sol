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
        string[] ipfsCIDs;
    }

    Milestone[] public milestones;

    mapping(uint256 => mapping(address => bool)) public approvals;
    mapping(uint256 => uint256) public approvalCount;

    // ---------------- MODIFIERS ----------------
    modifier onlyGovernment() {
        require(msg.sender == government, "Not government");
        _;
    }

    modifier onlyContractor() {
        require(msg.sender == contractor, "Not contractor");
        _;
    }

    modifier onlyDuringBidding() {
        require(block.timestamp < biddingEndTime, "Bidding ended");
        _;
    }

    modifier onlyAfterBidding() {
        require(block.timestamp >= biddingEndTime, "Bidding not over");
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == onSiteEngineer ||
            msg.sender == complianceOfficer ||
            msg.sender == financialAuditor ||
            msg.sender == sanctioningAuthority ||
            msg.sender == government,
            "Not admin"
        );
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
                status: MilestoneStatus.PENDING,
                ipfsCIDs: new string
            }));
        }

        tenderStatus = TenderStatus.BIDDING;
    }

    // ---------------- FUNDING ----------------
    function fundContract() external payable onlyGovernment {}

    // ---------------- BIDDING ----------------
    function placeBid(uint256 _amount) external onlyDuringBidding {
        require(!hasBid[msg.sender], "Already bid");
        bids.push(Bid(msg.sender, _amount));
        hasBid[msg.sender] = true;
    }

    function getTop3Bidders() external view onlyAfterBidding returns (Bid[] memory) {
        require(bids.length >= 3, "Not enough bids");

        Bid[] memory temp = bids;

        for (uint i = 0; i < temp.length; i++) {
            for (uint j = i + 1; j < temp.length; j++) {
                if (temp[j].amount < temp[i].amount) {
                    Bid memory t = temp[i];
                    temp[i] = temp[j];
                    temp[j] = t;
                }
            }
        }

        Bid;
        for (uint i = 0; i < 3; i++) {
            top3[i] = temp[i];
        }

        return top3;
    }

    // ---------------- SELECTION ----------------
    function selectContractor(address _contractor, uint256 _winningBid)
        external
        onlyGovernment
        onlyAfterBidding
    {
        require(hasBid[_contractor], "Not bidder");

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

    // ---------------- WORK SUBMISSION ----------------
    function uploadWork(uint256 id, string[] memory cids) external onlyContractor {
        Milestone storage m = milestones[id];
        require(m.status == MilestoneStatus.PENDING, "Already submitted");

        for (uint i = 0; i < cids.length; i++) {
            m.ipfsCIDs.push(cids[i]);
        }

        m.status = MilestoneStatus.UNDER_REVIEW;
    }

    // ---------------- ML RESULT ----------------
    function submitMLResult(uint256 id, uint256 percent) external {
        Milestone storage m = milestones[id];
        require(m.status == MilestoneStatus.UNDER_REVIEW, "Invalid state");
        m.completionPercent = percent;
    }

    // ---------------- APPROVAL ----------------
    function approveMilestone(uint256 id, bool approve) external onlyAdmin {
        require(!approvals[id][msg.sender], "Already voted");

        approvals[id][msg.sender] = true;

        if (!approve) {
            _slash(id, 100);
            milestones[id].status = MilestoneStatus.APPROVED;
            return;
        }

        approvalCount[id]++;

        if (approvalCount[id] == 5) {
            _finalize(id);
        }
    }

    // ---------------- INTERNAL ----------------
    function _finalize(uint256 id) internal {
        Milestone storage m = milestones[id];

        uint256 penalty = 100 - m.completionPercent;

        if (block.timestamp > m.deadline) {
            penalty += 50;
            if (penalty > 100) penalty = 100;
        }

        _slash(id, penalty);

        uint256 payout = (winningBid * m.percentage) / 100;
        payable(contractor).transfer(payout);

        m.status = MilestoneStatus.APPROVED;
    }

    function _slash(uint256 id, uint256 percent) internal {
        uint256 amount = (milestones[id].depositShare * percent) / 100;

        if (amount > 0) {
            payable(government).transfer(amount);
            contractorDeposit -= amount;
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