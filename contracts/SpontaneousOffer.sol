// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SpectrumToken.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";
    import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
    import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract SpontaneousOffer is IERC1155Receiver, Ownable(msg.sender), ERC165 {
    SpectrumToken public spectrumToken;

    address public buyer;
    address public seller;
    uint256 public spectrumId;
    uint256 public price;
    uint256 public amount;
    bool public isAccepted;

    modifier onlySeller {
        require(msg.sender == seller, "Only the seller can perform this action");
        _;
    }

    event OfferMade(address indexed buyer, uint256 indexed spectrumId, uint256 price, uint256 amount);
    event OfferAccepted(address indexed seller, address indexed buyer, uint256 indexed spectrumId, uint256 price, uint256 amount);
    event OfferRejected(address indexed seller, address indexed buyer, uint256 indexed spectrumId, uint256 price);
    event OfferCancelled(address indexed buyer, uint256 indexed spectrumId, uint256 price);

    constructor(
        address _spectrumToken,
        address _seller,
        uint256 _spectrumId,
        uint256 _price,
        uint256 _amount
    ) payable {
        require(_price > 0, "Price must be greater than zero");
        require(_amount > 0, "Amount must be greater than zero");
        require(_seller != address(0), "Invalid seller address");
        require(msg.value == _price, "Incorrect payment amount");

        spectrumToken = SpectrumToken(_spectrumToken);
        buyer = msg.sender;
        seller = _seller;
        spectrumId = _spectrumId;
        price = _price;
        amount = _amount;
        isAccepted = false;

        emit OfferMade(seller, spectrumId, price, amount);
    }

    /**
     * @dev Aceita a oferta e transfere os tokens para o comprador.
     */
    function acceptOffer() external onlySeller {
        require(!isAccepted, "Offer already accepted");
        require(spectrumToken.balanceOf(msg.sender, spectrumId) >= amount, "Insufficient token balance");

        isAccepted = true;

        // Transfere os tokens para o comprador
        spectrumToken.safeTransferFrom(msg.sender, buyer, spectrumId, amount, "");

        // Transfere o pagamento para o vendedor
        payable(msg.sender).transfer(price);

        emit OfferAccepted(msg.sender, buyer, spectrumId, price, amount);
    }

    /**
     * @dev Rejeita a oferta e devolve os fundos ao comprador.
     */
    function rejectOffer() external onlySeller {
        require(!isAccepted, "Offer already accepted");

        // Devolve os fundos ao comprador
        payable(buyer).transfer(price);

        emit OfferRejected(msg.sender, buyer, spectrumId, price);
    }

    /**
     * @dev Cancela a oferta e recupera os fundos para o comprador.
     */
    function cancelOffer() external onlyOwner {
        require(!isAccepted, "Offer already accepted");

        uint256 refundAmount = price;

        // Reseta os dados da oferta
        price = 0;
        buyer = address(0);

        // Devolve os fundos ao comprador
        payable(msg.sender).transfer(refundAmount);

        emit OfferCancelled(msg.sender, spectrumId, refundAmount);
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
