// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumToken.sol";
import "./SpectrumTokenManager.sol";
import "./SpectrumProviderManager.sol";
import "./SpectrumRentalManager.sol";

contract SpectrumMarketplace is Ownable(msg.sender) {
    SpectrumToken public spectrumToken;
    SpectrumTokenManager public tokenManager;
    SpectrumProviderManager public providerManager;
    SpectrumRentalManager public rentalManager;

    event SpectrumListed(address indexed provider, uint256 indexed spectrumId, uint256 amount, uint256 ratePerHour);
    event SpectrumRented(address indexed tenant, uint256[] spectrumIds, uint256[] amounts, uint256 rentalDuration);
    event SpectrumReturned(address indexed tenant, uint256[] spectrumIds, uint256[] amounts);
    event RentalExpanded(address indexed tenant, uint256[] spectrumIds, uint256[] amounts);

    constructor(
        address _spectrumToken,
        address _tokenManager,
        address _providerManager,
        address _rentalManager
    ) {
        spectrumToken = SpectrumToken(_spectrumToken);
        tokenManager = SpectrumTokenManager(_tokenManager);
        providerManager = SpectrumProviderManager(_providerManager);
        rentalManager = SpectrumRentalManager(_rentalManager);
    }

    /**
     * @dev Provedores listam espectro com uma quantidade específica e taxa.
     */
    function listSpectrum(uint256 spectrumId, uint256 amount, uint256 ratePerHour) external {
        require(amount > 0, "Amount must be greater than zero");
        require(ratePerHour > 0, "Rate per hour must be greater than zero");

        // O provedor aprova o tokenManager para gerenciar seus tokens
        spectrumToken.setApprovalForAll(address(tokenManager), true);

        // O provedor fornece os tokens ao providerManager
        providerManager.provideTokens(msg.sender, spectrumId, amount, ratePerHour);

        emit SpectrumListed(msg.sender, spectrumId, amount, ratePerHour);
    }

    /**
     * @dev Solicitação de aluguel de espectro.
     */
    function rentSpectrum(
        uint256[] calldata spectrumIds,
        uint256[] calldata amounts,
        uint256 balance
    ) external payable {
        require(msg.value == balance, "Incorrect balance sent");

        // Aluguel é gerenciado pelo rentalManager
        rentalManager.requestSpectrum(msg.sender, spectrumIds, amounts, balance);

        emit SpectrumRented(msg.sender, spectrumIds, amounts, balance);
    }

    /**
     * @dev Função para devolução do espectro.
     */
    function returnSpectrum(uint256[] calldata spectrumIds, uint256[] calldata amounts) external {
        rentalManager.returnSpectrum(msg.sender, spectrumIds, amounts);

        emit SpectrumReturned(msg.sender, spectrumIds, amounts);
    }

    /**
     * @dev Expansão do aluguel atual com mais espectro.
     */
    function expandRental(uint256[] calldata spectrumIds, uint256[] calldata amounts) external {
        rentalManager.expandRental(msg.sender, spectrumIds, amounts);

        emit RentalExpanded(msg.sender, spectrumIds, amounts);
    }
}
