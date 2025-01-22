    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    import "./SpectrumToken.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";
    import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
    import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

    contract SellerContract is IERC1155Receiver, Ownable(msg.sender), ERC165 {
        SpectrumToken public spectrumToken;
        ERC1155 public tokenContract;

        struct TokenSale {
            uint256 pricePerToken; // Preço por unidade do token (em wei)
            uint256 availableTokens; // Quantidade de tokens disponíveis para venda
        }

        mapping(uint256 => TokenSale) public tokenSales; // spectrumId => detalhes da venda

        event TokensAnnounced(uint256 indexed spectrumId, uint256 pricePerToken, uint256 availableTokens);
        event TokensPurchased(address indexed buyer, uint256 indexed spectrumId, uint256 amount, uint256 totalPrice);
        event SaleCancelled(uint256 indexed spectrumId, uint256 remainingTokens);

        constructor(address _spectrumToken) {
            spectrumToken = SpectrumToken(_spectrumToken);
        }

        /**
         * @dev Lista tokens para venda.
         * @param spectrumId ID do token que será listado.
         * @param pricePerToken Preço por unidade do token.
         * @param amount Quantidade de tokens a serem listados.
         */
        function configureSale(uint256 spectrumId, uint256 pricePerToken, uint256 amount) external onlyOwner {
            require(pricePerToken > 0, "Price per token must be greater than zero");
            require(amount > 0, "Amount must be greater than zero");

            // Transferir os tokens para o contrato
            spectrumToken.safeTransferFrom(msg.sender, address(this), spectrumId, amount, "");

            // Atualizar os detalhes da venda
            TokenSale storage sale = tokenSales[spectrumId];
            sale.pricePerToken = pricePerToken;
            sale.availableTokens += amount;

            emit TokensAnnounced(spectrumId, pricePerToken, sale.availableTokens);
        }

        /**
         * @dev Permite que um comprador compre uma quantidade específica de tokens.
         * @param spectrumId ID do token que será comprado.
         * @param amount Quantidade de tokens a serem comprados.
         */
        function buyTokens(uint256 spectrumId, uint256 amount) external payable {
            require(amount > 0, "Amount must be greater than zero");

            TokenSale storage sale = tokenSales[spectrumId];
            require(amount <= sale.availableTokens, "Not enough tokens available for sale");

            uint256 totalPrice = amount * sale.pricePerToken;
            require(msg.value >= totalPrice, "Insufficient payment");

            // Atualizar os tokens disponíveis
            sale.availableTokens -= amount;

            // Transferir os tokens para o comprador
            spectrumToken.safeTransferFrom(address(this), msg.sender, spectrumId, amount, "");

            // Reembolsar o valor excedente, se houver
            if (msg.value > totalPrice) {
                payable(msg.sender).transfer(msg.value - totalPrice);
            }

            emit TokensPurchased(msg.sender, spectrumId, amount, totalPrice);
        }

        /**
         * @dev Cancela a venda de um token específico e retorna os tokens restantes ao proprietário.
         * @param spectrumId ID do token cuja venda será cancelada.
         */
        function cancelSale(uint256 spectrumId) external onlyOwner {
            TokenSale storage sale = tokenSales[spectrumId];
            uint256 remainingTokens = sale.availableTokens;

            if (remainingTokens > 0) {
                spectrumToken.safeTransferFrom(address(this), msg.sender, spectrumId, remainingTokens, "");
            }

            delete tokenSales[spectrumId];

            emit SaleCancelled(spectrumId, remainingTokens);
        }

        /**
         * @dev Retira os fundos acumulados no contrato.
         */
        function withdrawFunds() external onlyOwner {
            uint256 balance = address(this).balance;
            require(balance > 0, "No funds to withdraw");

            payable(msg.sender).transfer(balance);
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