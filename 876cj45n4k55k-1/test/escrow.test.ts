import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract } from 'ethers';

describe('Escrow', function () {
  let escrow: Contract;
  const ONE = ethers.utils.parseEther('1');

  beforeEach(async () => {
    const Escrow = await ethers.getContractFactory('Escrow');
    escrow = await Escrow.deploy();
    await escrow.deployed();
  });

  it('creates, matches, and settles an escrow', async () => {
    const [creator, opponent] = await ethers.getSigners();

    // Creator creates escrow with 1 ETH
    const tx = await escrow.connect(creator).createEscrow(42, { value: ONE });
    const receipt = await tx.wait();
    const evt = receipt.events?.find((e: any) => e.event === 'EscrowCreated');
    const escrowId = evt.args.escrowId.toNumber();

    const e = await escrow.getEscrow(escrowId);
    expect(e.creator).to.equal(creator.address);
    expect(e.amount.toString()).to.equal(ONE.toString());
    expect(e.matched).to.equal(false);

    // Opponent matches by sending same amount
    await escrow.connect(opponent).matchEscrow(escrowId, { value: ONE });
    const e2 = await escrow.getEscrow(escrowId);
    expect(e2.matched).to.equal(true);
    expect(e2.opponent).to.equal(opponent.address);

    // Snapshot balances
    const before = await ethers.provider.getBalance(opponent.address);

    // Settle and send all funds to opponent
    const tx2 = await escrow.settleEscrow(escrowId, opponent.address);
    await tx2.wait();

    const e3 = await escrow.getEscrow(escrowId);
    expect(e3.settled).to.equal(true);
    expect(e3.winner).to.equal(opponent.address);

    const after = await ethers.provider.getBalance(opponent.address);
    expect(after.gt(before)).to.equal(true);
  });

  it('rejects matching with wrong amount', async () => {
    const [creator, opponent] = await ethers.getSigners();
    const tx = await escrow.connect(creator).createEscrow(5, { value: ONE });
    const receipt = await tx.wait();
    const escrowId = receipt.events?.find((e: any) => e.event === 'EscrowCreated').args.escrowId.toNumber();

    await expect(escrow.connect(opponent).matchEscrow(escrowId, { value: ethers.utils.parseEther('0.5') })).to.be.revertedWith('Must match exact amount');
  });
});
