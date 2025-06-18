const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SpectrumTokenManager", function () {
  let spectrumTokenManager;
  let spectrumToken;
  let owner, provider, tenant;
  const spectrumId = 1;  // Vamos usar esse ID como o Spectrum 700MHz, por exemplo
  const amount = 100;

  beforeEach(async function () {
    // Configuração das contas de teste
    [owner, provider, tenant] = await ethers.getSigners();

    // Implantar o contrato do SpectrumToken
    const SpectrumToken = await ethers.getContractFactory("SpectrumToken");
    spectrumToken = await SpectrumToken.deploy(owner.address);  // Passar o endereço do owner

    // Implantar o contrato SpectrumTokenManager com o endereço do token
    const SpectrumTokenManager = await ethers.getContractFactory("SpectrumTokenManager");
    spectrumTokenManager = await SpectrumTokenManager.deploy(spectrumToken.target);

    // Provedor mintando tokens no SpectrumToken
    await spectrumToken.connect(owner).mint(provider.address, spectrumId, amount);
  });

  it("Deve transferir tokens do provedor para a custódia", async function () {
    // Provedor aprova o SpectrumTokenManager para transferir tokens
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
    
    // Executar a transferência
    await expect(spectrumTokenManager.connect(provider).receiveTokensFromProvider(provider.address, spectrumId, amount))
      .to.emit(spectrumTokenManager, "TokensTransferredToCustody")
      .withArgs(provider.address, spectrumId, amount);

    // Verificar saldo do provedor
    providerBalance = await spectrumToken.balanceOf(provider.address, spectrumId);
    expect(providerBalance).to.equal(0);

    // Verificar saldo de tokens
    const contractBalance = await spectrumToken.balanceOf(spectrumTokenManager.target, spectrumId);
    expect(contractBalance).to.equal(amount);

    providerBalance = await spectrumToken.balanceOf(provider.address, spectrumId);
    expect(providerBalance).to.equal(0);
  });

  it("Deve devolver tokens da custódia para o provedor", async function () {
    // Simular que os tokens já estão na custódia
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
    await spectrumTokenManager.connect(provider).receiveTokensFromProvider(provider.address, spectrumId, amount);

    // Executar a devolução para o provedor
    await expect(spectrumTokenManager.connect(owner).returnToProvider(provider.address, spectrumId, amount))
      .to.emit(spectrumTokenManager, "TokensReturnedToProvider")
      .withArgs(provider.address, spectrumId, amount);

    // Verificar saldo de tokens
    const contractBalance = await spectrumToken.balanceOf(spectrumTokenManager.target, spectrumId);
    expect(contractBalance).to.equal(0);

    const providerBalance = await spectrumToken.balanceOf(provider.address, spectrumId);
    expect(providerBalance).to.equal(amount);
  });

  it("Deve transferir tokens da custódia para o locatário (tenant)", async function () {
    // Simular que os tokens já estão na custódia
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
    await spectrumTokenManager.connect(provider).receiveTokensFromProvider(provider.address, spectrumId, amount);

    // Transferir para o locatário
    await expect(spectrumTokenManager.connect(owner).transferToTenant(tenant.address, [spectrumId], [amount]))
      .to.emit(spectrumTokenManager, "TokensTransferredToTenant")
      .withArgs(tenant.address, [spectrumId], [amount]);

    // Verificar saldo de tokens
    const tenantBalance = await spectrumToken.balanceOf(tenant.address, spectrumId);
    expect(tenantBalance).to.equal(amount);

    const contractBalance = await spectrumToken.balanceOf(spectrumTokenManager.target, spectrumId);
    expect(contractBalance).to.equal(0);
  });

  it("Deve retornar tokens do locatário para a custódia", async function () {
    // Simular que os tokens estão com o locatário
    await spectrumToken.connect(provider).setApprovalForAll(spectrumTokenManager.target, true);
    await spectrumTokenManager.connect(provider).receiveTokensFromProvider(provider.address, spectrumId, amount);
    await spectrumTokenManager.connect(owner).transferToTenant(tenant.address, [spectrumId], [amount]);

    // Locatário aprova o contrato para retornar os tokens
    await spectrumToken.connect(tenant).setApprovalForAll(spectrumTokenManager.target, true);

    // Retornar tokens para a custódia (apenas evento, sem transferência)
    await expect(spectrumTokenManager.connect(owner).returnFromTenant(tenant.address, [spectrumId], [amount]))
      .to.emit(spectrumTokenManager, "TokensReturnedFromTenant")
      .withArgs(tenant.address, [spectrumId], [amount]);

    // Não é mais necessário checar saldo, pois a transferência é feita pelo marketplace
  });

  it("Deve falhar se tentar transferir com endereço ou quantidade inválidos", async function () {
    // Testar transferência com provedor inválido
    await expect(
      spectrumTokenManager.connect(owner).receiveTokensFromProvider(ethers.ZeroAddress, spectrumId, amount)
    ).to.be.revertedWith("Invalid provider address");

    // Testar transferência com quantidade zero
    await expect(
      spectrumTokenManager.connect(owner).receiveTokensFromProvider(provider.address, spectrumId, 0)
    ).to.be.revertedWith("Amount must be greater than zero");
  });
});
