const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SpectrumMarketplace", function () {
  let marketplace, spectrumToken, spectrumTokenManager, providerManager, rentalManager, owner, provider, tenant;

  beforeEach(async function () {
    [owner, provider, tenant] = await ethers.getSigners();

    // Deploy SpectrumToken
    const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    spectrumToken = await SpectrumToken.deploy(owner.address);

    // Deploy SpectrumTokenManager
    const SpectrumTokenManager = await ethers.getContractFactory("SpectrumTokenManager");
    spectrumTokenManager = await SpectrumTokenManager.deploy(spectrumToken.target);

    // Deploy SpectrumProviderManager
    const SpectrumProviderManager = await ethers.getContractFactory("SpectrumProviderManager");
    providerManager = await SpectrumProviderManager.deploy(spectrumTokenManager.target);

    // Deploy SpectrumRentalManager
    const SpectrumRentalManager = await ethers.getContractFactory("SpectrumRentalManager");
    rentalManager = await SpectrumRentalManager.deploy(providerManager.target, spectrumTokenManager.target);

    // Deploy SpectrumMarketplace
    const SpectrumMarketplace = await ethers.getContractFactory("SpectrumMarketplace");
    marketplace = await SpectrumMarketplace.deploy(
      spectrumToken.target,
      spectrumTokenManager.target,
      providerManager.target,
      rentalManager.target
    );

    // Set provider manager in token manager
    await spectrumTokenManager.connect(owner).setProviderManager(providerManager.target);

    // Mint tokens to the provider and approve the SpectrumTokenManager
    await spectrumToken.connect(owner).mint(provider.address, 1, 100);
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
  });

  it("Should allow a provider to list spectrum", async function () {
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
    const providerBalance = await providerManager.providerTokenBalances(provider.address, 1);
    expect(providerBalance).to.equal(50);
  });

  it("Should fail to list spectrum with zero amount", async function () {
    await expect(
      marketplace.connect(provider).listSpectrum(1, 0, ethers.parseEther("0.01"))
    ).to.be.revertedWith("Amount must be greater than zero");
  });

  it("Should fail to list spectrum with zero rental rate", async function () {
    await expect(
      marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0"))
    ).to.be.revertedWith("Rate per hour must be greater than zero");
  });

  it("Should fail to rent spectrum that has not been listed", async function () {
    const rentalBalance = ethers.parseEther("1.0");

    await expect(
      marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance })
    ).to.be.revertedWith("No provider found with sufficient spectrum for this request");
  });

  it("Should allow a tenant to rent spectrum", async function () {
    // List spectrum on marketplace
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));

    // Initial rental balance
    const rentalBalance = ethers.parseEther("1.0");

    // Request to rent spectrum
    await marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance });

    // Check if the rental was created and is active
    const rental = await rentalManager.activeRentals(tenant.address);
    expect(rental.isActive).to.equal(true);
    expect(rental.timeAllocated).to.be.above(0);
  });

  it("Should allow a tenant to return spectrum", async function () {
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
    const rentalBalance = ethers.parseEther("1.0");
    await marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance });
    await spectrumToken.connect(tenant).setApprovalForAll(spectrumTokenManager.target, true);

    await marketplace.connect(tenant).returnSpectrum([1], [10]);

    const rental = await rentalManager.activeRentals(tenant.address);
    expect(rental.isActive).to.equal(false);

    const returnedAmount = await rentalManager.getSpectrumAmount(tenant.address, 1);
    expect(returnedAmount).to.equal(0);
  });

  it("Should allow partial return of spectrum", async function () {
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
    const rentalBalance = ethers.parseEther("1.0");

    await marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance });
    await spectrumToken.connect(tenant).setApprovalForAll(spectrumTokenManager.target, true);

    await marketplace.connect(tenant).returnSpectrum([1], [5]);

    const remainingAmount = await rentalManager.getSpectrumAmount(tenant.address, 1);
    expect(remainingAmount).to.equal(5);

    const rental = await rentalManager.activeRentals(tenant.address);
    expect(rental.isActive).to.equal(true);
  });

  it("Should fail to expand rental with excessive amount", async function () {
    await marketplace.connect(provider).listSpectrum(1, 10, ethers.parseEther("0.01"));
    const rentalBalance = ethers.parseEther("1.0");

    await marketplace.connect(tenant).rentSpectrum([1], [5], rentalBalance, { value: rentalBalance });

    await expect(
      marketplace.connect(tenant).expandRental([1], [10])
    ).to.be.revertedWith("No provider found with sufficient spectrum for this request");
  });

  it("Should emit SpectrumListed event when a provider lists spectrum", async function () {
    await expect(marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01")))
      .to.emit(marketplace, "SpectrumListed")
      .withArgs(provider.address, 1, 50, ethers.parseEther("0.01"));
  });

  it("Should emit SpectrumRented event when a tenant rents spectrum", async function () {
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
    const rentalBalance = ethers.parseEther("1.0");

    await expect(marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance }))
      .to.emit(marketplace, "SpectrumRented")
      .withArgs(tenant.address, [1], [10], rentalBalance);
  });

  it("Should emit SpectrumReturned event when a tenant returns spectrum", async function () {
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
    const rentalBalance = ethers.parseEther("1.0");

    await marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance });
    await spectrumToken.connect(tenant).setApprovalForAll(spectrumTokenManager.target, true);

    await expect(marketplace.connect(tenant).returnSpectrum([1], [10]))
      .to.emit(marketplace, "SpectrumReturned")
      .withArgs(tenant.address, [1], [10]);
  });

  it("Should emit RentalExpanded event when a tenant expands their rental", async function () {
    await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
    const rentalBalance = ethers.parseEther("1.0");

    await marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance });

    await expect(marketplace.connect(tenant).expandRental([1], [5]))
      .to.emit(marketplace, "RentalExpanded")
      .withArgs(tenant.address, [1], [5]);
  });
});
