# Reconciler (on-chain event listener)

This service watches the Escrow contract for events and updates the DB + emits notifications.

Environment vars:
- RECONCILER_RPC - JSON-RPC URL to connect to the chain (e.g., Base testnet). Optional for local dev; if not set the reconciler won't start.
- ESCROW_CONTRACT_ADDRESS or VITE_ESCROW_CONTRACT_ADDRESS - deployed Escrow contract address to listen to.
- RECONCILER_PRIVATE_KEY - private key used to sign outbound transactions (e.g., NFT mint) when `EscrowSettled` events occur. Keep this secure (use secrets manager).
- BANTABRO_NFT_ADDRESS or VITE_BANTABRO_NFT_ADDRESS - deployed BantABroNFT contract address used for minting winner rewards.

Behavior:
- `EscrowCreated(escrowId, challengeId, creator, token, amount)` → set `escrowContractId` and `tokenAddress` on the challenge, status `escrowed`, send `challenge:escrowed` SSE event.
- `EscrowMatched(escrowId, opponent, amount)` → set status `matched`, set `matcherAddress` and send `challenge:matched` SSE event.
- `EscrowSettled(escrowId, winner, amount)` → set status `settled` and send `challenge:settled` SSE event, which can then be used to trigger NFT minting (owner action).

Notes:
- A full deployment requires an operator key to perform NFT minting; add env var `RECONCILER_PRIVATE_KEY` for an outbound signer if implementing automatic minting.
- The reconciler includes a lightweight `startReconciler()` that will start listening only when `RECONCILER_RPC` and `ESCROW_CONTRACT_ADDRESS` are set.
