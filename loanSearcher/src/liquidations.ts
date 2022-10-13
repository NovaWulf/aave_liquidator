import { TOKEN_LIST } from './chains.js';
import { TokenAmount, Trade } from '@uniswap/sdk';
import {
  getPathAddresses,
  showPath,
  useTradeExactIn,
} from './uniswap/trades.js';
import { gasCostInWei } from './utils/gas.js';
import {
  AaveLoanSummary,
  ALLOWED_LIQUIDATION,
  FLASH_LOAN_FEE,
} from './aave.js';
import { percentBigInt, tokenToDecimal } from './utils/bigintUtils.js';
import { sendMail } from './utils/mailer.js';
import { BigNumberish } from 'ethers';

const GAS_USED_ESTIMATE = 1000000n;

export type LiquidationParams = {
  assetToLiquidate: string;
  flashAmount: BigNumberish;
  collateralAddress: string;
  userToLiquidate: string;
  amountOutMin: BigNumberish;
  swapPath: string[];
  profitInEthAfterGas: BigNumberish;
};

export const gasCostToLiquidate = function () {
  return gasCostInWei() * GAS_USED_ESTIMATE;
};

export function mostProfitableLoan(
  loans: LiquidationParams[],
): LiquidationParams {
  return loans.sort((a, b) =>
    a.profitInEthAfterGas < b.profitInEthAfterGas
      ? 1
      : a.profitInEthAfterGas > b.profitInEthAfterGas
      ? -1
      : 0,
  )[0];
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
    return true;
  });
  console.log(`Found ${result.length} loans with known tokens`);
  return result;
}

async function liquidationProfit(
  loan: AaveLoanSummary,
): Promise<LiquidationParams> {
  // console.log(loan);
  // console.log(TOKEN_LIST);

  // console.log(TOKEN_LIST[loan.maxBorrowedSymbol]);
  // console.log(TOKEN_LIST[loan.maxCollateralSymbol]);

  if (!TOKEN_LIST[loan.maxBorrowedSymbol]) {
    console.log(`unknown token: ${loan.maxBorrowedSymbol} `);
    return null;
  }
  if (!TOKEN_LIST[loan.maxCollateralSymbol]) {
    console.log(`unknown token: ${loan.maxCollateralSymbol}`);
    return null;
  }

  //flash loan fee
  const amountToLiquidate = percentBigInt(
    BigInt(loan.maxBorrowedPrincipal),
    ALLOWED_LIQUIDATION,
  );
  // console.log(
  //   `amount of ${loan.maxBorrowedSymbol} to liquidate: ${amountToLiquidate}`,
  // );

  const flashLoanCost = percentBigInt(amountToLiquidate, FLASH_LOAN_FEE);
  console.log(`flash loan cost in ${loan.maxBorrowedSymbol}: ${flashLoanCost}`);

  //minimum amount of liquidated coins that will be paid out as profit
  const amountToLiquidateInEth = BigInt(
    tokenToDecimal(amountToLiquidate, loan.maxBorrowedDecimals) *
      loan.maxBorrowedPriceInEth,
  );
  // console.log(`amount to liquidate in ETH (wei): ${amountToLiquidateInEth}`);

  const amountToLiquidateInEthPlusBonus = percentBigInt(
    amountToLiquidateInEth,
    loan.maxCollateralBonus,
  ); //add the bonus
  // console.log(
  //   `amount to liquidate in ETH (wei) plus bonus: ${amountToLiquidateInEthPlusBonus}`,
  // );

  //this is the amount of tokens that will be received as payment for liquidation
  // and then will need to be swapped back to token of the flashloan
  const collateralTokensFromPayout =
    (amountToLiquidateInEthPlusBonus *
      BigInt(10 ** loan.maxCollateralDecimals)) /
    BigInt(loan.maxCollateralPriceInEth);
  // console.log(`collateral tokens from payout: ${collateralTokensFromPayout}`);

  const fromTokenAmount = new TokenAmount(
    TOKEN_LIST[loan.maxCollateralSymbol],
    collateralTokensFromPayout,
  ); // this is the number of coins to trade (should have many 0's)
  // console.log(`number of (collateral) tokens to trade:`);
  // console.log(fromTokenAmount);

  const bestTrade: Trade = await useTradeExactIn(
    fromTokenAmount,
    TOKEN_LIST[loan.maxBorrowedSymbol],
  );
  // console.log('best trade: ' + bestTrade);

  let minimumTokensAfterSwap = 0n;
  if (bestTrade) {
    const { numerator, denominator } = bestTrade.outputAmount;

    // JSON.stringify(bestTrade, null, 2);
    minimumTokensAfterSwap =
      (BigInt(String(numerator)) * BigInt(10 ** loan.maxBorrowedDecimals)) /
      BigInt(String(denominator));
  }
  // console.log(`tokens after swap: ${minimumTokensAfterSwap}`);
  if (!bestTrade) {
    console.log(
      `couldn't find trade from: ${loan.maxCollateralSymbol} -> ${loan.maxBorrowedSymbol}, skipping `,
    );
    return null;
  }

  //total profits (bonus_after_swap - flashLoanCost).to_eth - gasFee
  const gasFee = gasCostToLiquidate(); //calc gas fee

  const flashLoanPlusCost = flashLoanCost + amountToLiquidate;
  const profitInBorrowCurrency = minimumTokensAfterSwap - flashLoanPlusCost;
  // console.log(`profitInBorrowCurrency: ${profitInBorrowCurrency}`);

  const profitInEth =
    (profitInBorrowCurrency * BigInt(loan.maxBorrowedPriceInEth)) /
    BigInt(10 ** loan.maxBorrowedDecimals);

  // console.log(`profitInEth: ${profitInEth}`);

  const profitInEthAfterGas = profitInEth - gasFee;
  // console.log(`profitInEthAfterGas: ${profitInEthAfterGas}`);

  const BONUS_THRESHOLD = parseFloat(process.env.BONUS_THRESHOLD); //in eth. A bonus below this will be ignored

  if (profitInEthAfterGas <= BONUS_THRESHOLD) {
    console.log(
      `loan is not profitable to liquidate at ${profitInEthAfterGas}, skipping`,
    );
    return null;
  }

  let description = '-------------------------';
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

  console.log(description);
  sendMail(description); // async

  const result: LiquidationParams = {
    assetToLiquidate: TOKEN_LIST[loan.maxBorrowedSymbol].address,
    flashAmount: amountToLiquidate,
    collateralAddress: TOKEN_LIST[loan.maxCollateralSymbol].address,
    userToLiquidate: loan.userId,
    amountOutMin: minimumTokensAfterSwap,
    swapPath: getPathAddresses(bestTrade),
    profitInEthAfterGas,
  };

  return result;
}
