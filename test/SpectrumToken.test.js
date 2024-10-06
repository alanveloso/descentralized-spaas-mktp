const { expect } = require("chai");

describe("SpectrumToken", function () {
  let SpectrumToken;
  let spectrumToken;
  let owner;
  let addr1;
  let marketplace;

  beforeEach(async function () {
    // Get the contract factory for SpectrumToken
    SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    
    // Get test accounts (owner is the deployer, addr1 is the user, marketplace is the marketplace address)
    [owner, addr1, marketplace] = await ethers.getSigners();

    // Deploy the contract with the owner's address
    spectrumToken = await SpectrumToken.deploy(owner.address);
  });

  it("Should allow the token owner to transfer tokens into custody", async function () {
    // Mint 3 tokens of 700 MHz for addr1
    await spectrumToken.mint(addr1.address, 700, 3);  // 3 tokens representing 10 MHz each in the 700 MHz spectrum
    expect(await spectrumToken.balanceOf(addr1.address, 700)).to.equal(3);

    // Transfer 2 tokens from addr1 to the marketplace
    await spectrumToken.connect(addr1).transferToCustody(marketplace.address, 700, 2);

    // Check the marketplace's balance (should have 2 tokens)
    expect(await spectrumToken.balanceOf(marketplace.address, 700)).to.equal(2);
    
    // Check the remaining balance of addr1 (should have 1 token left)
    expect(await spectrumToken.balanceOf(addr1.address, 700)).to.equal(1);
  });

  it("Should prevent others from transferring tokens they don't own", async function () {
    // Mint 3 tokens of 700 MHz for addr1
    await spectrumToken.mint(addr1.address, 700, 3);  // 3 tokens representing 10 MHz each in the 700 MHz spectrum

    // Try to transfer 1 token from addr1 to the marketplace using the owner (this should not be allowed)
    await expect(
      spectrumToken.connect(owner).transferToCustody(marketplace.address, 700, 1)
    ).to.be.revertedWith("Insufficient token balance");

    // Verify that no tokens have been transferred to the marketplace
    expect(await spectrumToken.balanceOf(marketplace.address, 700)).to.equal(0);
  });
});
