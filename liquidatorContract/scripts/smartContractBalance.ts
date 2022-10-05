import { ethers } from "hardhat";

async function main() {
  const LiquidateLoan = await ethers.getContractFactory("LiquidateLoan");
  const contract = await LiquidateLoan.attach(
    "0xd753c12650c280383ce873cc3a898f6f53973d16"
  );

  const assetToLiquidate = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const flashAmount = "1622238100";
  const collateralAddress = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
  const userToLiquidate = "0xf37680f16b92747ee8537a7e2ccb0e51a7c52a64";
  const amountOutMin = 22268000000000000000;
  const swapPath = [
    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  ];

  contract.executeFlashLoans(
    assetToLiquidate,
    flashAmount,
    collateralAddress,
    userToLiquidate,
    amountOutMin,
    swapPath
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
