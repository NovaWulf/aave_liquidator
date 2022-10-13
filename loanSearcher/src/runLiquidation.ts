import ethers from 'ethers';
import { LiquidateLoan } from './abis/LiquidateLoan.js';
import LiquidateLoanAbi from './abis/LiquidateLoanABI.js';
import { LiquidationParams } from './liquidations.js';

export async function runLiquidation(params: LiquidationParams) {
  const {
    ALCHEMY_API_KEY,
    MAINNET_PRIVATE_KEY,
    LIQUIDATOR_CONTRACT_MAINNET_ADDRESS,
  } = process.env;

  const alchemyProvider = new ethers.providers.AlchemyProvider(
    'mainnet',
    ALCHEMY_API_KEY,
  );
  const signer = (new ethers.Wallet(MAINNET_PRIVATE_KEY, alchemyProvider);

  const liquidatorContract = (new ethers.Contract(
    LIQUIDATOR_CONTRACT_MAINNET_ADDRESS,
    LiquidateLoanAbi.abi,
    signer,
  ) as unknown) as LiquidateLoan;

  console.log();

  const tx = await liquidatorContract.executeFlashLoans(
    params.assetToLiquidate,
    params.flashAmount,
    params.collateralAddress,
    params.userToLiquidate,
    params.amountOutMin,
    params.swapPath,
  );
  await tx.wait();
}
