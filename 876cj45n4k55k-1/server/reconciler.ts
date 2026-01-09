import { ethers } from 'ethers';
import { log } from './index';
import { storage } from './storage';
import { sendNotification } from './notifications';

const ESCROW_ABI = [
  'event EscrowCreated(uint256 indexed escrowId, uint256 indexed challengeId, address indexed creator, address token, uint256 amount)',
  'event EscrowMatched(uint256 indexed escrowId, address indexed opponent, uint256 amount)',
  'event EscrowSettled(uint256 indexed escrowId, address indexed winner, uint256 amount)'
];

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

export async function startReconciler() {
  const rpc = process.env.RECONCILER_RPC;
  const escrowAddr = process.env.VITE_ESCROW_CONTRACT_ADDRESS || process.env.ESCROW_CONTRACT_ADDRESS;
  if (!rpc || !escrowAddr) {
    log('Reconciler not started: missing RECONCILER_RPC or ESCROW_CONTRACT_ADDRESS');
    return;
  }

  provider = new ethers.JsonRpcProvider(rpc);
  contract = new ethers.Contract(escrowAddr, ESCROW_ABI, provider);

  contract.on('EscrowCreated', handleEscrowCreated);
  contract.on('EscrowMatched', handleEscrowMatched);
  contract.on('EscrowSettled', handleEscrowSettled);

  log(`Reconciler started and listening to ${escrowAddr}`);
}

export async function stopReconciler() {
  if (contract) {
    contract.removeAllListeners('EscrowCreated');
    contract.removeAllListeners('EscrowMatched');
    contract.removeAllListeners('EscrowSettled');
    contract = null;
  }
  if (provider) provider = null;
}

export async function handleEscrowCreated(escrowId: ethers.BigNumberish, challengeId: ethers.BigNumberish, creator: string, token: string, amount: ethers.BigNumberish) {
  const eId = Number(escrowId.toString());
  const cId = Number(challengeId.toString());
  log(`EscrowCreated escrowId=${eId} challengeId=${cId} creator=${creator} token=${token} amount=${amount.toString()}`);

  try {
    await storage.updateChallenge(cId, {
      escrowContractId: eId,
      escrowTxHash: '',
      tokenAddress: token,
      status: 'escrowed',
    } as any);
    sendNotification('challenge:escrowed', { challengeId: cId, escrowId: eId, creator, token, amount: amount.toString() });
  } catch (e) {
    log(`Failed to process EscrowCreated: ${String(e)}`);
  }
}

export async function handleEscrowMatched(escrowId: ethers.BigNumberish, opponent: string, amount: ethers.BigNumberish) {
  const eId = Number(escrowId.toString());
  log(`EscrowMatched escrowId=${eId} opponent=${opponent} amount=${amount.toString()}`);
  // find challenge by escrowContractId
  try {
    // naive: search by escrowContractId
    // NOTE: storage may need a helper; we perform a simple scan via getChallenges
    const challenges = await storage.getChallenges();
    const ch = challenges.find((c) => c.escrowContractId === eId);
    if (!ch) return;
    await storage.updateChallenge(ch.id, {
      status: 'matched',
      matcherAddress: opponent,
      matchedTxHash: '',
      matchedAt: new Date(),
    } as any);
    sendNotification('challenge:matched', { challengeId: ch.id, matcher: opponent });
  } catch (e) {
    log(`Failed to process EscrowMatched: ${String(e)}`);
  }
}

export async function mintNFTTo(winner: string, tokenURI = ''): Promise<{ txHash?: string; tokenId?: number } | null> {
  const pk = process.env.RECONCILER_PRIVATE_KEY;
  const nftAddr = process.env.BANTABRO_NFT_ADDRESS || process.env.VITE_BANTABRO_NFT_ADDRESS;
  if (!pk || !nftAddr) {
    log('Mint skipped: missing RECONCILER_PRIVATE_KEY or BANTABRO_NFT_ADDRESS');
    return null;
  }

  try {
    const rpc = process.env.RECONCILER_RPC || '';
    const provider = rpc ? new ethers.JsonRpcProvider(rpc) : ethers.getDefaultProvider();
    const signer = new ethers.Wallet(pk as any, provider);
    const nftAbi = ['function mintTo(address to, string memory tokenURI) external returns (uint256)'];
    const nft = new ethers.Contract(nftAddr, nftAbi, signer as any);
    const tx = await nft.mintTo(winner, tokenURI);
    const receipt = await tx.wait();

    // extract tokenId from receipt/events if possible
    let tokenId: number | undefined;
    try {
      const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer' && e.args && e.args[1] === winner);
      if (transferEvent) {
        tokenId = Number(transferEvent.args[2].toString());
      }
    } catch (err) {
      // ignore
    }

    return { txHash: receipt.transactionHash || tx.hash, tokenId };
  } catch (err) {
    log(`Mint failed: ${String(err)}`);
    return null;
  }
}

export async function handleEscrowSettled(escrowId: ethers.BigNumberish, winner: string, amount: ethers.BigNumberish) {
  const eId = Number(escrowId.toString());
  log(`EscrowSettled escrowId=${eId} winner=${winner} amount=${amount.toString()}`);
  try {
    const challenges = await storage.getChallenges();
    const ch = challenges.find((c) => c.escrowContractId === eId);
    if (!ch) return;
    await storage.updateChallenge(ch.id, {
      status: 'settled',
    } as any);

    // attempt to mint NFT reward to the winner
    const nftResult = await mintNFTTo(winner);
    if (nftResult) {
      await storage.updateChallenge(ch.id, {
        nftTxHash: nftResult.txHash,
        nftTokenId: nftResult.tokenId ?? undefined,
      } as any);
      sendNotification('challenge:nft_minted', { challengeId: ch.id, winner, txHash: nftResult.txHash, tokenId: nftResult.tokenId });
    }

    // PHASE 4: Settlement swap (platform-funded swap USDC -> creator token)
    try {
      if (ch.settlementToken) {
        const routerAddr = process.env.DEX_ROUTER_ADDRESS;
        const usdcAddr = process.env.USDC_ADDRESS || process.env.VITE_USDC_ADDRESS;
        const creatorTokenAddr = ch.settlementToken; // stored as contract address

        if (!routerAddr || !usdcAddr) {
          log('Swap skipped: missing DEX_ROUTER_ADDRESS or USDC_ADDRESS');
        } else {
          const pk = process.env.RECONCILER_PRIVATE_KEY;
          if (!pk) throw new Error('Missing RECONCILER_PRIVATE_KEY for swaps');

          const rpc = process.env.RECONCILER_RPC || '';
          const providerLocal = new ethers.JsonRpcProvider(rpc);
          const signer = new ethers.Wallet(pk as any, providerLocal);
          const signerAddr = await signer.getAddress();

          // compute expected output
          const amounts = await (await import('./lib/swap')).getAmountsOut(providerLocal, routerAddr, amount, [usdcAddr, creatorTokenAddr]);
          const outEstimated = amounts[amounts.length - 1];
          const minOut = outEstimated.mul(98).div(100); // 2% slippage

          // approve router to spend platform USDC
          const erc20Abi = ['function approve(address spender, uint256 amount) external returns (bool)', 'function balanceOf(address owner) view returns (uint256)'];
          const usdc = new ethers.Contract(usdcAddr, erc20Abi, signer as any);

          // Check balance
          const balBefore = await usdc.balanceOf(signerAddr);
          if (balBefore.lt(amount)) {
            log('Swap skipped: insufficient USDC balance in platform treasury');
          } else {
            await usdc.approve(routerAddr, amount);
            const swapResult = await (await import('./lib/swap')).swapExactTokensForTokens(signer, routerAddr, amount, minOut, [usdcAddr, creatorTokenAddr], signerAddr);

            // compute received tokens and transfer to winner
            const tokenAbi = ['function balanceOf(address owner) view returns (uint256)', 'function transfer(address to, uint256 amount) external returns (bool)'];
            const token = new ethers.Contract(creatorTokenAddr, tokenAbi, signer as any);
            const before = await token.balanceOf(signerAddr);
            // Wait for swap receipt already awaited in swapExactTokensForTokens
            const after = await token.balanceOf(signerAddr);
            const received = after.sub(before);

            if (received.gt(0)) {
              await token.transfer(winner, received);
              await storage.updateChallenge(ch.id, {
                nftTxHash: nftResult?.txHash ?? undefined,
                // record swap tx hash
                matchedTxHash: swapResult.tx.hash || swapResult.receipt.transactionHash,
              } as any);

              sendNotification('challenge:creator_settled', { challengeId: ch.id, winner, amount: received.toString(), token: creatorTokenAddr });
            } else {
              log('Swap completed but no tokens received');
            }
          }
        }
      }
    } catch (e) {
      log(`Swap failed: ${String(e)}`);
      // Fallback: notify that winner received USDC only
      sendNotification('challenge:settled_usdc', { challengeId: ch.id, winner });
    }

    sendNotification('challenge:settled', { challengeId: ch.id, winner });
  } catch (e) {
    log(`Failed to process EscrowSettled: ${String(e)}`);
  }
}

// For testing convenience
export const _internal = {
  handleEscrowCreated,
  handleEscrowMatched,
  handleEscrowSettled,
  mintNFTTo,
};
