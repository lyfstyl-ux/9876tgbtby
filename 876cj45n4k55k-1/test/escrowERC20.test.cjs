const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('EscrowERC20 + NFT integration', function () {
  let escrow;
  let token;
  let nft;
  const AMOUNT = 1_000_000; // 1 USDC in 6 decimals (for tests we'll keep units low)

  beforeEach(async () => {
    const Token = await ethers.getContractFactory('ERC20Mock');
    token = await Token.deploy('MockUSDC', 'mUSDC', 6);
    await token.waitForDeployment();

    const Escrow = await ethers.getContractFactory('EscrowERC20');
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    const NFT = await ethers.getContractFactory('BantABroNFT');
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    // mint tokens to accounts
    const [creator, opponent] = await ethers.getSigners();
    await token.mint(creator.address, AMOUNT * 10);
    await token.mint(opponent.address, AMOUNT * 10);

    // Make NFT contract owner be deployer (already owner)
  });

  it('creates, matches, settles, and mints NFT to winner', async () => {
    const [creator, opponent, deployer] = await ethers.getSigners();

    // creator approves escrow contract to spend token
    await token.connect(creator).approve(escrow.target, AMOUNT);

    const tx = await escrow.connect(creator).createEscrowERC20(99, token.target, AMOUNT);
    const receipt = await tx.wait();
    const parsed = receipt.logs.map(l => { try { return escrow.interface.parseLog(l); } catch (e) { return null; } }).find(p => p && p.name === 'EscrowCreated');
    const escrowId = Number(parsed.args.escrowId);

    // opponent approve and match
    await token.connect(opponent).approve(escrow.target, AMOUNT);
    await escrow.connect(opponent).matchEscrowERC20(escrowId);

    // record before balance after matching
    const before = await token.balanceOf(opponent.address);

    // settle to opponent via direct settle
    await escrow.settleEscrowERC20(escrowId, opponent.address);

    // now check winner balance increased
    const after = await token.balanceOf(opponent.address);
    expect(after > before).to.equal(true);

    // Mint NFT to winner using NFT contract (simulate off-chain listener doing this)
    await nft.connect(creator).mintTo(opponent.address, 'ipfs://test');
    const ownerOf = await nft.ownerOf(0);
    expect(ownerOf).to.equal(opponent.address);
  });

  it('settles via operator signature', async () => {
    const [creator, opponent, deployer] = await ethers.getSigners();

    // creator creates escrow
    await token.connect(creator).approve(escrow.target, AMOUNT);
    const tx = await escrow.connect(creator).createEscrowERC20(100, token.target, AMOUNT);
    const receipt = await tx.wait();
    const parsed = receipt.logs.map(l => { try { return escrow.interface.parseLog(l); } catch (e) { return null; } }).find(p => p && p.name === 'EscrowCreated');
    const escrowId = Number(parsed.args.escrowId);

    // opponent approve and match
    await token.connect(opponent).approve(escrow.target, AMOUNT);
    await escrow.connect(opponent).matchEscrowERC20(escrowId);

    // set operator to deployer (owner is creator)
    await escrow.connect(creator).setOperator(deployer.address);

    // build message hash and signature
    const message = ethers.utils.solidityKeccak256(['uint256','address'], [escrowId, opponent.address]);
    const sig = await deployer.signMessage(ethers.utils.arrayify(message));

    const beforeBal = await token.balanceOf(opponent.address);

    // call settleWithSignature
    await escrow.connect(creator).settleWithSignature(escrowId, opponent.address, sig);

    const afterBal = await token.balanceOf(opponent.address);
    expect(afterBal.gt(beforeBal)).to.equal(true);
  });
});