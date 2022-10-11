import { ethers } from "hardhat";

async function main() {
  const AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER =
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
  const UNISWAP_V2_ROUTER_ADDRESS =
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  const LiquidateLoan = await ethers.getContractFactory("LiquidateLoan");
  const liquidateLoan = await LiquidateLoan.deploy(
    AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER,
    UNISWAP_V2_ROUTER_ADDRESS
  );

  await liquidateLoan.deployed();

  console.log(`LiquidateLoan with deployed to ${liquidateLoan.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
