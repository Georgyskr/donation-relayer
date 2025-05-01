# Donation Relayer

This is an non-audited contract that allows forwarding donations to donation receivers.
The purpose of that contract is to fill the donation transaction with an event to
ease indexation up & also to allow donation relayers to earn fee for their services.

## Setting up the repo

```
pnpm i
```

## Deploying smart contracts

Smart contract is going to be deployed according to the script located at /deploy/000_deploy_DonationRelayer
Fill in the .env file according to your needs & wants. At least PK_DEPLOYER env is require to start the deployment

### Deploying at Sepolia testnet

Hardhat config already contains sepolia testnet config. To run the deploy utilize --network param at hardhat-deploy

```
npx hardhat deploy --network sepolia
```

### Deploying on other networks

Update "networks" object at hardhat.config.ts in a similar manner:

```
	networks: {
		sepolia: {
			accounts: accounts,
			url: "https://ethereum-sepolia-rpc.publicnode.com",
		},
	},
```

## Running tests

```
npx hardhat test
```
