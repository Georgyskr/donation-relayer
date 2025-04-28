// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error ZeroBalance();
error ETHTransferFailed();
error ReimburseFailed();
error AssetNotAllowed();
error FeeNotCovered();

contract DonationRelayer {
    using SafeERC20 for IERC20;
    address immutable DONATION_RECEIVER;

    uint256 public immutable REIMBURSEMENT_AMOUNT;
    uint256 public immutable STABLE_REIMBURSEMENT_AMOUNT;

    mapping(address => bool) public allowedAssets;

    event DonationRelayed(address asset, uint256 amount);

    constructor(
        address _DONATION_RECEIVER,
        address[] memory _assets,
        uint256 _REIMBURSEMENT_AMOUNT
    ) payable {
        DONATION_RECEIVER = _DONATION_RECEIVER;
        REIMBURSEMENT_AMOUNT = _REIMBURSEMENT_AMOUNT;

        for (uint256 i; i < _assets.length; i++) {
            allowedAssets[_assets[i]] = true;
        }
    }

    /**
     * @notice Relay all of this contract’s balance of either ETH or an ERC20 to `DONATION_RECEIVER`
     *
     * @param _asset Asset address that is going to be relayed. Accepts both zeroAddress and an erc20
     *
     * Function will revert if caller tries to relay an asset which contract doesn't hold
     * Function only transfers assets to DONATION_RECEIVER which is an immutable address. It's important that DONATION_RECEIVER
     * is capable of receiving zeroAddress (must be an EOA or a contract with a fallback) - otherwise funds are going to stuck
     */

    function relayDonations(address _asset) external {
        uint256 relayAmount;

        // Native network currency transfer
        if (_asset == address(0)) {
            relayAmount = address(this).balance - REIMBURSEMENT_AMOUNT;
            if (relayAmount == 0) revert ZeroBalance();

            // 1) Forward entire balance except of the reimbursement
            _relayNativeToken(relayAmount);

            // 2) Reimburse caller at fixed stipend
            _transferNativeFee();
        } else {
            if (!allowedAssets[_asset]) revert AssetNotAllowed();
            relayAmount = IERC20(_asset).balanceOf(address(this));
            if (relayAmount < STABLE_REIMBURSEMENT_AMOUNT) {
                revert FeeNotCovered();
            }
            relayAmount -= STABLE_REIMBURSEMENT_AMOUNT;

            // 1) Forward entire balance except of the reimbursement
            _relayIERC20(relayAmount, _asset);

            // 2) Reimburse caller at fixed stipend
            _transferIERC20Fee(_asset);
        }

        emit DonationRelayed(_asset, relayAmount);
    }

    function nonReimbursedRelay(address _asset) external {
        uint256 relayAmount;

        // Native network currency transfer
        if (_asset == address(0)) {
            relayAmount = address(this).balance;

            _relayNativeToken(relayAmount);
        } else {
            relayAmount = IERC20(_asset).balanceOf(address(this));
            _relayIERC20(relayAmount, _asset);
        }
        emit DonationRelayed(_asset, relayAmount);
    }

    function _relayNativeToken(uint256 _relayAmount) internal {
        if (_relayAmount == 0) revert ZeroBalance();

        (bool ok, ) = DONATION_RECEIVER.call{value: _relayAmount}("");
        if (!ok) revert ReimburseFailed();
    }

    function _relayIERC20(uint256 _relayAmount, address _asset) internal {
        if (_relayAmount == 0) {
            revert ZeroBalance();
        }

        IERC20(_asset).safeTransfer(DONATION_RECEIVER, _relayAmount);
    }

    function _transferIERC20Fee(address _asset) internal {
        IERC20(_asset).safeTransfer(msg.sender, STABLE_REIMBURSEMENT_AMOUNT);
    }

    function _transferNativeFee() internal {
        (bool ok, ) = msg.sender.call{value: REIMBURSEMENT_AMOUNT}("");
        if (!ok) revert ReimburseFailed();
    }

    /// @notice receive plain ETH transfers (e.g. from address(this).balance top-ups)
    receive() external payable {}

    fallback() external payable {}
}
