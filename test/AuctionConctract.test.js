const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenAuction", function () {
  let tokenAuction, spectrumToken, owner, bidder1, bidder2;

  beforeEach(async function () {
    [owner, bidder1, bidder2] = await ethers.getSigners();

    // Deploy SpectrumToken
    const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    spectrumToken = await SpectrumToken.deploy(owner.address);

    // Deploy TokenAuction
    const TokenAuction = await ethers.getContractFactory("TokenAuction");
    tokenAuction = await TokenAuction.deploy(spectrumToken.target);

    // Mint tokens to the owner
    await spectrumToken.connect(owner).mint(owner.address, 1, 1000);

    // Approve the TokenAuction to manage owner's tokens
    await spectrumToken.connect(owner).setApprovalForAll(tokenAuction.target, true);
  });

  it("Should configure the auction successfully", async function () {
    const spectrumId = 1;
    const amount = 500;
    const minBid = ethers.parseEther("0.1");
    const duration = 3600; // 1 hour

    await tokenAuction.connect(owner).configureAuction(spectrumId, amount, minBid, duration);

    expect(await tokenAuction.spectrumId()).to.equal(spectrumId);
    expect(await tokenAuction.amount()).to.equal(amount);
    expect(await tokenAuction.minBid()).to.equal(minBid);
    expect(await tokenAuction.endTime()).to.be.above(0);

    const contractBalance = await spectrumToken.balanceOf(tokenAuction.target, spectrumId);
    expect(contractBalance).to.equal(amount);
  });

  it("Should place a valid bid", async function () {
    const spectrumId = 1;
    const amount = 500;
    const minBid = ethers.parseEther("0.1");
    const duration = 3600;

    await tokenAuction.connect(owner).configureAuction(spectrumId, amount, minBid, duration);

    const bidAmount = ethers.parseEther("0.2");
    await tokenAuction.connect(bidder1).placeBid({ value: bidAmount });

    expect(await tokenAuction.highestBid()).to.equal(bidAmount);
    expect(await tokenAuction.highestBidder()).to.equal(bidder1.address);
  });

  it("Should not allow a bid below the minimum bid", async function () {
    const spectrumId = 1;
    const amount = 500;
    const minBid = ethers.parseEther("0.1");
    const duration = 3600;

    await tokenAuction.connect(owner).configureAuction(spectrumId, amount, minBid, duration);

    const bidAmount = ethers.parseEther("0.05");
    await expect(tokenAuction.connect(bidder1).placeBid({ value: bidAmount }))
      .to.be.revertedWith("Bid must be higher than minimum bid");
  });

  it("Should not allow a bid lower than the current highest bid", async function () {
    const spectrumId = 1;
    const amount = 500;
    const minBid = ethers.parseEther("0.1");
    const duration = 3600;

    await tokenAuction.connect(owner).configureAuction(spectrumId, amount, minBid, duration);

    const bidAmount = ethers.parseEther("0.2");
    await tokenAuction.connect(bidder1).placeBid({ value: bidAmount });

    const lowerBid = ethers.parseEther("0.15");
    await expect(tokenAuction.connect(bidder2).placeBid({ value: lowerBid }))
      .to.be.revertedWith("Bid must be higher than current highest bid");
  });

  it("Should finalize the auction and transfer tokens to the highest bidder", async function () {
    const spectrumId = 1;
    const amount = 500;
    const minBid = ethers.parseEther("0.1");
    const duration = 3; // 3 second for testing

    await tokenAuction.connect(owner).configureAuction(spectrumId, amount, minBid, duration);

    const bidAmount = ethers.parseEther("0.2");
    await tokenAuction.connect(bidder1).placeBid({ value: bidAmount });

    // Wait for the auction to end
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);

    await tokenAuction.connect(owner).finalizeAuction();

    expect(await spectrumToken.balanceOf(bidder1.address, spectrumId)).to.equal(amount);
    expect(await ethers.provider.getBalance(tokenAuction.target)).to.equal(0);
  });

  it("Should allow non-winning bidders to withdraw their bids", async function () {
    const spectrumId = 1;
    const amount = 500;
    const minBid = ethers.parseEther("0.1");
    const duration = 3;

    await tokenAuction.connect(owner).configureAuction(spectrumId, amount, minBid, duration);

    const bidAmount1 = ethers.parseEther("0.2");
    const bidAmount2 = ethers.parseEther("0.3");
    await tokenAuction.connect(bidder1).placeBid({ value: bidAmount1 });
    await tokenAuction.connect(bidder2).placeBid({ value: bidAmount2 });

    // Wait for the auction to end
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);

    await tokenAuction.connect(owner).finalizeAuction();

    const bidder1InitialBalance = await ethers.provider.getBalance(bidder1.address);

    const tx = await tokenAuction.connect(bidder1).withdrawBid();
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed * BigInt(receipt.gasPrice);
    const bidder1FinalBalance = await ethers.provider.getBalance(bidder1.address);

    expect(bidder1FinalBalance).to.equal(bidder1InitialBalance + bidAmount1 - gasUsed);
  });
});
