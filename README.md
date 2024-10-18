# **Decentralized Spectrum as a Service Marketplace **

The **Spectrum Marketplace** is a decentralized platform designed for **Spectrum as a Service (SpaaS)**. It leverages Ethereum-based smart contracts to allow spectrum providers to lease their frequencies and tenants to rent them, ensuring transparent and efficient management of frequency spectrum.

## **Project Overview**

This project implements a marketplace for providing and renting spectrum as a service. Spectrum providers can offer their frequency bands for rent, and tenants can lease them for specific periods using Ethereum-based tokens. The system is decentralized, ensuring transparency and eliminating the need for intermediaries.

### **Key System Components**

1. **SpectrumToken**: An ERC1155 token representing different frequency bands available for rent.
2. **SpectrumTokenManager**: Handles the custody and transfer of spectrum tokens between providers, tenants, and the marketplace.

## **Installation**

### **Prerequisites**

- [Node.js](https://nodejs.org/en/)
- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.io/v5/)
- [Solidity](https://docs.soliditylang.org/)

### **Installation and Running the Project**

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/spectrum-marketplace.git
   cd spectrum-marketplace
   ```

2. **Install dependencies**

   Install the necessary packages using:

   ```bash
   npm install
   ```

3. **Compile the contracts**

   Compile the Solidity contracts using Hardhat:

   ```bash
   npx hardhat compile
   ```

4. **Run the tests**

   To verify the functionality of the contracts, run the automated tests:

   ```bash
   npx hardhat test
   ```

## **Contract Descriptions**

### **1. SpectrumToken**

The `SpectrumToken` contract is an ERC1155 token representing frequency spectrum bands available for rent. Each token corresponds to a specific frequency band, such as 700 MHz, 800 MHz, etc. Providers can mint these tokens to represent available spectrum and transfer them to the marketplace for custody during a rental.

#### Key Functions:

- `mint`: Allows the owner to mint new spectrum tokens.
- `burn`: Allows the owner to burn spectrum tokens from a specific address.
- `transferToCustody`: Transfers tokens from a provider to the custody of the marketplace.

### **2. SpectrumTokenManager**

The `SpectrumTokenManager` handles the custody and management of spectrum tokens. It manages the transfer of tokens from providers to the marketplace and from the marketplace to tenants during the rental period.

#### Key Functions:

- `transferFromProvider`: Transfers spectrum tokens from a provider to the marketplace's custody.
- `returnToProvider`: Returns tokens from the marketplace to the provider after a rental period.
- `transferToTenant`: Transfers spectrum tokens from the marketplace to a tenant for rental.
- `returnFromTenant`: Returns tokens from the tenant to the marketplace after the rental ends.

## **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.