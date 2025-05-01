import { ethers } from "hardhat";
import type { DeployFunction } from "hardhat-deploy/types";

// Protocol's Token is deployed before the rest of the protocol

const deployFunction: DeployFunction = async ({
	deployments: { deploy },
	getNamedAccounts,
}) => {
	const { deployer } = await getNamedAccounts();

	/* 
  Constructor args:
    address _DONATION_RECEIVER            | ultimate receiver of ALL donations
    address[] memory _asset               | array of all stablecoins that are going to be charged with _STABLE_REIMBURSEMENT_AMOUNT
    uint256 _REIMBURSEMENT_AMOUNT         | Fixed amount of native token currency relayer caller is going to receive
    uint256 _STABLE_REIMBURSEMENT_AMOUNT  | Fixed amount of stable token from _asset array relayer caller is going to receive
  */

	const donationReceiver = process.env.OVERRIDE_DEPLOYER_ADDRESS || deployer;
	const assets = process.env.OVERRIDE_ASSETS_ARRAY
		? process.env.OVERRIDE_ASSETS_ARRAY.split(",")
		: [];
	const stableReimbursement =
		process.env.OVERRIDE_STABLECOIN_FEE || ethers.parseUnits("55", 5); // 55 cents by default
	const amountInEthUnits =
		process.env.OVERRIDE_NATIVE_FEE || ethers.parseUnits("200", 15); // 50 cents by default

	await deploy("DonationRelayer", {
		from: deployer,
		log: true,
		args: [donationReceiver, assets, amountInEthUnits, stableReimbursement],
	});
};

deployFunction.tags = ["main", "DonationRelayer"];

export default deployFunction;
