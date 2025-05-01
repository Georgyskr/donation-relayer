import { task, type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import exportDeployment from "./tasks/export";

import * as dotenv from "dotenv";
dotenv.config();

const accounts =
	process.env.PK_DEPLOYER !== undefined
		? [process.env.PK_DEPLOYER as string]
		: [];

const packageJson = require("./package.json");

task("deploy:export", "Export deployment data", async (_, hre) => {
	console.log("Exporting deployment data...");
	await exportDeployment(hre);
	console.log("Deployment data exported!");
});

task("deploy", "Export deployment data", async (_, hre, runSuper) => {
	await runSuper();
	console.log("Exporting deployment data...");
	await exportDeployment(hre);
	console.log("Deployment data exported!");
});

const config: HardhatUserConfig = {
	solidity: "0.8.27",
	gasReporter: {
		currency: "USD",
		L1: "ethereum",
		coinmarketcap: "b8a99b0e-9fce-4836-8465-8adb0408995f",
		L1Etherscan: "63X8WHS8EKM1XRFAHHIKUW41VPXXUG9P12",
	},
	networks: {
		sepolia: {
			accounts: accounts,
			url: "https://ethereum-sepolia-rpc.publicnode.com",
		},
	},
	paths: {
		deployments: `deployments/${packageJson.version}`,
	},
	namedAccounts: {
		deployer: 0,
	},
};

export default config;
