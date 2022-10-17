import { ethers } from "hardhat";

async function main() {
  const us = "0xB0171C387b28Ac64f13D53B2fcc285a0b22bFffa";
  const funder = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  console.log(
    `balance of funder before: ${await ethers.provider.getBalance(funder)}`
  );
  console.log(`balance of us before: ${await ethers.provider.getBalance(us)}`);

  const impersonatedSigner = await ethers.getImpersonatedSigner(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  ); // fake account created at hardhat startup
  const tx = await impersonatedSigner.sendTransaction({
    to: "0xB0171C387b28Ac64f13D53B2fcc285a0b22bFffa",
    value: ethers.utils.parseEther("5.0"), // Sends exactly 1.0 ether
  });
  console.log(tx);
  console.log(
    `balance of funder after: ${await ethers.provider.getBalance(funder)}`
  );
  console.log(`balance of us after: ${await ethers.provider.getBalance(us)}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
