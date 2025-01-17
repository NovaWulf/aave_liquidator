import ethers from 'ethers';
import { LiquidateLoan } from './abis/LiquidateLoan.js';
import LiquidateLoanAbi from './abis/LiquidateLoanABI.js';
import { LiquidationParams } from './liquidations.js';
import { signer } from './utils/alchemy.js';
import { safeStringify } from './utils/bigintUtils.js';

export const attemptedUsers: object = {};

export async function runLiquidation(
  params: LiquidationParams,
): Promise<ethers.ethers.ContractReceipt> {
  if (attemptedUsers[params.userToLiquidate]) {
    console.log("skipping this liquidation as we've already tried this user");
    return null;
  } else {
    attemptedUsers[params.userToLiquidate] = true;
  }

  if (!process.env.RUN_LIQUIDATIONS) return null;

  const { LIQUIDATOR_CONTRACT_MAINNET_ADDRESS } = process.env;

  const liquidatorContract = new ethers.Contract(
    LIQUIDATOR_CONTRACT_MAINNET_ADDRESS,
    LiquidateLoanAbi.abi,
    signer(),
  ) as unknown as LiquidateLoan;

  console.log(`liquidator contract owner: ${await liquidatorContract.owner()}`);

  console.log(
    `about to call Liquidator contract with params: ${safeStringify(params)}`,
  );

  try {
    const tx = await liquidatorContract.executeFlashLoans(
      params.assetToLiquidate,
      params.flashAmount,
      params.collateralAddress,
      params.userToLiquidate,
      params.amountOutMin,
      params.swapPath,
    );
    const receipt = await tx.wait();
    console.log('***** success');

    console.log(receipt);
    return receipt;
  } catch (e) {
    // handle the internal error if it exists
    if (e && e.error) {
      switch (e.error.reason) {
        case 'execution reverted: 42':
          console.error(
            `***** Health Factor for user: ${params.userToLiquidate} was not below 1`,
          );
          return null;
        case 'execution reverted: no profits to return':
          console.error(
            `***** Not profitable enough to liquidate: ${params.userToLiquidate}`,
          );
          return null;
      }
    }

    // otherwise general logging
    console.error('***** unknown execution error');
    console.error(e);

    return null;
  }
}
