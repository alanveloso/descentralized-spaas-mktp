const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SpectrumProviderManager", function () {
  let providerManager, spectrumToken, spectrumTokenManager, owner, provider, provider2;

  beforeEach(async function () {
    [owner, provider, provider2] = await ethers.getSigners();

    // Deploy SpectrumToken
    const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    spectrumToken = await SpectrumToken.deploy(owner.address);

    // Deploy SpectrumTokenManager
    const SpectrumTokenManager = await ethers.getContractFactory("SpectrumTokenManager");
    spectrumTokenManager = await SpectrumTokenManager.deploy(spectrumToken.target);

    // Deploy SpectrumProviderManager, passando o SpectrumTokenManager como parâmetro
    const SpectrumProviderManager = await ethers.getContractFactory("SpectrumProviderManager");
    providerManager = await SpectrumProviderManager.deploy(spectrumTokenManager.target);

    // Configura o ProviderManager no TokenManager
    await spectrumTokenManager.setProviderManager(providerManager.target);

    // Mint tokens to providers and approve the SpectrumTokenManager
    await spectrumToken.connect(owner).mint(provider.address, 1, 100);
    await spectrumToken.connect(owner).mint(provider2.address, 1, 100);

    // Dê aprovação para que o SpectrumTokenManager gerencie os tokens dos provedores
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
    await spectrumToken.connect(provider2).setApprovalForAll(spectrumTokenManager.target, true);
  });

  it("Should allow provider to supply tokens", async function () {
    await providerManager.connect(provider).provideTokens(1, 50, ethers.parseEther("0.01"));
    const balance = await providerManager.providerTokenBalances(provider.address, 1);
    expect(balance).to.equal(50);
  });

  it("Should fail to supply tokens with zero amount", async function () {
    await expect(
      providerManager.connect(provider).provideTokens(1, 0, ethers.parseEther("0.01"))
    ).to.be.revertedWith("Amount must be greater than zero");
  });

  it("Should fail to supply tokens with zero rental rate", async function () {
    await expect(
      providerManager.connect(provider).provideTokens(1, 50, ethers.parseEther("0"))
    ).to.be.revertedWith("Rate per hour must be greater than zero");
  });

  it("Should update provider's token balance correctly after multiple supplies", async function () {
    await providerManager.connect(provider).provideTokens(1, 50, ethers.parseEther("0.01"));
    await providerManager.connect(provider).provideTokens(1, 25, ethers.parseEther("0.01"));
    const balance = await providerManager.providerTokenBalances(provider.address, 1);
    expect(balance).to.equal(75);
  });

  it("Should list providers sorted by rental rate", async function () {
    await providerManager.connect(provider).provideTokens(1, 50, ethers.parseEther("0.02"));
    await providerManager.connect(provider2).provideTokens(1, 50, ethers.parseEther("0.01"));

    const fstProvider = await providerManager.getProviderByIndex(1, 0);
    const sndProvider = await providerManager.getProviderByIndex(1, 1);
    expect(fstProvider).to.equal(provider2.address);
    expect(sndProvider).to.equal(provider.address);
  });

  it("Should find the best provider based on rate and availability", async function () {
    await providerManager.connect(provider).provideTokens(1, 50, ethers.parseEther("0.02"));
    await providerManager.connect(provider2).provideTokens(1, 50, ethers.parseEther("0.01"));

    const bestProvider = await providerManager.findBestProvider(1, 30);
    expect(bestProvider).to.equal(provider2.address);
  });

  it("Should revert if no provider has enough tokens for the requested amount", async function () {
    await providerManager.connect(provider).provideTokens(1, 20, ethers.parseEther("0.01"));
    await providerManager.connect(provider2).provideTokens(1, 15, ethers.parseEther("0.02"));

    await expect(providerManager.findBestProvider(1, 50)).to.be.revertedWith(
      "No provider found with sufficient spectrum for this request"
    );
  });
  
  it("Should update provider's balance after allocation", async function () {
    // Provider supplies 100 tokens
    await providerManager.connect(provider).provideTokens(1, 100, ethers.parseEther("0.01"));

    // Initial balance should be 100
    let initialBalance = await providerManager.providerTokenBalances(provider.address, 1);
    expect(initialBalance).to.equal(100);

    // Update balance after allocating 30 tokens
    await providerManager.updateProviderBalance(provider.address, 1, 30);

    // Balance should now be 70
    const updatedBalance = await providerManager.providerTokenBalances(provider.address, 1);
    expect(updatedBalance).to.equal(70);
  });
});
