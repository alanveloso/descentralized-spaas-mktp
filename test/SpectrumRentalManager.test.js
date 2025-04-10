const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SpectrumRentalManager", function () {
  let rentalManager, providerManager, spectrumToken, spectrumTokenManager, owner, tenant, provider;

  beforeEach(async function () {
    [owner, tenant, provider] = await ethers.getSigners();

    // Deploy SpectrumToken
    const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    spectrumToken = await SpectrumToken.deploy(owner.address);

    // Deploy SpectrumTokenManager
    const SpectrumTokenManager = await ethers.getContractFactory("SpectrumTokenManager");
    spectrumTokenManager = await SpectrumTokenManager.deploy(spectrumToken.target);

    // Deploy SpectrumProviderManager
    const SpectrumProviderManager = await ethers.getContractFactory("SpectrumProviderManager");
    providerManager = await SpectrumProviderManager.deploy(spectrumTokenManager.target);

    // Set the provider manager in the token manager
    await spectrumTokenManager.connect(owner).setProviderManager(providerManager.target);

    // Deploy SpectrumRentalManager
    const SpectrumRentalManager = await ethers.getContractFactory("SpectrumRentalManager");
    rentalManager = await SpectrumRentalManager.deploy(providerManager.target, spectrumTokenManager.target);

    // Mint tokens to the provider and approve the SpectrumTokenManager
    await spectrumToken.connect(owner).mint(provider.address, 1, 100);
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);

    // Mint tokens to the tenant and approve the SpectrumTokenManager
    await spectrumToken.connect(owner).mint(tenant.address, 1, 50); // Adiciona tokens ao tenant para devolução
    await spectrumToken.connect(tenant).setApprovalForAll(spectrumTokenManager.target, true); // Aprovação necessária para devolução

    // Transfer tokens from provider to the SpectrumTokenManager
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
    await spectrumTokenManager.connect(provider).receiveTokensFromProvider(provider.address, 1, 50);
    await providerManager.connect(provider).provideTokens(provider, 1, 50, ethers.parseEther("0.01"));

    // Create an active rental for the tenant
    const initialBalance = ethers.parseEther("1.0");
    await rentalManager.connect(owner).requestSpectrum(tenant.address, [1], [10], initialBalance);
  });

  it("Should return spectrum successfully", async function () {
    // Call returnSpectrum to return the rented spectrum
    await rentalManager.connect(tenant).returnSpectrum(tenant.address, [1], [10]);

    // Verify that the rental was ended
    const rental = await rentalManager.activeRentals(tenant.address);
    expect(rental.isActive).to.equal(false);

    // Check if the spectrum amount was updated
    const returnedAmount = await rentalManager.getSpectrumAmount(tenant.address, 1);
    expect(returnedAmount).to.equal(0);
  });

  it("Should allow partial return of spectrum", async function () {
    // Partially return the spectrum
    await rentalManager.connect(tenant).returnSpectrum(tenant.address, [1], [5]);

    // Verify that the rental is still active with a reduced spectrum amount
    const rental = await rentalManager.activeRentals(tenant.address);
    expect(rental.isActive).to.equal(true);

    // Verify that the spectrum amount has been partially returned
    const remainingAmount = await rentalManager.getSpectrumAmount(tenant.address, 1);
    expect(remainingAmount).to.equal(5); // Remaining amount after partial return
  });

  it("Should fail to return spectrum if no active rental exists", async function () {
    // Return full spectrum first
    await rentalManager.connect(tenant).returnSpectrum(tenant.address, [1], [10]);

    // Attempt to return spectrum again when there's no active rental
    await expect(
      rentalManager.connect(tenant).returnSpectrum(tenant.address, [1], [10])
    ).to.be.revertedWith("No active rental");
  });

  it("Should expand rental successfully", async function () {
    // Expand rental by adding more spectrum to the existing rental
    await rentalManager.connect(owner).expandRental(tenant.address, [1], [5]);

    // Verify that the rental was expanded with additional spectrum
    const rental = await rentalManager.activeRentals(tenant.address);
    expect(rental.isActive).to.equal(true);
    expect(rental.timeAllocated).to.be.above(0);

    // Check if the rentedSpectrumIds still contains the rented spectrum
    const rentedSpectrumId = await rentalManager.getRentedSpectrumIdByIndex(tenant.address, 0);
    expect(rentedSpectrumId).to.equal(1);

    // Verify that the amount of spectrum was increased correctly
    const updatedSpectrumAmount = await rentalManager.getSpectrumAmount(tenant.address, 1);
    expect(updatedSpectrumAmount).to.equal(15); // Original amount (10) + Expanded amount (5)
  });

  it("Should fail to expand rental if there is no active rental", async function () {
    // Complete the current rental
    await rentalManager.connect(tenant).returnSpectrum(tenant.address, [1], [10]);

    // Attempt to expand the rental after it is completed
    await expect(
      rentalManager.connect(owner).expandRental(tenant.address, [1], [5])
    ).to.be.revertedWith("No active rental");
  });
});
