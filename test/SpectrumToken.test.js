const { expect } = require("chai");
const cons = require("consolidate");
const { ethers } = require("hardhat");

describe("SpectrumToken", function () {
  let SpectrumToken;
  let spectrumToken;
  let owner;
  let addr1;
  let marketplace;

  beforeEach(async function () {
    // Obtenha a factory do contrato SpectrumToken
    SpectrumToken = await ethers.getContractFactory("SpectrumToken");

    // Obtenha as contas de teste (owner é o deployer, addr1 é o usuário, marketplace será o endereço do marketplace)
    [owner, addr1, marketplace] = await ethers.getSigners();

    // Implante o contrato com o endereço do proprietário
    spectrumToken = await SpectrumToken.deploy(owner.address);

    // Verifique se o contrato foi implantado corretamente
    expect(spectrumToken.target).to.properAddress;  // Verifique se o endereço é válido
  });

  it("Should allow the token owner to transfer tokens into custody", async function () {
    // Cunhar 3 tokens de 700 MHz para addr1
    await spectrumToken.mint(addr1.address, 700, 3);  // 3 tokens de 10 MHz na faixa de 700 MHz
    expect(await spectrumToken.balanceOf(addr1.address, 700)).to.equal(3);

    // Transferir 2 tokens de addr1 para o marketplace
    await spectrumToken.connect(addr1).transferToCustody(marketplace.address, 700, 2);

    // Verificar o saldo do marketplace
    expect(await spectrumToken.balanceOf(marketplace.address, 700)).to.equal(2);
    
    // Verificar o saldo restante de addr1
    expect(await spectrumToken.balanceOf(addr1.address, 700)).to.equal(1);
  });

  it("Should prevent others from transferring tokens they don't own", async function () {
    // Cunhar 3 tokens de 700 MHz para addr1
    await spectrumToken.mint(addr1.address, 700, 3);  // 3 tokens de 10 MHz na faixa de 700 MHz

    // Tentar transferir 1 token de addr1 para o marketplace usando o owner (isso não deve ser permitido)
    await expect(
      spectrumToken.connect(owner).transferToCustody(marketplace.address, 700, 1)
    ).to.be.revertedWith("Insufficient token balance");

    // Verificar que nenhum token foi transferido para o marketplace
    expect(await spectrumToken.balanceOf(marketplace.address, 700)).to.equal(0);
  });
});
