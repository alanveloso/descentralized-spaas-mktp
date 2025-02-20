import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
//  const provider = new ethers.JsonRpcProvider()
  const [owner, ...others] = signers;

//  console.log("Provider:", provider.getSigner());

  const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
  const spectrumToken = await SpectrumToken.deploy(owner.address);
  console.log("SpectrumToken deployed at:", await spectrumToken.getAddress());

  const SpectrumTokenManager = await ethers.getContractFactory("SpectrumTokenManager");
  const spectrumTokenManager = await SpectrumTokenManager.deploy(spectrumToken.target);
  console.log("SpectrumTokenManager deployed at:", await spectrumTokenManager.getAddress());

  const SpectrumProviderManager = await ethers.getContractFactory("SpectrumProviderManager");
  const providerManager = await SpectrumProviderManager.deploy(spectrumTokenManager.target);
  console.log("SpectrumProviderManager deployed at:", await providerManager.getAddress());

  const SpectrumRentalManager = await ethers.getContractFactory("SpectrumRentalManager");
  const rentalManager = await SpectrumRentalManager.deploy(providerManager.target, spectrumTokenManager.target);
  console.log("SpectrumRentalManager deployed at:", await rentalManager.getAddress());

  const SpectrumMarketplace = await ethers.getContractFactory("SpectrumMarketplace");
  const marketplace = await SpectrumMarketplace.deploy(
    spectrumToken.target,
    spectrumTokenManager.target,
    providerManager.target,
    rentalManager.target
  );
  console.log("SpectrumMarketplace deployed at:", await marketplace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
