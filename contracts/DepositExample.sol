// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DepositExample {
    IERC20 public stakingToken;

    constructor(IERC20 _stakingToken) payable {
        stakingToken = _stakingToken;
    }

    function deposit(uint256 _amount) external {
        stakingToken.transferFrom(msg.sender, address(this), _amount);
    }

    function withdraw(uint256 _amount) public {
        stakingToken.transfer(msg.sender, _amount);
    }
}
