import { expect } from "chai";
import { ethers } from "hardhat";
import type { DepositExample, TestERC20 } from "../typechain-types";

describe("Smoke", () => {
  let erc20: TestERC20;
  let depositExample: DepositExample;

  before(async () => {
    erc20 = await (await ethers.getContractFactory("TestERC20")).deploy();
    await erc20.waitForDeployment();

    depositExample = await (
      await ethers.getContractFactory("DepositExample")
    ).deploy(erc20.target);
  });

  it("Should allow deposit after an approve", async () => {
    // approve
    const depositAmount = ethers.parseEther("1");
    await erc20.approve(depositExample.target, depositAmount);

    // after approve is done - executing deposit
    await depositExample.deposit(depositAmount);

    expect(await erc20.balanceOf(depositExample.target)).to.be.equal(
      depositAmount
    );
  });

  it("Should allow withdrawing", async () => {
    // withdrawing half
    const withdrawAmount = ethers.parseUnits("5", 17);

    await depositExample.withdraw(withdrawAmount);

    expect(await erc20.balanceOf(depositExample.target)).to.be.equal(
      withdrawAmount
    );
  });
});
