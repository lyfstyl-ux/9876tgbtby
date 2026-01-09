import { ethers } from 'ethers';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function decimals() view returns (uint8)'
];

const ESCROW_ABI = [
  'function createEscrowERC20(uint256 challengeId, address token, uint256 amount) public returns (uint256)',
  'function matchEscrowERC20(uint256 escrowId) public',
  'event EscrowCreated(uint256 indexed escrowId, uint256 indexed challengeId, address indexed creator, address token, uint256 amount)',
  'event EscrowMatched(uint256 indexed escrowId, address indexed opponent, uint256 amount)'
];

export async function approveToken(tokenAddress: string, spender: string, amount: bigint, signer: any) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const tx = await token.approve(spender, amount);
  return tx;
}

export async function createEscrowERC20(escrowAddress: string, challengeId: number, tokenAddress: string, amount: bigint, signer: any) {
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const tx = await escrow.createEscrowERC20(challengeId, tokenAddress, amount);
  return tx;
}

export async function matchEscrowERC20(escrowAddress: string, escrowId: number, signer: any) {
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const tx = await escrow.matchEscrowERC20(escrowId);
  return tx;
}

export function parseEscrowCreatedFromReceipt(receipt: any) : { escrowId?: number, challengeId?: number } {
  const iface = new ethers.Interface(ESCROW_ABI);
  for (const log of receipt.logs || []) {
    try {
      const parsed = iface.parseLog(log as any);
      if (parsed && parsed.name === 'EscrowCreated') {
        const escrowId = Number(parsed.args[0].toString());
        const challengeId = Number(parsed.args[1].toString());
        return { escrowId, challengeId };
      }
    } catch (e) {
      // not the right event, continue
    }
  }
  return {};
}

export async function getTokenDecimals(tokenAddress: string, provider: any): Promise<number> {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  try {
    const d = await token.decimals();
    return Number(d);
  } catch (e) {
    return 18;
  }
}
