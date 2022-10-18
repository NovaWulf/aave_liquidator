import { TokenAmount, Trade } from '@uniswap/sdk';
import { BigNumberish } from 'ethers';
import {
  AaveLoanSummary,
  ALLOWED_LIQUIDATION,
  FLASH_LOAN_FEE,
} from './aave.js';
import { getUserHealthFactor } from './aaveHealth.js';
import { TOKEN_LIST } from './chains.js';
import { attemptedUsers } from './runLiquidation.js';
import {
  getPathAddresses,
  showPath,
  useTradeExactIn,
} from './uniswap/trades.js';
import { percentBigInt, tokenToDecimal } from './utils/bigintUtils.js';
import { gasCost } from './utils/gas.js';

const GAS_USED_ESTIMATE = 1000000n;

export type LiquidationParams = {
  assetToLiquidate: string;
  flashAmount: BigNumberish;
  collateralAddress: string;
  userToLiquidate: string;
  amountOutMin: BigNumberish;
  swapPath: string[];
  profitInEthAfterGas: BigNumberish;
  description?: string;
};

export function gasCostToLiquidate(): bigint {
  return gasCost * GAS_USED_ESTIMATE;
}

export function sortLoansbyProfit(
  loans: LiquidationParams[],
): LiquidationParams[] {
  return loans.sort((a, b) =>
    a.profitInEthAfterGas < b.profitInEthAfterGas
      ? 1
      : a.profitInEthAfterGas > b.profitInEthAfterGas
      ? -1
      : 0,
  );
}

export function excludeRecentlyAttempted(
  loans: LiquidationParams[],
): LiquidationParams[] {
  console.log(attemptedUsers);

  return loans.filter((l) => !attemptedUsers[l.userToLiquidate]);
}

export async function mostProfitableLoan(
  loans: LiquidationParams[],
): Promise<LiquidationParams> {
  const blockNumber = process.env.TEST_BLOCK_NUMBER;

  for (const loan of loans) {
    // double check health
    const hf = blockNumber
      ? await getUserHealthFactor(loan.userToLiquidate, parseInt(blockNumber))
      : await getUserHealthFactor(loan.userToLiquidate);

    const floatHF = parseFloat(hf['healthFactor']);

    if (floatHF < 1.0) {
      return loan;
    }
  }
  return null;
}

export async function liquidationProfits(
  loans: AaveLoanSummary[],
): Promise<LiquidationParams[]> {
  const results = await Promise.all(
    loans.map(async (loan) => {
      const profits = await liquidationProfit(loan);
      return profits;
    }),
  );
  const profitableLoans = results.filter((n) => n); //remove nulls
  console.log(`Found ${profitableLoans.length} profitable loans`);

  return profitableLoans;
}

export function knownTokens(loans: AaveLoanSummary[]): AaveLoanSummary[] {
  const result = loans.filter((loan) => {
    if (!TOKEN_LIST[loan.maxBorrowedSymbol]) {
      console.log(`unknown token: ${loan.maxBorrowedSymbol} `);
      return false;
    }
    if (!TOKEN_LIST[loan.maxCollateralSymbol]) {
      console.log(`unknown token: ${loan.maxCollateralSymbol}`);
      return false;
    }

    // FIXME! If the collateral token is WETH, we need a different uniswap method
    // to use.  so ignore for now.  fix after end to end test works.
    if (loan.maxCollateralSymbol == 'WETH') {
      // console.log('SKIPPING WETH colatteral for now');
      // return false;
    }
    return true;
  });
  console.log(`Found ${result.length} loans with known tokens`);
  return result;
}

async function liquidationProfit(
  loan: AaveLoanSummary,
): Promise<LiquidationParams> {
  //flash loan fee
  const amountToLiquidate = percentBigInt(
    BigInt(loan.maxBorrowedPrincipal),
    ALLOWED_LIQUIDATION,
  );
  const flashLoanCost = percentBigInt(amountToLiquidate, FLASH_LOAN_FEE);

  //minimum amount of liquidated coins that will be paid out as profit
  const amountToLiquidateInEth = BigInt(
    tokenToDecimal(amountToLiquidate, loan.maxBorrowedDecimals) *
      loan.maxBorrowedPriceInEth,
  );

  const amountToLiquidateInEthPlusBonus = percentBigInt(
    amountToLiquidateInEth,
    loan.maxCollateralBonus,
  ); //add the bonus

  //this is the amount of tokens that will be received as payment for liquidation
  // and then will need to be swapped back to token of the flashloan
  const collateralTokensFromPayout =
    (amountToLiquidateInEthPlusBonus *
      BigInt(10 ** loan.maxCollateralDecimals)) /
    BigInt(loan.maxCollateralPriceInEth);

  const fromTokenAmount = new TokenAmount(
    TOKEN_LIST[loan.maxCollateralSymbol],
    collateralTokensFromPayout,
  ); // this is the number of coins to trade (should have many 0's)

  const bestTrade: Trade = await useTradeExactIn(
    fromTokenAmount,
    TOKEN_LIST[loan.maxBorrowedSymbol],
  );

  let minimumTokensAfterSwap = 0n;
  if (bestTrade) {
    const { numerator, denominator } = bestTrade.outputAmount;

    // JSON.stringify(bestTrade, null, 2);
    minimumTokensAfterSwap =
      (BigInt(String(numerator)) * BigInt(10 ** loan.maxBorrowedDecimals)) /
      BigInt(String(denominator));
  } else {
    console.log(
      `couldn't find trade from: ${loan.maxCollateralSymbol} -> ${loan.maxBorrowedSymbol}, skipping `,
    );
    return null;
  }

  //total profits (bonus_after_swap - flashLoanCost).to_eth - gasFee
  const gasFee = gasCostToLiquidate(); //calc gas fee

  const flashLoanPlusCost = flashLoanCost + amountToLiquidate;
  const profitInBorrowCurrency = minimumTokensAfterSwap - flashLoanPlusCost;

  const profitInEth =
    (profitInBorrowCurrency * BigInt(loan.maxBorrowedPriceInEth)) /
    BigInt(10 ** loan.maxBorrowedDecimals);

  const profitInEthAfterGas = profitInEth - gasFee;

  const BONUS_THRESHOLD = parseFloat(process.env.BONUS_THRESHOLD); //in eth. A bonus below this will be ignored

  if (profitInEthAfterGas <= BONUS_THRESHOLD) {
    console.log(
      `loan is not profitable to liquidate at ${tokenToDecimal(
        profitInEthAfterGas,
        18,
      )}, skipping`,
    );
    return null;
  }

  let description = '-------------------------\r\n';
  description += 'About to try and liquidate this loan:\r\n';
  description += `- User ID: ${loan.userId}\r\n`;
  description += `- HealthFactor: ${loan.healthFactor.toFixed(2)}\r\n`;
  description += `- User borrowed ${loan.maxBorrowedSymbol} with collateral of ${loan.maxCollateralSymbol}\r\n`;
  description += `- We would borrow ${loan.maxBorrowedSymbol} to liquidate ${loan.maxBorrowedSymbol} to get ${loan.maxCollateralSymbol} and swap back to ${loan.maxBorrowedSymbol} to pay off loan\r\n`;
  description += `- Amount to Liquidate ${tokenToDecimal(
    amountToLiquidate,
    loan.maxBorrowedDecimals,
  )} ${loan.maxBorrowedSymbol}\r\n`;
  description += `- Amount to Liquidate converted to ETH ${tokenToDecimal(
    amountToLiquidateInEth,
    18,
  )}\r\n`;
  description += `- amountToLiquidate converted to ETH plus bonus ${tokenToDecimal(
    amountToLiquidateInEthPlusBonus,
    18,
  )}\r\n`;
  description += `- Payout in Collateral Tokens ${tokenToDecimal(
    collateralTokensFromPayout,
    loan.maxCollateralDecimals,
  )} ${loan.maxCollateralSymbol}\r\n`;
  description += `- ${
    loan.maxBorrowedSymbol
  } received from swap ${tokenToDecimal(
    minimumTokensAfterSwap,
    loan.maxBorrowedDecimals,
  )}\r\n`;
  description += `- Best Trade ${
    bestTrade ? showPath(bestTrade) : 'no path'
  }\r\n`;
  description += `- Expected Profit In Eth After Fees ${tokenToDecimal(
    profitInEthAfterGas,
    18,
  )} ETH\r\n`;

  const result: LiquidationParams = {
    assetToLiquidate: TOKEN_LIST[loan.maxBorrowedSymbol].address,
    flashAmount: amountToLiquidate,
    collateralAddress: TOKEN_LIST[loan.maxCollateralSymbol].address,
    userToLiquidate: loan.userId,
    amountOutMin: minimumTokensAfterSwap,
    swapPath: getPathAddresses(bestTrade),
    profitInEthAfterGas,
    description,
  };

  return result;
}
