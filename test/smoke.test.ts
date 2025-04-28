import { expect } from "chai";
import { ethers } from "hardhat";
import type { DonationRelayer, TestERC20 } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Smoke", () => {
	let service: SignerWithAddress;
	let receiver: SignerWithAddress;
	let senderAlice: SignerWithAddress;
	let senderBob: SignerWithAddress;
	let donationRelayer: DonationRelayer;
	let erc20: TestERC20;
	let erc20Secondary: TestERC20;

	before(async () => {
		[service, receiver, senderAlice, senderBob] = await ethers.getSigners();
		const ERC20 = await ethers.getContractFactory("TestERC20");
		erc20 = await (await ERC20.deploy()).waitForDeployment();
		erc20Secondary = await (await ERC20.deploy()).waitForDeployment();

		erc20.connect(service).transfer(senderAlice, ethers.parseEther("1000"));
		erc20.connect(service).transfer(senderBob, ethers.parseEther("1000"));

		erc20Secondary
			.connect(service)
			.transfer(senderAlice, ethers.parseEther("1000"));
		erc20Secondary
			.connect(service)
			.transfer(senderBob, ethers.parseEther("1000"));

		const DonationRelayer = await ethers.getContractFactory("DonationRelayer");

		donationRelayer = await DonationRelayer.deploy(
			receiver.address,
			[erc20.target, erc20Secondary.target],
			ethers.parseEther("1"),
			ethers.parseUnits("5", 17),
		);
	});

	it("should allow senderAlice to donate erc20 and relayer to relay it", async () => {
		const depositAmount = ethers.parseEther("1");

		expect(await erc20.balanceOf(receiver.address)).to.be.equal(0);

		await erc20.transfer(donationRelayer, depositAmount);

		expect(await erc20.balanceOf(receiver.address)).to.be.equal(0);

		await donationRelayer.nonReimbursedRelay(erc20.target);

		expect(await erc20.balanceOf(receiver.address)).to.be.equal(depositAmount);
	});

	it("should allow senderBob to send an ERC20 and relays correct amount", async () => {
		const depositAmount = ethers.parseEther("3.1415");
		const balanceBefore = await erc20.balanceOf(receiver.address);
		await erc20
			.connect(senderBob)
			.transfer(donationRelayer.target, depositAmount);
		await donationRelayer.nonReimbursedRelay(erc20.target);
		expect((await erc20.balanceOf(receiver.address)) - balanceBefore).to.equal(
			depositAmount,
		);
	});

	it("should allow alice & bob to donate erc20Secondary and relays correct amounts", async () => {
		const amountAlice = ethers.parseEther("5");
		const amountBob = ethers.parseEther("7");

		await erc20Secondary
			.connect(senderAlice)
			.transfer(donationRelayer.target, amountAlice);
		await donationRelayer.nonReimbursedRelay(erc20Secondary.target);
		expect(await erc20Secondary.balanceOf(receiver.address)).to.equal(
			amountAlice,
		);
		await erc20Secondary
			.connect(senderBob)
			.transfer(donationRelayer.target, amountBob);
		await donationRelayer.nonReimbursedRelay(erc20Secondary.target);
		expect(await erc20Secondary.balanceOf(receiver.address)).to.equal(
			amountAlice + amountBob,
		);
	});

	it("should allow alice & bob donate ETH and relays correct total ETH", async () => {
		const ethAlice = ethers.parseEther("0.5");
		const ethBob = ethers.parseEther("1.25");
		const before = await ethers.provider.getBalance(receiver.address);

		await senderAlice.sendTransaction({
			to: donationRelayer.target,
			value: ethAlice,
		});
		await senderBob.sendTransaction({
			to: donationRelayer.target,
			value: ethBob,
		});
		await donationRelayer.nonReimbursedRelay(ethers.ZeroAddress);
		const after = await ethers.provider.getBalance(receiver.address);
		expect(after - before).to.equal(ethAlice + ethBob);
	});

	it("should revert when relaying an unheld ERC20", async () => {
		const NewToken = await ethers.getContractFactory("TestERC20");
		const newToken = await NewToken.deploy();
		await expect(
			donationRelayer.nonReimbursedRelay(newToken.target),
		).to.be.revertedWithCustomError(donationRelayer, "ZeroBalance");
	});

	it("should revert when relaying ETH with zero balance", async () => {
		await expect(
			donationRelayer.nonReimbursedRelay(ethers.ZeroAddress),
		).to.be.revertedWithCustomError(donationRelayer, "ZeroBalance");
	});

	it("emits DonationRelayed event upon successful relay", async () => {
		const depositAmount = ethers.parseEther("0.1");
		await erc20
			.connect(senderAlice)
			.transfer(donationRelayer.target, depositAmount);
		await expect(donationRelayer.nonReimbursedRelay(erc20.target))
			.to.emit(donationRelayer, "DonationRelayed")
			.withArgs(erc20.target, depositAmount);
	});

	it("emits DonationRelayed event with correct args for native relay", async () => {
		const receiverBalanceBefore = await ethers.provider.getBalance(
			receiver.address,
		);

		await senderAlice.sendTransaction({
			to: donationRelayer.target,
			value: ethers.parseEther("5"),
		});
		const expectedAmount = ethers.parseEther("4"); // 5 ETH initial – 1 ETH fee
		await expect(donationRelayer.relayDonations(ethers.ZeroAddress))
			.to.emit(donationRelayer, "DonationRelayed")
			.withArgs(ethers.ZeroAddress, expectedAmount);
		const receiverBalanceAfter = await ethers.provider.getBalance(
			receiver.address,
		);

		expect(receiverBalanceAfter - receiverBalanceBefore).to.be.equal(
			expectedAmount,
		);
	});

	it("emits DonationRelayed event with correct args for ERC20 relay", async () => {
		const receiverBalanceBefore = await erc20.balanceOf(receiver.address);
		const stableReimbursement =
			await donationRelayer.STABLE_REIMBURSEMENT_AMOUNT();
		const donationAmount = ethers.parseUnits("100", 18);
		// fund contract
		await erc20.transfer(
			donationRelayer.target,
			stableReimbursement + donationAmount,
		);

		await expect(donationRelayer.relayDonations(erc20.target))
			.to.emit(donationRelayer, "DonationRelayed")
			.withArgs(erc20.target, donationAmount);

		const receiverBalanceAfter = await erc20.balanceOf(receiver.address);

		expect(receiverBalanceAfter - receiverBalanceBefore).to.be.equal(
			donationAmount,
		);
	});

	it("Should revert if donation was too small and fee may not be covered (ERC20)", async () => {
		const donationAmount = await donationRelayer.STABLE_REIMBURSEMENT_AMOUNT();

		await erc20.transfer(donationRelayer.target, donationAmount);

		await expect(
			donationRelayer.relayDonations(erc20.target),
		).to.be.revertedWithCustomError(donationRelayer, "FeeNotCovered");
	});

	it("Should revert if donation was too small and fee may not be covered (ETH)", async () => {
		const donationAmount = await donationRelayer.REIMBURSEMENT_AMOUNT();

		await senderAlice.sendTransaction({
			to: donationRelayer.target,
			value: donationAmount,
		});

		await expect(
			donationRelayer.relayDonations(ethers.ZeroAddress),
		).to.be.revertedWithCustomError(donationRelayer, "FeeNotCovered");
	});

	it("Should revert if relaying with fee not whitelisted asset", async () => {
		const erc20NotListed = await (
			await ethers.getContractFactory("TestERC20")
		).deploy();

		await erc20NotListed.transfer(
			donationRelayer.target,
			ethers.parseEther("1"),
		);

		await expect(
			donationRelayer.relayDonations(erc20NotListed.target),
		).to.be.revertedWithCustomError(donationRelayer, "AssetNotAllowed");
	});
});
