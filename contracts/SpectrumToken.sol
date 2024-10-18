// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumConstants.sol";  // Importing the constants library for spectrum bands

contract SpectrumToken is ERC1155, Ownable {
    // Constructor that sets the metadata URL and defines the contract owner
    constructor(address owner) 
        ERC1155("https://api.example.com/metadata/{id}.json")  // Replace with your actual IPFS CID or URL
        Ownable(owner) {}

    // Function to mint tokens representing 10 MHz of a specific spectrum band
    function mint(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");  // The ID will be one of the constants from the library (e.g., SpectrumConstants.SPECTRUM_700MHZ)
    }

    // Function that allows the contract owner to burn (remove) tokens from a specific address
    function burn(address from, uint256 id, uint256 amount) external onlyOwner {
        _burn(from, id, amount);  // Burns the specified amount of tokens
    }

    // Function to check the balance of a user for a specific type of token (spectrum band)
    function balanceOfUser(address user, uint256 id) external view returns (uint256) {
        return balanceOf(user, id);  // Returns the balance of the specified token type
    }

    // Function that allows the owner of the tokens to transfer their tokens to the marketplace's custody
    function transferToCustody(address marketplace, uint256 id, uint256 amount) external {
        require(balanceOf(msg.sender, id) >= amount, "Insufficient token balance");
        safeTransferFrom(msg.sender, marketplace, id, amount, "");  // The token owner transfers tokens to the marketplace
    }
}
