import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import ERC20_ABI from "../abis/erc20";
import AAVE_ABI from "../abis/aave";
import UNISWAP_ROUTER_ABI from "../abis/uniswapRouter";

const AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER =
  "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
const UNISWAP_V2_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

describe("LiquidateLoan", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployLiquidateLoanFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const LiquidateLoan = await ethers.getContractFactory("LiquidateLoan");
    const liquidateLoan = await LiquidateLoan.deploy(
      AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER,
      UNISWAP_V2_ROUTER_ADDRESS
    );

    return { liquidateLoan, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { liquidateLoan, owner } = await loadFixture(
        deployLiquidateLoanFixture
      );

      expect(await liquidateLoan.owner()).to.equal(owner.address);
    });
  });

  describe("Verify External Contracts", () => {
    it("lending pool should exist", async () => {
      const contract = await ethers.getContractAt(
        AAVE_ABI,
        AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER
      );
      expect(contract.flashLoan).to.exist;
    });

    it("uniswap router should exist", async () => {
      const contract = await ethers.getContractAt(
        UNISWAP_ROUTER_ABI,
        UNISWAP_V2_ROUTER_ADDRESS
      );

      expect(contract.swapExactTokensForTokens).to.exist;
    });
  });

  describe("Liquidation", () => {
    it("should succeed", async () => {
      const assetToLiquidate = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const flashAmount = 1622238100n;
      const collateralAddress = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
      const userToLiquidate = "0xf37680f16b92747ee8537a7e2ccb0e51a7c52a64";
      const amountOutMin = 22268000000000000000n;
      const swapPath = [
        "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      ];

      const { liquidateLoan, owner } = await loadFixture(
        deployLiquidateLoanFixture
      );

      const COLLATERAL_ASSET = new ethers.Contract(
        collateralAddress,
        ERC20_ABI,
        ethers.provider
      );
      expect(await COLLATERAL_ASSET.balanceOf(owner.address).to.equal(0));

      expect(
        await liquidateLoan.executeFlashLoans(
          assetToLiquidate,
          flashAmount,
          collateralAddress,
          userToLiquidate,
          amountOutMin,
          swapPath
        )
      ).not.to.be.reverted;

      expect(await COLLATERAL_ASSET.balanceOf(owner.address).to.be.gt(0));
    });
  });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  // });
});
