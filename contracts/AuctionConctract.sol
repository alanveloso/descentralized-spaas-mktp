// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SpectrumToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenAuction is IERC1155Receiver, Ownable(msg.sender), ERC165 {
    SpectrumToken public spectrumToken;

    uint256 public spectrumId;
    uint256 public amount;
    uint256 public minBid;
    uint256 public endTime;
    address public highestBidder;
    uint256 public highestBid;
    bool public finalized;

    mapping(address => uint256) public bids; // Rastreamento de lances dos compradores

    event AuctionCreated(uint256 spectrumId, uint256 amount, uint256 minBid, uint256 endTime);
    event BidPlaced(address indexed bidder, uint256 bidAmount);
    event AuctionFinalized(address winner, uint256 winningBid);
    event BidWithdrawn(address indexed bidder, uint256 amount);

    constructor(address _spectrumToken, uint256 _spectrumId, uint256 _amount, uint256 _minBid, uint256 _duration) {
        require(_amount > 0, "Amount must be greater than zero");
        require(_minBid > 0, "Minimum bid must be greater than zero");
        require(_duration > 0, "Duration must be greater than zero");

        spectrumToken = SpectrumToken(_spectrumToken);
        spectrumId = _spectrumId;
        amount = _amount;
        minBid = _minBid;
        endTime = block.timestamp + _duration;
        finalized = false;

        // Transferir tokens para o contrato
        spectrumToken.safeTransferFrom(msg.sender, address(this), spectrumId, amount, "");

        emit AuctionCreated(spectrumId, amount, minBid, endTime);
    }

    /**
     * @dev Faz um lance no leilão.
     */
    function placeBid() external payable {
        require(block.timestamp < endTime, "Auction has ended");
        require(msg.value > minBid, "Bid must be higher than minimum bid");
        require(msg.value > highestBid, "Bid must be higher than current highest bid");

        // Registrar o lance
        bids[msg.sender] += msg.value;

        // Atualizar o maior lance
        highestBidder = msg.sender;
        highestBid = msg.value;

        emit BidPlaced(msg.sender, msg.value);
    }

    /**
     * @dev Finaliza o leilão e transfere os tokens para o vencedor.
     */
    function finalizeAuction() external {
        require(block.timestamp >= endTime, "Auction has not ended yet");
        require(!finalized, "Auction already finalized");

        finalized = true;

        if (highestBidder != address(0)) {
            // Transferir tokens para o vencedor
            spectrumToken.safeTransferFrom(address(this), highestBidder, spectrumId, amount, "");

            // Transferir o valor do maior lance para o proprietário
            payable(owner()).transfer(highestBid);

            emit AuctionFinalized(highestBidder, highestBid);
        } else {
            // Sem lances: devolver tokens ao proprietário
            spectrumToken.safeTransferFrom(address(this), owner(), spectrumId, amount, "");
            emit AuctionFinalized(address(0), 0);
        }
    }

    /**
     * @dev Permite que compradores que não venceram retirem seus fundos.
     */
    function withdrawBid() external {
        require(finalized, "Auction not finalized yet");
        require(msg.sender != highestBidder, "Winner cannot withdraw bid");

        uint256 bidderAmount = bids[msg.sender];
        require(bidderAmount > 0, "No funds to withdraw");

        bids[msg.sender] = 0;
        payable(msg.sender).transfer(bidderAmount);

        emit BidWithdrawn(msg.sender, bidderAmount);
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
