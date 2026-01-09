// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _setupDecimals(decimals_);
    }

    // note: to keep it simple we implement a mint method
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // hack: allow setting decimals via storage (OpenZeppelin <=4.9 has decimals virtual)
    uint8 private _decimals = 18;
    function _setupDecimals(uint8 d) internal {
        _decimals = d;
    }
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
