// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITenderFactory {
    function isGovernment(address) external view returns (bool);
}

contract Tender {

    enum TenderStatus { BIDDING, ACTIVE, COMPLETED, CANCELLED }
    enum MilestoneStatus { PENDING, UNDER_REVIEW, APPROVED }

    enum Role {
        NONE,
        ON_SITE_ENGINEER,
        COMPLIANCE_OFFICER,
        FINANCIAL_AUDITOR,
        SANCTIONING_AUTHORITY,
        CONTRACTOR,
        GOVERNMENT
    }

    address public factory;
    address public contractor;

    uint256 public startTime;
    uint256 public endTime;
    uint256 public biddingEndTime;

    uint256 public winningBid;
    uint256 public retainedPercent;

    uint256 public currentMilestone;

    TenderStatus public tenderStatus;

    address[4] public admins;
    mapping(address => Role) public roles;

    // ---------------- BIDDING ----------------
    struct Bid {
        address bidder;
        uint256 amount;
    }

    Bid[] public bids;
    mapping(address => bool) public hasBid;

    // ---------------- FUNDS ----------------
    uint256 public totalFunds;

    // ---------------- EIP712 ----------------
    bytes32 public DOMAIN_SEPARATOR;

    bytes32 public constant APPROVAL_TYPEHASH =
        keccak256("Approve(uint256 milestoneId,address tender)");

    mapping(uint256 => mapping(address => bool)) public hasSigned;
    mapping(uint256 => bool) public executed;

    // ---------------- MILESTONES ----------------
    struct Milestone {
        string name;
        uint256 percentage;
        uint256 deadline;
        MilestoneStatus status;
    }

    Milestone[] public milestones;

    // ---------------- EVENTS ----------------
    event Funded(uint256 amount);
    event BidPlaced(address bidder, uint256 amount);
    event ContractorSelected(address contractor, uint256 bid);
    event MilestoneSubmitted(uint256 id);
    event MilestoneExecuted(uint256 id);

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

    // ---------------- CONSTRUCTOR ----------------
    constructor(
        address _factory,
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
        require(_names.length == _percentages.length && _names.length == _deadlines.length, "Invalid milestone input");

        factory = _factory;

        admins = [_admins[0], _admins[1], _admins[2], _admins[3]];

        roles[_admins[0]] = Role.ON_SITE_ENGINEER;
        roles[_admins[1]] = Role.COMPLIANCE_OFFICER;
        roles[_admins[2]] = Role.FINANCIAL_AUDITOR;
        roles[_admins[3]] = Role.SANCTIONING_AUTHORITY;

        startTime = _startTime;
        endTime = _endTime;
        biddingEndTime = _biddingEndTime;

        retainedPercent = _retainedPercent;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Tender")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );

        uint256 totalPercent;
        for (uint i = 0; i < _names.length; i++) {
            totalPercent += _percentages[i];

            milestones.push(Milestone({
                name: _names[i],
                percentage: _percentages[i],
                deadline: _deadlines[i],
                status: MilestoneStatus.PENDING
            }));
        }

        require(totalPercent == 100, "Percent must be 100");

        tenderStatus = TenderStatus.BIDDING;
    }

    // ---------------- FUNDING ----------------

    function fundContract() external payable onlyGovernment {
        require(msg.value > 0, "No funds");
        totalFunds += msg.value;

        emit Funded(msg.value);
    }

    // ---------------- ROLE HELPERS ----------------

    function getRoleName(address user) external view returns (string memory) {
        Role r = roles[user];
        if (ITenderFactory(factory).isGovernment(user)) return "Government";
        if (r == Role.ON_SITE_ENGINEER) return "OnSiteEngineer";
        if (r == Role.COMPLIANCE_OFFICER) return "ComplianceOfficer";
        if (r == Role.FINANCIAL_AUDITOR) return "FinancialAuditor";
        if (r == Role.SANCTIONING_AUTHORITY) return "SanctioningAuthority";
        if (r == Role.CONTRACTOR) return "Contractor";
        return "None";
    }

    // ---------------- BIDDING ----------------

    function placeBid(uint256 amount) external {
        require(tenderStatus == TenderStatus.BIDDING, "Not bidding");
        require(block.timestamp < biddingEndTime, "Ended");
        require(!hasBid[msg.sender], "Already bid");

        bids.push(Bid(msg.sender, amount));
        hasBid[msg.sender] = true;

        emit BidPlaced(msg.sender, amount);
    }

    function selectContractor(address _contractor, uint256 _winningBid)
        external
        payable
        onlyGovernment
    {
        require(block.timestamp >= biddingEndTime, "Not over");
        require(hasBid[_contractor], "Not bidder");
        require(_contractor != address(0), "Invalid contractor");

        require(msg.value == _winningBid, "Incorrect fund amount");

        contractor = _contractor;
        roles[_contractor] = Role.CONTRACTOR;

        winningBid = _winningBid;
        totalFunds += msg.value;

        tenderStatus = TenderStatus.ACTIVE;

        emit ContractorSelected(_contractor, _winningBid);
    }

    // ---------------- MILESTONE ----------------

    function submitMilestone(uint256 id)
        external
        onlyContractor
        onlyActive
    {
        require(id == currentMilestone, "Wrong id");

        milestones[id].status = MilestoneStatus.UNDER_REVIEW;

        emit MilestoneSubmitted(id);
    }

    function executeMilestone(
        uint256 id,
        bytes[] calldata signatures
    ) external {
        require(id == currentMilestone, "Wrong milestone");
        require(!executed[id], "Done");
        require(signatures.length == 4, "Need 4");

        require(
            milestones[id].status == MilestoneStatus.UNDER_REVIEW,
            "Not submitted"
        );

        bytes32 structHash = keccak256(
            abi.encode(APPROVAL_TYPEHASH, id, address(this))
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        for (uint i = 0; i < 4; i++) {
            require(signatures[i].length == 65, "Invalid signature length");

            address signer = recover(digest, signatures[i]);

            require(!hasSigned[id][signer], "Duplicate");

            require(
                roles[signer] == Role.ON_SITE_ENGINEER ||
                roles[signer] == Role.COMPLIANCE_OFFICER ||
                roles[signer] == Role.FINANCIAL_AUDITOR ||
                roles[signer] == Role.SANCTIONING_AUTHORITY,
                "Invalid signer"
            );

            hasSigned[id][signer] = true;
        }

        executed[id] = true;

        _finalize(id);

        emit MilestoneExecuted(id);
    }

    function recover(bytes32 digest, bytes memory sig)
        internal
        pure
        returns (address)
    {
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return ecrecover(digest, v, r, s);
    }

    // ---------------- FINALIZE ----------------

    function _finalize(uint256 id) internal {
        Milestone storage m = milestones[id];

        uint256 payout = (winningBid * m.percentage) / 100;

        require(address(this).balance >= payout, "Insufficient funds");

        (bool sent,) = contractor.call{value: payout}("");
        require(sent, "Payment failed");

        m.status = MilestoneStatus.APPROVED;

        currentMilestone++;

        if (currentMilestone == milestones.length) {
            tenderStatus = TenderStatus.COMPLETED;
        }
    }

    receive() external payable {}
}