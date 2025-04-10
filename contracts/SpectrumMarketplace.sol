// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumToken.sol";
import "./SpectrumTokenManager.sol";
import "./SpectrumProviderManager.sol";
import "./SpectrumRentalManager.sol";

contract SpectrumMarketplace is IERC1155Receiver, ERC165, Ownable(msg.sender) {
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

        // Verifica se o provedor aprovou o marketplace para transferir tokens em seu nome.
        require(
            spectrumToken.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        // 1. Transfere os tokens do provedor para este contrato.
        spectrumToken.safeTransferFrom(msg.sender, address(this), spectrumId, amount, "");

        // 2. Aprova o contrato tokenManager para movimentar
        if (!spectrumToken.isApprovedForAll(address(this), address(tokenManager))) {
            spectrumToken.setApprovalForAll(address(tokenManager), true);
        }

        require(
            spectrumToken.isApprovedForAll(address(this), address(tokenManager)),
            "TokenManager not approved"
        );

        // O provedor fornece os tokens ao providerManager
        tokenManager.receiveTokensFromProvider(msg.sender, spectrumId, amount);

        // O provedor é armazenado no providerManager
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


        // Função para receber transferências de tokens ERC1155
    function onERC1155Received(
        address /* operator */,
        address /* from */,
        uint256 /* id */,
        uint256 /* value */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    // Função para receber transferências em lote de tokens ERC1155
    function onERC1155BatchReceived(
        address /* operator */,
        address /* from */,
        uint256[] calldata /* ids */,
        uint256[] calldata /* values */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    // Função que verifica suporte à interface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }
}
