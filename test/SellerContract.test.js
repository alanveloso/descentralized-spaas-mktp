const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SellerContract", function () {
  let sellerContract, spectrumToken, owner, buyer, anotherBuyer;

  beforeEach(async function () {
    [owner, buyer, anotherBuyer] = await ethers.getSigners();

    // Deploy SpectrumToken
    const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    spectrumToken = await SpectrumToken.deploy(owner.address);

    // Deploy SellerContract
    const SellerContract = await ethers.getContractFactory("SellerContract");
    sellerContract = await SellerContract.deploy(spectrumToken.target);

    // Mint tokens to the owner
    await spectrumToken.connect(owner).mint(owner.address, 1, 1000);

    // Approve the SellerContract to manage owner's tokens
    await spectrumToken.connect(owner).setApprovalForAll(sellerContract.target, true);
  });

  it("Should allow the owner to list tokens for sale", async function () {
    await sellerContract.connect(owner).configureSale(1, ethers.parseEther("0.01"), 500);

    const sale = await sellerContract.tokenSales(1);
    expect(sale.pricePerToken).to.equal(ethers.parseEther("0.01"));
    expect(sale.availableTokens).to.equal(500);

    const contractBalance = await spectrumToken.balanceOf(sellerContract.target, 1);
    expect(contractBalance).to.equal(500);
  });

  it("Should allow a buyer to purchase tokens", async function () {
    await sellerContract.connect(owner).configureSale(1, ethers.parseEther("0.01"), 500);

    const amountToBuy = 50;
    const totalPrice = ethers.parseEther("0.5");

    await sellerContract.connect(buyer).buyTokens(1, amountToBuy, { value: totalPrice });

    const buyerBalance = await spectrumToken.balanceOf(buyer.address, 1);
    expect(buyerBalance).to.equal(amountToBuy);

    const sale = await sellerContract.tokenSales(1);
    expect(sale.availableTokens).to.equal(450);
  });

  it("Should refund excess ETH sent during purchase", async function () {
    await sellerContract.connect(owner).configureSale(1, ethers.parseEther("0.01"), 500);

    const amountToBuy = 50;
    const totalPrice = ethers.parseEther("0.5");
    const excessPayment = ethers.parseEther("1.0");

    const buyerInitialBalance = await ethers.provider.getBalance(buyer.address);

    const tx = await sellerContract.connect(buyer).buyTokens(1, amountToBuy, { value: excessPayment });
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed * BigInt(receipt.gasPrice);

    const buyerFinalBalance = await ethers.provider.getBalance(buyer.address);
    const refund = excessPayment - totalPrice;
    expect(buyerFinalBalance + gasUsed + refund).to.equal(buyerInitialBalance);
  });

  it("Should not allow purchase of more tokens than available", async function () {
    await sellerContract.connect(owner).configureSale(1, ethers.parseEther("0.01"), 100);

    await expect(
      sellerContract.connect(buyer).buyTokens(1, 200, { value: ethers.parseEther("2.0") })
    ).to.be.revertedWith("Not enough tokens available for sale");
  });

  it("Should allow the owner to cancel a sale and reclaim tokens", async function () {
    await sellerContract.connect(owner).configureSale(1, ethers.parseEther("0.01"), 500);

    await sellerContract.connect(owner).cancelSale(1);

    const sale = await sellerContract.tokenSales(1);
    expect(sale.availableTokens).to.equal(0);

    const ownerBalance = await spectrumToken.balanceOf(owner.address, 1);
    expect(ownerBalance).to.equal(1000);

    const contractBalance = await spectrumToken.balanceOf(sellerContract.target, 1);
    expect(contractBalance).to.equal(0);
  });

  it("Should allow the owner to withdraw accumulated funds", async function () {
    await sellerContract.connect(owner).configureSale(1, ethers.parseEther("0.01"), 500);

    const totalPrice = ethers.parseEther("0.5");
    await sellerContract.connect(buyer).buyTokens(1, 50, { value: totalPrice });

    const ownerInitialBalance = await ethers.provider.getBalance(owner.address);

    const tx = await sellerContract.connect(owner).withdrawFunds();
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
    expect(ownerFinalBalance).to.equal(ownerInitialBalance + totalPrice - gasUsed);
  });
});
