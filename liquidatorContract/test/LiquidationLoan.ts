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

  describe("liquidating old transaction", () => {
    // this user was liquidated in block: 14367537, so we should use 14367536 in hardhat config
    //https://etherscan.io/tx/0xf0551ea0bf9b47dc506845b75aaf83aac06ecbfd0da54237d37fb7297e28d8e9#eventlog
    const assetToLiquidate = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const collateralAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const userToLiquidate = "0x8a8967428b96b9c64d5f578b25ab20c378abb896";
    const amountOutMin = 30966379588568000201n;

    const flashAmount = 30001631141639593984n;
    const swapPath = [
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    ];

    it("collateral should exist", async () => {
      const { owner } = await loadFixture(deployLiquidateLoanFixture);

      const contract = await ethers.getContractAt(ERC20_ABI, collateralAddress);
      const ownerCollateralBalance = await contract.balanceOf(owner.address);
      expect(ownerCollateralBalance).to.equal(0);
    });

    it("borrow asset should exist", async () => {
      const { owner } = await loadFixture(deployLiquidateLoanFixture);

      const contract = await ethers.getContractAt(ERC20_ABI, assetToLiquidate);
      const ownerBorrowBalance = await contract.balanceOf(owner.address);
      expect(ownerBorrowBalance).to.equal(0);
    });

    it("ensure user exists", async () => {
      const balance = await ethers.provider.getBalance(userToLiquidate);
      expect(balance).to.be.gt(0);
    });

    it("gets health factor", async () => {
      const { owner } = await loadFixture(deployLiquidateLoanFixture);

      const contract = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER
      );

      const lendingPool = await contract.getLendingPool();
      // console.log(lendingPool);

      const lpContract = await ethers.getContractAt(
        "ILendingPool",
        lendingPool
      );
      // console.log(lpContract);

      const user = await lpContract.getUserAccountData(userToLiquidate);
      // console.log(user);

      const { healthFactor } = user;

      const oneEther = ethers.utils.parseEther("1.0");

      const healthFactorFloat =
        Number(healthFactor.mul(100).div(1000000000000000000n)) / 100;
      console.log(healthFactorFloat);

      expect(healthFactorFloat).to.be.gt(0);
    });

    it("should succeed", async () => {
      const { liquidateLoan, owner } = await loadFixture(
        deployLiquidateLoanFixture
      );
      const contract = await ethers.getContractAt(ERC20_ABI, collateralAddress);
      expect(await contract.balanceOf(owner.address)).to.eq(0);

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

      const balance = await contract.balanceOf(owner.address);
      console.log(balance);

      expect(balance).to.be.gt(0);
    });
  });
});
