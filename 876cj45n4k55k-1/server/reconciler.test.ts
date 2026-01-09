import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as storageModule from './storage';
import * as notificationsModule from './notifications';
import { _internal as reconciler } from './reconciler';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('reconciler handlers', () => {
  it('handleEscrowCreated updates challenge and sends notification', async () => {
    const spyUpdate = vi.spyOn(storageModule.storage as any, 'updateChallenge').mockResolvedValue({ id: 42 } as any);
    const spyNotify = vi.spyOn(notificationsModule, 'sendNotification').mockImplementation(() => ({} as any));

    await reconciler.handleEscrowCreated(5, 42, '0xCREATOR', '0xTOKEN', 1000);

    expect(spyUpdate).toHaveBeenCalledWith(42, expect.objectContaining({ escrowContractId: 5, tokenAddress: '0xTOKEN' }));
    expect(spyNotify).toHaveBeenCalledWith('challenge:escrowed', expect.objectContaining({ challengeId: 42 }));

    spyUpdate.mockRestore();
    spyNotify.mockRestore();
  });

  it('mintNFTTo returns null when env missing', async () => {
    delete process.env.RECONCILER_PRIVATE_KEY;
    delete process.env.BANTABRO_NFT_ADDRESS;

    const res = await reconciler.mintNFTTo('0xWIN');
    expect(res).toBeNull();
  });

  it('mintNFTTo calls contract and returns tx/tokenId', async () => {
    process.env.RECONCILER_PRIVATE_KEY = '0xabc';
    process.env.BANTABRO_NFT_ADDRESS = '0xNFTADDR';
    process.env.RECONCILER_RPC = 'http://localhost:8545';

    const fakeReceipt = { transactionHash: '0xNFT', events: [{ event: 'Transfer', args: ['0x0', '0xWIN', 555] }] };
    const fakeTx = { wait: async () => fakeReceipt };

    // mock ethers.Contract constructor
    const contractMock = vi.spyOn(require('ethers'), 'Contract').mockImplementation(() => ({ mintTo: async () => fakeTx } as any));

    const res = await reconciler.mintNFTTo('0xWIN');

    expect(res).toEqual({ txHash: '0xNFT', tokenId: 555 });

    contractMock.mockRestore();
    delete process.env.RECONCILER_PRIVATE_KEY;
    delete process.env.BANTABRO_NFT_ADDRESS;
    delete process.env.RECONCILER_RPC;
  });

  it('handleEscrowMatched finds challenge and notifies', async () => {
    // make storage.getChallenges return a challenge with escrowContractId 7
    const fakeChallenges = [{ id: 7, escrowContractId: 7 }] as any;
    const spyGet = vi.spyOn(storageModule.storage as any, 'getChallenges').mockResolvedValue(fakeChallenges as any);
    const spyUpdate = vi.spyOn(storageModule.storage as any, 'updateChallenge').mockResolvedValue({ id: 7 } as any);
    const spyNotify = vi.spyOn(notificationsModule, 'sendNotification').mockImplementation(() => ({} as any));

    await reconciler.handleEscrowMatched(7, '0xOPP', 1000);

    expect(spyGet).toHaveBeenCalled();
    expect(spyUpdate).toHaveBeenCalledWith(7, expect.objectContaining({ status: 'matched' }));
    expect(spyNotify).toHaveBeenCalledWith('challenge:matched', expect.objectContaining({ challengeId: 7 }));

    spyGet.mockRestore();
    spyUpdate.mockRestore();
    spyNotify.mockRestore();
  });

  it('handleEscrowSettled finds challenge, mints NFT and notifies', async () => {
    const fakeChallenges = [{ id: 8, escrowContractId: 8 }] as any;
    const spyGet = vi.spyOn(storageModule.storage as any, 'getChallenges').mockResolvedValue(fakeChallenges as any);
    const spyUpdate = vi.spyOn(storageModule.storage as any, 'updateChallenge').mockResolvedValue({ id: 8 } as any);
    const spyNotify = vi.spyOn(notificationsModule, 'sendNotification').mockImplementation(() => ({} as any));
    const spyMint = vi.spyOn(reconciler, 'mintNFTTo').mockResolvedValue({ txHash: '0xNFT', tokenId: 123 } as any);

    await reconciler.handleEscrowSettled(8, '0xWIN', 2000);

    expect(spyGet).toHaveBeenCalled();
    expect(spyUpdate).toHaveBeenCalledWith(8, expect.objectContaining({ status: 'settled' }));
    expect(spyMint).toHaveBeenCalledWith('0xWIN');
    expect(spyNotify).toHaveBeenCalledWith('challenge:nft_minted', expect.objectContaining({ challengeId: 8, winner: '0xWIN' }));
    expect(spyNotify).toHaveBeenCalledWith('challenge:settled', expect.objectContaining({ challengeId: 8 }));

    spyGet.mockRestore();
    spyUpdate.mockRestore();
    spyNotify.mockRestore();
    spyMint.mockRestore();
  });

  it('handleEscrowSettled performs platform swap and notifies', async () => {
    process.env.RECONCILER_PRIVATE_KEY = '0xabc';
    process.env.RECONCILER_RPC = 'http://localhost:8545';
    process.env.DEX_ROUTER_ADDRESS = '0xROUTER';
    process.env.USDC_ADDRESS = '0xUSDC';

    const { BigNumber } = require('ethers');

    const fakeChallenges = [{ id: 9, escrowContractId: 9, settlementToken: '0xCREAT' }] as any;
    const spyGet = vi.spyOn(storageModule.storage as any, 'getChallenges').mockResolvedValue(fakeChallenges as any);
    const spyUpdate = vi.spyOn(storageModule.storage as any, 'updateChallenge').mockResolvedValue({ id: 9 } as any);
    const spyNotify = vi.spyOn(notificationsModule, 'sendNotification').mockImplementation(() => ({} as any));
    const spyMint = vi.spyOn(reconciler, 'mintNFTTo').mockResolvedValue(null as any);

    // import swap module and spy its functions
    const swapModule = await import('./lib/swap');
    vi.spyOn(swapModule, 'getAmountsOut').mockResolvedValue([BigNumber.from(1000), BigNumber.from(500)]);

    // mutable token balance to simulate received tokens after swap
    let tokenBalance = BigNumber.from(0);
    vi.spyOn(swapModule, 'swapExactTokensForTokens').mockImplementation(async () => {
      tokenBalance = tokenBalance.add(BigNumber.from(500));
      return { tx: { hash: '0xSWAP' }, receipt: { transactionHash: '0xSWAP' } } as any;
    });

    // mock ethers.Contract behavior for USDC and creator token
    const contractMock = vi.spyOn(require('ethers'), 'Contract').mockImplementation((...args: any[]) => {
      const addr = args[0] as string;
      if (addr === '0xUSDC') {
        return {
          approve: async () => true,
          balanceOf: async () => BigNumber.from(10000),
        } as any;
      }
      if (addr === '0xCREAT') {
        return {
          balanceOf: async () => tokenBalance,
          transfer: async () => true,
        } as any;
      }
      return {} as any;
    });

    await reconciler.handleEscrowSettled(9, '0xWIN', BigNumber.from(1000));

    expect(spyGet).toHaveBeenCalled();
    expect(spyUpdate).toHaveBeenCalledWith(9, expect.objectContaining({ status: 'settled' }));
    expect(swapModule.getAmountsOut).toHaveBeenCalled();
    expect(swapModule.swapExactTokensForTokens).toHaveBeenCalled();
    expect(spyNotify).toHaveBeenCalledWith('challenge:creator_settled', expect.objectContaining({ challengeId: 9, winner: '0xWIN', token: '0xCREAT' }));

    // cleanup
    contractMock.mockRestore();
    spyGet.mockRestore();
    spyUpdate.mockRestore();
    spyNotify.mockRestore();
    spyMint.mockRestore();
    // unset envs
    delete process.env.RECONCILER_PRIVATE_KEY;
    delete process.env.RECONCILER_RPC;
    delete process.env.DEX_ROUTER_ADDRESS;
    delete process.env.USDC_ADDRESS;
  });

  it('handleEscrowSettled falls back to USDC when swap fails', async () => {
    process.env.RECONCILER_PRIVATE_KEY = '0xabc';
    process.env.RECONCILER_RPC = 'http://localhost:8545';
    process.env.DEX_ROUTER_ADDRESS = '0xROUTER';
    process.env.USDC_ADDRESS = '0xUSDC';

    const { BigNumber } = require('ethers');

    const fakeChallenges = [{ id: 10, escrowContractId: 10, settlementToken: '0xCREAT' }] as any;
    const spyGet = vi.spyOn(storageModule.storage as any, 'getChallenges').mockResolvedValue(fakeChallenges as any);
    const spyUpdate = vi.spyOn(storageModule.storage as any, 'updateChallenge').mockResolvedValue({ id: 10 } as any);
    const spyNotify = vi.spyOn(notificationsModule, 'sendNotification').mockImplementation(() => ({} as any));
    const spyMint = vi.spyOn(reconciler, 'mintNFTTo').mockResolvedValue(null as any);

    const swapModule = await import('./lib/swap');
    vi.spyOn(swapModule, 'getAmountsOut').mockRejectedValue(new Error('no route'));

    // mock USDC balance sufficient
    const contractMock = vi.spyOn(require('ethers'), 'Contract').mockImplementation((...args: any[]) => {
      const addr = args[0] as string;
      if (addr === '0xUSDC') {
        return {
          approve: async () => true,
          balanceOf: async () => BigNumber.from(10000),
        } as any;
      }
      return {} as any;
    });

    await reconciler.handleEscrowSettled(10, '0xWIN', BigNumber.from(1000));

    expect(spyNotify).toHaveBeenCalledWith('challenge:settled_usdc', expect.objectContaining({ challengeId: 10, winner: '0xWIN' }));

    contractMock.mockRestore();
    spyGet.mockRestore();
    spyUpdate.mockRestore();
    spyNotify.mockRestore();
    spyMint.mockRestore();

    delete process.env.RECONCILER_PRIVATE_KEY;
    delete process.env.RECONCILER_RPC;
    delete process.env.DEX_ROUTER_ADDRESS;
    delete process.env.USDC_ADDRESS;
  });
});
