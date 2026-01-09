// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract EscrowERC20 is Ownable {
    using ECDSA for bytes32;

    struct EscrowItem {
        uint256 id;
        uint256 challengeId;
        address creator;
        address opponent;
        address token; // ERC20 address
        uint256 amount; // amount per side in token minor units
        bool matched;
        bool settled;
        address winner;
    }

    uint256 public nextId;
    mapping(uint256 => EscrowItem) public escrows;

    address public operator; // authorized oracle/operator address

    event EscrowCreated(uint256 indexed escrowId, uint256 indexed challengeId, address indexed creator, address token, uint256 amount);
    event EscrowMatched(uint256 indexed escrowId, address indexed opponent, uint256 amount);
    event EscrowSettled(uint256 indexed escrowId, address indexed winner, uint256 amount);

    constructor() Ownable() {}

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    // Create escrow for a challenge; caller must have approved token transfer
    function createEscrowERC20(uint256 challengeId, address token, uint256 amount) external returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Token must be set");

        // transfer tokens from creator into this contract
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");

        uint256 id = nextId++;
        escrows[id] = EscrowItem({
            id: id,
            challengeId: challengeId,
            creator: msg.sender,
            opponent: address(0),
            token: token,
            amount: amount,
            matched: false,
            settled: false,
            winner: address(0)
        });

        emit EscrowCreated(id, challengeId, msg.sender, token, amount);
        return id;
    }

    // Opponent matches by transfering equal amount
    function matchEscrowERC20(uint256 escrowId) external {
        EscrowItem storage e = escrows[escrowId];
        require(e.creator != address(0), "Escrow not found");
        require(!e.matched, "Already matched");
        // transfer token from opponent
        require(IERC20(e.token).transferFrom(msg.sender, address(this), e.amount), "transferFrom failed");
        e.opponent = msg.sender;
        e.matched = true;

        emit EscrowMatched(escrowId, msg.sender, e.amount);
    }

    // Settle by specifying winner; contract transfers total tokens to winner
    function settleEscrowERC20(uint256 escrowId, address winner) public {
        EscrowItem storage e = escrows[escrowId];
        require(e.creator != address(0), "Escrow not found");
        require(e.matched, "Not matched");
        require(!e.settled, "Already settled");
        require(winner == e.creator || winner == e.opponent, "Winner must be participant");

        e.settled = true;
        e.winner = winner;

        uint256 total = e.amount * 2;
        require(IERC20(e.token).transfer(winner, total), "transfer failed");

        emit EscrowSettled(escrowId, winner, total);
    }

    // Operator-signed settlement (off-chain oracle signs that `winner` should be awarded)
    function settleWithSignature(uint256 escrowId, address winner, bytes memory signature) external {
        require(operator != address(0), "No operator set");
        // message is keccak256 of escrowId + winner
        bytes32 message = keccak256(abi.encodePacked(escrowId, winner));
        bytes32 ethSigned = message.toEthSignedMessageHash();
        address signer = ethSigned.recover(signature);
        require(signer == operator, "Invalid operator signature");

        // perform settle
        settleEscrowERC20(escrowId, winner);
    }

    // Operator-only: Settle escrow and transfer tokens to an arbitrary recipient (e.g., platform swapper)
    function operatorSettleToRecipient(uint256 escrowId, address recipient) external {
        require(operator != address(0), "No operator set");
        require(msg.sender == operator || msg.sender == owner(), "Not operator or owner");

        EscrowItem storage e = escrows[escrowId];
        require(e.creator != address(0), "Escrow not found");
        require(e.matched, "Not matched");
        require(!e.settled, "Already settled");

        e.settled = true;
        e.winner = recipient;

        uint256 total = e.amount * 2;
        require(IERC20(e.token).transfer(recipient, total), "transfer failed");

        emit EscrowSettled(escrowId, recipient, total);
    }

    function getEscrow(uint256 escrowId) external view returns (EscrowItem memory) {
        return escrows[escrowId];
    }
}
