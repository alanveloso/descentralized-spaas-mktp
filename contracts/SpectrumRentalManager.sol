// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumProviderManager.sol";
import "./SpectrumTokenManager.sol";

contract SpectrumRentalManager is Ownable(msg.sender) {
    SpectrumProviderManager public providerManager;
    SpectrumTokenManager public tokenManager;

    struct SpectrumRental {
        address tenant;
        mapping(uint256 => uint256) spectrumAmounts; // spectrumId => quantidade alugada
        uint256[] rentedSpectrumIds;
        uint256 timeAllocated;
        uint256 startTime;
        uint256 endTime;
        uint256 ratePerSecond;
        bool isActive;
        uint256 lastUpdated;
        mapping(uint256 => address[]) providersForSpectrum; // Cada spectrumId pode ter múltiplos provedores
    }

    mapping(address => SpectrumRental) public activeRentals;

    event SpectrumRented(
        address indexed tenant,
        uint256[] spectrumIds,
        uint256[] amounts,
        uint256 timeAllocated
    );
    event SpectrumReturned(
        address indexed tenant,
        uint256[] spectrumIds,
        uint256[] amounts,
        uint256 timeUsed,
        uint256 refund
    );

    constructor(address providerManagerAddress, address tokenManagerAddress) {
        providerManager = SpectrumProviderManager(providerManagerAddress);
        tokenManager = SpectrumTokenManager(tokenManagerAddress);
    }

    function getRentedSpectrumIdByIndex(address tenant, uint256 index)
        external
        view
        returns (uint256)
    {
        require(
            index < activeRentals[tenant].rentedSpectrumIds.length,
            "Index out of bounds"
        );
        return activeRentals[tenant].rentedSpectrumIds[index];
    }

    function getSpectrumAmount(address tenant, uint256 spectrumId)
        external
        view
        returns (uint256)
    {
        return activeRentals[tenant].spectrumAmounts[spectrumId];
    }

    function requestSpectrum(
        address tenant,
        uint256[] calldata spectrumIds,
        uint256[] calldata amounts,
        uint256 balance
    ) external {
        require(
            spectrumIds.length == amounts.length,
            "Spectrum IDs and amounts must match"
        );
        require(spectrumIds.length > 0, "Must request at least one spectrum");

        SpectrumRental storage rental = activeRentals[tenant];
        require(!rental.isActive, "Already active rental");

        uint256 totalRatePerSecond = 0;

        for (uint256 i = 0; i < spectrumIds.length; i++) {
            uint256 spectrumId = spectrumIds[i];
            uint256 amountNeeded = amounts[i];
            uint256 amountAllocated = 0;

            // Adicione o spectrumId ao array rentedSpectrumIds, se ainda não estiver presente
            if (rental.spectrumAmounts[spectrumId] == 0) {
                rental.rentedSpectrumIds.push(spectrumId);
            }

            while (amountAllocated < amountNeeded) {
                address provider = providerManager.findBestProvider(
                    spectrumId,
                    amountNeeded - amountAllocated
                );
                uint256 providerRate = providerManager.providerRates(
                    provider,
                    spectrumId
                );
                uint256 allocatableAmount = providerManager
                    .providerTokenBalances(provider, spectrumId);

                uint256 allocation = allocatableAmount > (amountNeeded - amountAllocated) ? (amountNeeded - amountAllocated): allocatableAmount;

                providerManager.updateProviderBalance(
                    provider,
                    spectrumId,
                    allocation
                );
                rental.spectrumAmounts[spectrumId] += allocation;
                rental.providersForSpectrum[spectrumId].push(provider);

                totalRatePerSecond += (providerRate * allocation);
                amountAllocated += allocation;
            }
        }

        uint256 totalRentalTime = balance / totalRatePerSecond;
        rental.tenant = tenant;
        rental.timeAllocated = totalRentalTime;
        rental.startTime = block.timestamp;
        rental.endTime = block.timestamp + totalRentalTime;
        rental.ratePerSecond = totalRatePerSecond;
        rental.isActive = true;
        rental.lastUpdated = block.timestamp;

        // Transferir tokens ao locatário usando o TokenManager
        tokenManager.transferToTenant(tenant, spectrumIds, amounts);

        emit SpectrumRented(tenant, spectrumIds, amounts, totalRentalTime);
    }

    function returnSpectrum(
        address tenant,
        uint256[] calldata spectrumIds,
        uint256[] calldata amounts
    ) external {
        SpectrumRental storage rental = activeRentals[tenant];
        require(rental.isActive, "No active rental");

        uint256 timeUsed = block.timestamp - rental.startTime;
        uint256 ratePerSecondReduction = 0;

        for (uint256 i = 0; i < spectrumIds.length; i++) {
            uint256 spectrumId = spectrumIds[i];
            uint256 amountToReturn = amounts[i];
            require(
                rental.spectrumAmounts[spectrumId] >= amountToReturn,
                "Return amount exceeds rented"
            );

            // Obter provedores do spectrumId
            address[] memory providers = rental.providersForSpectrum[
                spectrumId
            ];

            uint256 remainingAmount = amountToReturn;

            // Caminhar na lista de provedores de trás para frente
            for (
                uint256 j = providers.length;
                j > 0 && remainingAmount > 0;
                j--
            ) {
                address provider = providers[j - 1]; // Ajuste para índices zero-based
                uint256 providerRate = providerManager.providerRates(
                    provider,
                    spectrumId
                );

                uint256 providerAmount = remainingAmount <
                    rental.spectrumAmounts[spectrumId]
                    ? remainingAmount
                    : rental.spectrumAmounts[spectrumId];

                ratePerSecondReduction += (providerRate * providerAmount);

                remainingAmount -= providerAmount;
            }

            rental.spectrumAmounts[spectrumId] -= amountToReturn;
        }

        rental.ratePerSecond -= ratePerSecondReduction;

        if (rental.ratePerSecond == 0) {
            rental.isActive = false;
        } else {
            _recalculateRentalTime(tenant);
        }

        // Transferência dos tokens de volta ao TokenManager
        tokenManager.returnFromTenant(tenant, spectrumIds, amounts);

        emit SpectrumReturned(tenant, spectrumIds, amounts, timeUsed, 0);
    }

    function expandRental(
        address tenant,
        uint256[] calldata spectrumIds,
        uint256[] calldata amounts
    ) external {
        SpectrumRental storage rental = activeRentals[tenant];
        require(rental.isActive, "No active rental");

        uint256 additionalRatePerSecond = 0;

        for (uint256 i = 0; i < spectrumIds.length; i++) {
            uint256 spectrumId = spectrumIds[i];
            uint256 additionalAmountNeeded = amounts[i];
            uint256 amountAllocated = 0;

            while (amountAllocated < additionalAmountNeeded) {
                // Encontrar o provedor mais barato disponível
                address provider = providerManager.findBestProvider(
                    spectrumId,
                    additionalAmountNeeded - amountAllocated
                );
                uint256 providerRate = providerManager.providerRates(
                    provider,
                    spectrumId
                );

                uint256 amountFromProvider = additionalAmountNeeded -
                    amountAllocated;
                uint256 costPerSecond = (providerRate * amountFromProvider) /
                    3600;

                // Atualizar alocação de espectro e custo do aluguel
                rental.spectrumAmounts[spectrumId] += amountFromProvider;
                rental.providersForSpectrum[spectrumId].push(provider);
                additionalRatePerSecond += costPerSecond;

                amountAllocated += amountFromProvider;
            }
        }

        // Atualizar a taxa de consumo total e recalcular o tempo de locação
        rental.ratePerSecond += additionalRatePerSecond;
        _recalculateRentalTime(tenant);

        emit SpectrumRented(tenant, spectrumIds, amounts, rental.timeAllocated);
    }

    function _recalculateRentalTime(address tenant) internal {
        SpectrumRental storage rental = activeRentals[tenant];
        require(rental.isActive, "No active rental");

        _updateRentalBalance(tenant);

        if (rental.ratePerSecond == 0) {
            rental.isActive = false;
            return;
        }

        uint256 remainingTime = address(this).balance / rental.ratePerSecond;
        rental.endTime = block.timestamp + remainingTime;
        rental.timeAllocated =
            (block.timestamp - rental.startTime) +
            remainingTime;
    }

    function _updateRentalBalance(address tenant) internal {
        SpectrumRental storage rental = activeRentals[tenant];
        require(rental.isActive, "No active rental");

        uint256 elapsedTime = block.timestamp - rental.lastUpdated;
        uint256 cost = elapsedTime * rental.ratePerSecond;

        require(address(tenant).balance >= cost, "Insufficient balance");

        if (cost > 0 && address(tenant).balance >= cost) {
            rental.lastUpdated = block.timestamp;
        } else {
            rental.isActive = false;
        }
    }
}
