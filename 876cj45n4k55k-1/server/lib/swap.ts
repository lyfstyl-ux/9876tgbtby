import { ethers } from 'ethers';

const UNIV2_ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)'
];

export async function getAmountsOut(provider: ethers.providers.Provider, routerAddress: string, amountIn: ethers.BigNumberish, path: string[]) {
  const router = new ethers.Contract(routerAddress, UNIV2_ROUTER_ABI, provider);
  const amounts = await router.getAmountsOut(amountIn, path);
  return amounts as ethers.BigNumber[];
}

export async function swapExactTokensForTokens(signer: ethers.Signer, routerAddress: string, amountIn: ethers.BigNumberish, amountOutMin: ethers.BigNumberish, path: string[], recipient: string) {
  const router = new ethers.Contract(routerAddress, UNIV2_ROUTER_ABI, signer as any);

  // ensure token approvals handled by caller
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes
  const tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, recipient, deadline);
  const receipt = await tx.wait();
  return { tx, receipt };
}
