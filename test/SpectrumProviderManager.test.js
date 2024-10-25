const { expect } = require("chai");
const cons = require("consolidate");
const { ethers } = require("hardhat");

describe("SpectrumProviderManager", function () {
  let providerManager, spectrumToken, owner, provider;

  beforeEach(async function () {
    [owner, provider] = await ethers.getSigners();

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

    // Mint tokens to the provider and approve the ProviderManager
    await spectrumToken.connect(owner).mint(provider.address, 1, 100);
    // Dê aprovação para que o SpectrumTokenManager gerencie os tokens do provedor
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);


  });

  it("Should allow provider to supply tokens", async function () {
    await providerManager.connect(provider).provideTokens(1, 50, ethers.parseEther("0.01"));
    const balance = await providerManager.providerTokenBalances(provider.address, 1);
    expect(balance).to.equal(50);
  });
});
