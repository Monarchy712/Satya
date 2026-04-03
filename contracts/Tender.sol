// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITenderFactory {
    function isGovernment(address) external view returns (bool);
}

contract Tender {

    // ---------------- ENUMS ----------------
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

    // ---------------- STATE ----------------
    address public factory;
    address public contractor;

    uint256 public startTime;
    uint256 public endTime;
    uint256 public biddingEndTime;

    uint256 public winningBid;
    uint256 public retainedPercent;

    uint256 public currentMilestone;

    TenderStatus public tenderStatus;

    // ---------------- ADMINS ----------------
    address[4] public admins;
    mapping(address => Role) public roles;

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
        uint256 depositShare;
        MilestoneStatus status;
    }

    Milestone[] public milestones;

    // ---------------- EVENTS ----------------
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

        factory = _factory;

        admins = [_admins[0], _admins[1], _admins[2], _admins[3]];

        // assign roles
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
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Tender")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            ) 
        );

        for (uint i = 0; i < _names.length; i++) {
            milestones.push(Milestone({
                name: _names[i],
                percentage: _percentages[i],
                deadline: _deadlines[i],
                depositShare: 0,
                status: MilestoneStatus.PENDING
            }));
        }

        tenderStatus = TenderStatus.BIDDING;
    }

    // ---------------- ROLE HELPERS ----------------

    function getUserRole(address user) public view returns (Role) {
        if (ITenderFactory(factory).isGovernment(user)) {
            return Role.GOVERNMENT;
        }
        return roles[user];
    }

    function getRoleName(address user)
        external
        view
        returns (string memory)
    {
        Role r = getUserRole(user);

        if (r == Role.ON_SITE_ENGINEER) return "OnSiteEngineer";
        if (r == Role.COMPLIANCE_OFFICER) return "ComplianceOfficer";
        if (r == Role.FINANCIAL_AUDITOR) return "FinancialAuditor";
        if (r == Role.SANCTIONING_AUTHORITY) return "SanctioningAuthority";
        if (r == Role.CONTRACTOR) return "Contractor";
        if (r == Role.GOVERNMENT) return "Government";

        return "None";
    }

    function getUserInfo(address user)
        external
        view
        returns (
            bool involved,
            string memory role,
            uint256 milestoneId,
            MilestoneStatus status
        )
    {
        Role r = getUserRole(user);

        return (
            r != Role.NONE,
            this.getRoleName(user),
            currentMilestone,
            milestones[currentMilestone].status
        );
    }

    function hasUserSigned(uint256 id, address user)
        external
        view
        returns (bool)
    {
        return hasSigned[id][user];
    }

    // ---------------- BIDDING ----------------

    function selectContractor(address _contractor, uint256 _winningBid)
        external
        onlyGovernment
    {
        contractor = _contractor;
        roles[_contractor] = Role.CONTRACTOR;

        winningBid = _winningBid;
        tenderStatus = TenderStatus.ACTIVE;
    }

    // ---------------- MILESTONE FLOW ----------------

    function submitMilestone(uint256 id)
        external
        onlyContractor
        onlyActive
    {
        require(id == currentMilestone, "Wrong milestone");

        Milestone storage m = milestones[id];
        require(m.status == MilestoneStatus.PENDING, "Invalid");

        m.status = MilestoneStatus.UNDER_REVIEW;

        emit MilestoneSubmitted(id);
    }

    function executeMilestone(
        uint256 id,
        bytes[] calldata signatures
    ) external {
        require(id == currentMilestone, "Wrong milestone");
        require(!executed[id], "Already executed");
        require(signatures.length == 4, "Need 4 sigs");

        bytes32 structHash = keccak256(
            abi.encode(APPROVAL_TYPEHASH, id, address(this))
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        for (uint i = 0; i < signatures.length; i++) {
            address signer = recover(digest, signatures[i]);

            require(isAdmin(signer), "Not admin");
            require(!hasSigned[id][signer], "Duplicate");

            hasSigned[id][signer] = true;
        }

        executed[id] = true;

        _finalize(id);

        emit MilestoneExecuted(id);
    }

    function isAdmin(address user) public view returns (bool) {
        for (uint i = 0; i < 4; i++) {
            if (admins[i] == user) return true;
        }
        return false;
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