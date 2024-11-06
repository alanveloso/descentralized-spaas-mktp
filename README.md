# Decentralized Spectrum as a Service Marketplace

The **Spectrum Marketplace** is a decentralized platform designed for **Spectrum as a Service (SpaaS)**. This Ethereum-based system enables spectrum providers to lease their frequency bands and tenants to rent them, ensuring transparent, efficient, and decentralized management of frequency spectrum.

## **Project Overview**

This project implements a decentralized marketplace for leasing spectrum. Spectrum providers can list their frequency bands for rent, and tenants can lease them for specific periods using Ethereum-based tokens. This approach removes intermediaries and provides transparency, verifiability, and security in the leasing process.

### **Key System Components**

1. **SpectrumToken**: An ERC1155 token representing different frequency bands available for rent.
2. **SpectrumTokenManager**: Manages the custody and transfer of spectrum tokens between providers, tenants, and the marketplace.
3. **SpectrumProviderManager**: Allows providers to list spectrum bands, set rates, and manage the availability of their spectrum.
4. **SpectrumRentalManager**: Handles rental requests, returns, and extensions, enabling tenants to rent, return, or expand their rented spectrum.
5. **SpectrumMarketplace**: The main marketplace contract that acts as an intermediary between providers and tenants, managing listings, rentals, returns, and extensions of spectrum leases.

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

- `receiveTokensFromProvider`: Transfers spectrum tokens from a provider to the marketplace's custody.
- `returnToProvider`: Returns tokens from the marketplace to the provider after a rental period.
- `transferToTenant`: Transfers spectrum tokens from the marketplace to a tenant for rental.
- `returnFromTenant`: Returns tokens from the tenant to the marketplace after the rental ends.

### **3. SpectrumProviderManager**

The `SpectrumProviderManager` contract enables spectrum providers to list their available spectrum, set rental rates, and specify the amount available for lease. It ensures providers have tokens in custody before listing them on the marketplace and maintains an ordered list of providers based on the rental rates.

#### Key Functions:

- `provideTokens`: Allows providers to list spectrum tokens with a specified amount and rental rate.
- `findBestProvider`: Finds the most cost-effective provider with sufficient availability for a specific spectrum rental request.
- `updateProviderBalance`: Updates the balance of tokens available for rent for each provider.

### **4. SpectrumRentalManager**

The `SpectrumRentalManager` handles the rental process, allowing tenants to request spectrum, return it, and expand their rentals if needed. It keeps track of active rentals, including the rented spectrum amount, rental duration, and tenant information.

#### Key Functions:

- `requestSpectrum`: Initiates a spectrum rental request, verifies availability, and transfers tokens to the tenant.
- `returnSpectrum`: Handles the return process, updating rental status and refunding the provider.
- `expandRental`: Allows a tenant to extend their rental period or increase the rented amount if additional tokens are available.

### **5. SpectrumMarketplace**

The `SpectrumMarketplace` contract is the primary interface for interacting with the system. It allows tenants to rent and return spectrum and enables providers to list their spectrum for rent. The marketplace manages the flow between the provider, tenant, and token managers.

#### Key Functions:

- `listSpectrum`: Allows providers to list spectrum with specified parameters.
- `rentSpectrum`: Enables tenants to rent spectrum listed by providers.
- `returnSpectrum`: Facilitates the return of rented spectrum.
- `expandRental`: Allows tenants to expand an ongoing rental by adding more tokens.

## **Testing Coverage**

The following tests have been implemented:

1. **Provider Spectrum Listing**:
   - Providers can list spectrum with specified rates.
   - Listing fails if the amount or rental rate is zero.
   
2. **Tenant Spectrum Renting**:
   - Tenants can successfully rent spectrum.
   - Renting fails if the required spectrum is unavailable.
   - The tenant’s balance is debited correctly after renting.
   
3. **Returning Spectrum**:
   - Tenants can return the full or partial rented spectrum.
   - Checks that rentals are marked inactive upon full return.
   - Ensures spectrum tokens are correctly returned to the marketplace.
   
4. **Expanding Rentals**:
   - Tenants can expand their rental if additional spectrum is available.
   - Expansion fails if the additional spectrum requested exceeds availability.

5. **Event Emissions**:
   - Ensures that events (`SpectrumListed`, `SpectrumRented`, `SpectrumReturned`, `RentalExpanded`) are emitted correctly for each action, providing transparency and traceability.

6. **Edge Cases and Exception Handling**:
   - Attempts to rent or list spectrum without required permissions.
   - Validations for mismatches in spectrum IDs and amounts during rentals.

## **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
