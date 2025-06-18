const { ethers } = require("hardhat");

async function main() {
  const [owner, provider, tenant] = await ethers.getSigners();

  // Deploy dos contratos
  const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
  const spectrumToken = await SpectrumToken.deploy(owner.address);
  await spectrumToken.waitForDeployment();

  const SpectrumTokenManager = await ethers.getContractFactory("SpectrumTokenManager");
  const spectrumTokenManager = await SpectrumTokenManager.deploy(spectrumToken.target);
  await spectrumTokenManager.waitForDeployment();

  const SpectrumProviderManager = await ethers.getContractFactory("SpectrumProviderManager");
  const providerManager = await SpectrumProviderManager.deploy(spectrumTokenManager.target);
  await providerManager.waitForDeployment();

  await spectrumTokenManager.setProviderManager(providerManager.target);

  const SpectrumRentalManager = await ethers.getContractFactory("SpectrumRentalManager");
  const rentalManager = await SpectrumRentalManager.deploy(providerManager.target, spectrumTokenManager.target);
  await rentalManager.waitForDeployment();

  const SpectrumMarketplace = await ethers.getContractFactory("SpectrumMarketplace");
  const marketplace = await SpectrumMarketplace.deploy(
    spectrumToken.target,
    spectrumTokenManager.target,
    providerManager.target,
    rentalManager.target
  );
  await marketplace.waitForDeployment();

  // Mintar tokens para o provider e aprovar marketplace e tokenManager
  await spectrumToken.connect(owner).mint(provider.address, 1, 100);
  await spectrumToken.connect(provider).setApprovalForAll(marketplace.target, true);
  await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);

  // Provider lista espectro
  await marketplace.connect(provider).listSpectrum(1, 50, ethers.parseEther("0.01"));
  console.log("Provider listou 50 tokens de espectro 1");

  // Tenant aluga espectro
  const rentalBalance = ethers.parseEther("1.0");
  await marketplace.connect(tenant).rentSpectrum([1], [10], rentalBalance, { value: rentalBalance });
  console.log("Tenant alugou 10 tokens de espectro 1");

  // Tenant aprova marketplace e tokenManager para devolução
  await spectrumToken.connect(tenant).setApprovalForAll(marketplace.target, true);
  await spectrumToken.connect(tenant).setApprovalForAll(spectrumTokenManager.target, true);

  // Tenant devolve espectro
  await marketplace.connect(tenant).returnSpectrum([1], [10]);
  console.log("Tenant devolveu 10 tokens de espectro 1");

  // Mostrar saldos finais
  const saldoProvider = await spectrumToken.balanceOf(provider.address, 1);
  const saldoTenant = await spectrumToken.balanceOf(tenant.address, 1);
  const saldoMarketplace = await spectrumToken.balanceOf(marketplace.target, 1);
  const saldoTokenManager = await spectrumToken.balanceOf(spectrumTokenManager.target, 1);

  console.log("Saldo do provider:", saldoProvider.toString());
  console.log("Saldo do tenant:", saldoTenant.toString());
  console.log("Saldo do marketplace:", saldoMarketplace.toString());
  console.log("Saldo do tokenManager:", saldoTokenManager.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 