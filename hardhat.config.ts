import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: "0.8.27",
  gasReporter: {
    currency: "USD",
    L1: "ethereum",
    coinmarketcap: "b8a99b0e-9fce-4836-8465-8adb0408995f",
    L1Etherscan: "63X8WHS8EKM1XRFAHHIKUW41VPXXUG9P12",
  },
};

export default config;
