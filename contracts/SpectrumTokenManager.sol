// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SpectrumToken.sol"; // Importando o contrato correto do SpectrumToken
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract SpectrumTokenManager is IERC1155Receiver, Ownable(msg.sender), ERC165 {
    SpectrumToken public spectrumToken; // Referência para o contrato SpectrumToken

    // Evento disparado quando os tokens são transferidos para a custódia
    event TokensTransferredToCustody(address indexed provider, uint256 indexed spectrumId, uint256 amount);

    // Evento disparado quando os tokens são devolvidos ao provedor
    event TokensReturnedToProvider(address indexed provider, uint256 indexed spectrumId, uint256 amount);

    // Evento disparado quando os tokens são transferidos para o inquilino durante o aluguel
    event TokensTransferredToTenant(address indexed tenant, uint256[] spectrumIds, uint256[] amounts);

    // Evento disparado quando os tokens são devolvidos pelo inquilino após o aluguel
    event TokensReturnedFromTenant(address indexed tenant, uint256[] spectrumIds, uint256[] amounts);

    // Construtor: Inicializa com o contrato SpectrumToken
    constructor(address tokenAddress) {
        spectrumToken = SpectrumToken(tokenAddress); // Alinhando com o contrato correto
    }

    // Function to confirm receipt of tokens from the provider
    function receiveTokensFromProvider(address provider, uint256 spectrumId, uint256 amount) external onlyOwner {
        require(provider != address(0), "Invalid provider address");
        require(amount > 0, "Amount must be greater than zero");

        // O provedor chama a função transferToCustody no SpectrumToken para iniciar a transferência
        spectrumToken.safeTransferFrom(provider, address(this), spectrumId, amount, ""); // A transferência ocorre aqui
        emit TokensTransferredToCustody(provider, spectrumId, amount);
    }

    // Função para devolver tokens da custódia para o provedor
    function returnToProvider(address provider, uint256 spectrumId, uint256 amount) external onlyOwner {
        require(provider != address(0), "Invalid provider address");
        require(amount > 0, "Amount must be greater than zero");

        spectrumToken.safeTransferFrom(address(this), provider, spectrumId, amount, "");
        emit TokensReturnedToProvider(provider, spectrumId, amount);
    }

    // Função para transferir tokens da custódia para o inquilino durante o aluguel
    function transferToTenant(address tenant, uint256[] calldata spectrumIds, uint256[] calldata amounts) external onlyOwner {
        require(tenant != address(0), "Invalid tenant address");
        require(spectrumIds.length == amounts.length, "Mismatch between spectrumIds and amounts");

        spectrumToken.safeBatchTransferFrom(address(this), tenant, spectrumIds, amounts, "");
        emit TokensTransferredToTenant(tenant, spectrumIds, amounts);
    }

    // Função para devolver tokens do inquilino para a custódia após o aluguel
    function returnFromTenant(address tenant, uint256[] calldata spectrumIds, uint256[] calldata amounts) external onlyOwner {
        require(tenant != address(0), "Invalid tenant address");
        require(spectrumIds.length == amounts.length, "Mismatch between spectrumIds and amounts");

        spectrumToken.safeBatchTransferFrom(tenant, address(this), spectrumIds, amounts, "");
        emit TokensReturnedFromTenant(tenant, spectrumIds, amounts);
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
