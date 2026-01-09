// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Escrow {
    struct EscrowItem {
        uint256 id;
        uint256 challengeId;
        address creator;
        address opponent;
        uint256 amount; // amount per side in wei
        bool matched;
        bool settled;
        address winner;
    }

    uint256 public nextId;
    mapping(uint256 => EscrowItem) public escrows;

    event EscrowCreated(uint256 indexed escrowId, uint256 indexed challengeId, address indexed creator, uint256 amount);
    event EscrowMatched(uint256 indexed escrowId, address indexed opponent, uint256 amount);
    event EscrowSettled(uint256 indexed escrowId, address indexed winner, uint256 amount);

    // Create escrow for a challenge; sender must send `amount` wei.
    function createEscrow(uint256 challengeId) external payable returns (uint256) {
        require(msg.value > 0, "Amount must be > 0");
        uint256 id = nextId++;
        escrows[id] = EscrowItem({
            id: id,
            challengeId: challengeId,
            creator: msg.sender,
            opponent: address(0),
            amount: msg.value,
            matched: false,
            settled: false,
            winner: address(0)
        });

        emit EscrowCreated(id, challengeId, msg.sender, msg.value);
        return id;
    }

    // Opponent matches by sending equal amount
    function matchEscrow(uint256 escrowId) external payable {
        EscrowItem storage e = escrows[escrowId];
        require(e.creator != address(0), "Escrow not found");
        require(!e.matched, "Already matched");
        require(msg.value == e.amount, "Must match exact amount");
        e.opponent = msg.sender;
        e.matched = true;

        emit EscrowMatched(escrowId, msg.sender, msg.value);
    }

    // For now, any caller can settle by specifying the winner (in prod this should be via oracle/dispute)
    function settleEscrow(uint256 escrowId, address winner) external {
        EscrowItem storage e = escrows[escrowId];
        require(e.creator != address(0), "Escrow not found");
        require(e.matched, "Not matched");
        require(!e.settled, "Already settled");
        require(winner == e.creator || winner == e.opponent, "Winner must be participant");

        e.settled = true;
        e.winner = winner;

        uint256 total = e.amount * 2;
        (bool ok, ) = winner.call{value: total}('');
        require(ok, "Transfer failed");

        emit EscrowSettled(escrowId, winner, total);
    }

    // Helper to retrieve escrow
    function getEscrow(uint256 escrowId) external view returns (EscrowItem memory) {
        return escrows[escrowId];
    }

    // Fallbacks
    receive() external payable {}
    fallback() external payable {}
}
