// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumTokenManager.sol"; // Importando o contrato de custódia

contract SpectrumProviderManager is Ownable(msg.sender) {
    SpectrumTokenManager public tokenManager;

    // Mapeamento para acompanhar a taxa de aluguel (em wei por MHz por hora) para cada provedor e spectrumId
    mapping(address => mapping(uint256 => uint256)) public providerRates; // provider => spectrumId => ratePerHour

    // Mapeamento para acompanhar a quantidade disponível de cada spectrumId fornecida por cada provedor
    mapping(address => mapping(uint256 => uint256)) public providerTokenBalances; // provider => spectrumId => availableAmount

    // Lista de provedores ordenada por taxa para cada spectrumId
    mapping(uint256 => address[]) public spectrumProviders; // spectrumId => ordered list of providers
    mapping(uint256 => mapping(address => bool)) private isProviderListed;

    // Eventos
    event SpectrumProvided(address indexed provider, uint256 indexed spectrumId, uint256 amount, uint256 ratePerHour);

    constructor(address tokenManagerAddress) {
        tokenManager = SpectrumTokenManager(tokenManagerAddress);
    }


    // Função para retornar o comprimento do array de provedores para um spectrumId específico
    function getProviderCount(uint256 spectrumId) external view returns (uint256) {
        return spectrumProviders[spectrumId].length;
    }

    // Função para obter um provedor específico por índice para um spectrumId
    function getProviderByIndex(uint256 spectrumId, uint256 index) external view returns (address) {
        require(index < spectrumProviders[spectrumId].length, "Index out of bounds");
        return spectrumProviders[spectrumId][index];
    }

    /**
     * @dev Função para provedores adicionarem tokens ao marketplace e definir o preço por hora (ratePerHour)
     */
    function provideTokens(address provider, uint256 spectrumId, uint256 amount, uint256 ratePerHour) external {
        require(amount > 0, "Amount must be greater than zero");
        require(ratePerHour > 0, "Rate per hour must be greater than zero");

        // Atualizar o saldo e a taxa para esse provider
        providerTokenBalances[provider][spectrumId] += amount;
        providerRates[provider][spectrumId] = ratePerHour;

        // Adicionar o provedor à lista ordenada por taxa para esse spectrumId
        _addProvider(spectrumId, provider, ratePerHour);

        emit SpectrumProvided(provider, spectrumId, amount, ratePerHour);
    }

    /**
     * @dev Função para adicionar o provedor na lista de provedores ordenada por preço
     */
    function _addProvider(uint256 spectrumId, address provider, uint256 ratePerHour) internal {
        if (!isProviderListed[spectrumId][provider]) {
            address[] storage providers = spectrumProviders[spectrumId];
            uint256 i = 0;

            // Encontre a posição onde o provedor deve ser inserido com base no preço
            while (i < providers.length && providerRates[providers[i]][spectrumId] < ratePerHour) {
                i++;
            }

            // Inserir o provedor na lista de forma ordenada
            providers.push(provider);
            for (uint256 j = providers.length - 1; j > i; j--) {
                providers[j] = providers[j - 1];
            }
            providers[i] = provider;

            // Marcar que esse provedor já está listado para o spectrumId
            isProviderListed[spectrumId][provider] = true;
        }
    }

    /**
     * @dev Função para encontrar o provedor que oferece a melhor taxa (mais baixa) para o espectro e quantidade solicitada.
     */
    function findBestProvider(uint256 spectrumId, uint256 amountNeeded) external view returns (address) {
        // Loop pela lista ordenada de provedores para o spectrumId
        for (uint256 i = 0; i < spectrumProviders[spectrumId].length; i++) {
            address provider = spectrumProviders[spectrumId][i];
            uint256 availableAmount = providerTokenBalances[provider][spectrumId];

            // Verifique se o provedor tem espectro suficiente disponível
            if (availableAmount >= amountNeeded) {
                return provider;
            }
        }

        revert("No provider found with sufficient spectrum for this request");
    }

    /**
     * @dev Atualiza o saldo de um provedor específico após uma alocação de espectro.
     * @param spectrumId O ID do espectro solicitado.
     * @param provider O endereço do provedor que forneceu o espectro.
     * @param allocatedAmount A quantidade de espectro alocada desse provedor.
     */
    function updateProviderBalance(
        address provider,
        uint256 spectrumId,
        uint256 allocatedAmount
    ) external {
        require(provider != address(0), "Invalid provider address");
        require(providerTokenBalances[provider][spectrumId] >= allocatedAmount, "Insufficient balance for allocation");

        // Reduz o saldo disponível do provedor para o spectrumId específico
        providerTokenBalances[provider][spectrumId] -= allocatedAmount;
    }

}
