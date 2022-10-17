import { ethers } from "hardhat";
import ERC20_ABI from "../abis/erc20";

async function main() {
  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const liquidateLoanAddress = "0xF6e475E4Db277a073176f241Fe86f3501C80cc65";
  const contract = await ethers.getContractAt(
    "LiquidateLoan",
    "0xF6e475E4Db277a073176f241Fe86f3501C80cc65"
  );

  console.log(`contract owner: ${await contract.owner()}`);

  const daiContract = await ethers.getContractAt(ERC20_ABI, daiAddress);
  const contractDaiBalance = await daiContract.balanceOf(liquidateLoanAddress);
  console.log(`contract balance: ${contractDaiBalance}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
