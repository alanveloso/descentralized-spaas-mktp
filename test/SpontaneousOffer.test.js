const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SpontaneousOffer", function () {
    let SpectrumToken, spectrumToken, SpontaneousOffer, offer;
    let owner, buyer, seller, other;
    const spectrumId = 1;
    const price = ethers.parseEther("1"); // 1 Ether
    const amount = 10;

    beforeEach(async function () {
        // Accounts
        [owner, buyer, seller, other] = await ethers.getSigners();

        // Deploy SpectrumToken
        SpectrumToken = await ethers.getContractFactory("SpectrumToken");
        spectrumToken = await SpectrumToken.deploy(owner.address);

        // Mint tokens to seller
        await spectrumToken.connect(owner).mint(seller.address, spectrumId, 100);

        // Deploy SpontaneousOffer
        SpontaneousOffer = await ethers.getContractFactory("SpontaneousOffer");
        offer = await SpontaneousOffer.connect(buyer).deploy(
            spectrumToken.target,
            seller.address,
            spectrumId,
            price,
            amount,
            { value: price }
        );
    });

    it("should create an offer with correct details", async function () {
        expect(await offer.buyer()).to.equal(buyer.address);
        expect(await offer.seller()).to.equal(seller.address);
        expect(await offer.spectrumId()).to.equal(spectrumId);
        expect(await offer.price()).to.equal(price);
        expect(await offer.amount()).to.equal(amount);
    });

    it("should allow seller to accept the offer", async function () {
        // Seller approves tokens for transfer
        await spectrumToken.connect(seller).setApprovalForAll(offer.target, true);
        // Accept the offer
        await expect(() => offer.connect(seller).acceptOffer()).to.changeEtherBalance(
            seller,
            price
        );

        // Check token transfer
        expect(await spectrumToken.balanceOf(buyer.address, spectrumId)).to.equal(amount);
        expect(await spectrumToken.balanceOf(seller.address, spectrumId)).to.equal(90); // 100 - 10
    });

    it("should allow seller to reject the offer", async function () {
        await expect(() => offer.connect(seller).rejectOffer()).to.changeEtherBalance(
            buyer,
            price
        );
    });

    it("should allow buyer to cancel the offer", async function () {
        await expect(() => offer.connect(buyer).cancelOffer()).to.changeEtherBalance(
            buyer,
            price
        );

        // Check that the buyer address is reset
        expect(await offer.buyer()).to.equal(ethers.ZeroAddress);
    });

    it("should not allow a non-seller to accept or reject the offer", async function () {
        await expect(offer.connect(buyer).acceptOffer()).to.be.revertedWith(
            "Only the seller can perform this action"
        );
        await expect(offer.connect(other).rejectOffer()).to.be.revertedWith(
            "Only the seller can perform this action"
        );
    });

    it("should not allow actions after the offer is accepted", async function () {
        // Seller approves tokens for transfer
        await spectrumToken.connect(seller).setApprovalForAll(offer.target, true);

        // Accept the offer
        await offer.connect(seller).acceptOffer();

        // Try to reject or cancel
        await expect(offer.connect(seller).rejectOffer()).to.be.revertedWith(
            "Offer already accepted"
        );
        await expect(offer.connect(buyer).cancelOffer()).to.be.revertedWith(
            "Offer already accepted"
        );
    });

    it("should revert if price is not sent during creation", async function () {
        await expect(
            SpontaneousOffer.connect(buyer).deploy(
                spectrumToken.target,
                seller.address,
                spectrumId,
                price,
                amount
            )
        ).to.be.revertedWith("Incorrect payment amount");
    });
});
