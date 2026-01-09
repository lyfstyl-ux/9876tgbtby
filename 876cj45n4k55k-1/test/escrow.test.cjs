const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Escrow', function () {
  let escrow;
  const ONE = ethers.parseEther('1');

  beforeEach(async () => {
    const Escrow = await ethers.getContractFactory('Escrow');
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();
  });

  it('creates, matches, and settles an escrow', async () => {
    const [creator, opponent] = await ethers.getSigners();

    const tx = await escrow.connect(creator).createEscrow(42, { value: ONE });
    const receipt = await tx.wait();
    const parsed = receipt.logs.map(l => { try { return escrow.interface.parseLog(l); } catch (e) { return null; } }).find(p => p && p.name === 'EscrowCreated');
    const escrowId = Number(parsed.args.escrowId);

    const e = await escrow.getEscrow(escrowId);
    expect(e.creator).to.equal(creator.address);
    expect(e.amount.toString()).to.equal(ONE.toString());
    expect(e.matched).to.equal(false);

    await escrow.connect(opponent).matchEscrow(escrowId, { value: ONE });
    const e2 = await escrow.getEscrow(escrowId);
    expect(e2.matched).to.equal(true);
    expect(e2.opponent).to.equal(opponent.address);

    const before = await ethers.provider.getBalance(opponent.address);

    const tx2 = await escrow.settleEscrow(escrowId, opponent.address);
    await tx2.wait();

    const e3 = await escrow.getEscrow(escrowId);
    expect(e3.settled).to.equal(true);
    expect(e3.winner).to.equal(opponent.address);

    const after = await ethers.provider.getBalance(opponent.address);
    expect(after > before).to.equal(true);
  });

  it('rejects matching with wrong amount', async () => {
    const [creator, opponent] = await ethers.getSigners();
    const tx = await escrow.connect(creator).createEscrow(5, { value: ONE });
    const receipt = await tx.wait();
    const parsed = receipt.logs.map(l => { try { return escrow.interface.parseLog(l); } catch (e) { return null; } }).find(p => p && p.name === 'EscrowCreated');
    const escrowId = Number(parsed.args.escrowId);

    await expect(escrow.connect(opponent).matchEscrow(escrowId, { value: ethers.parseEther('0.5') })).to.be.revertedWith('Must match exact amount');
  });
});
