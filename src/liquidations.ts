import { TOKEN_LIST } from './chains.js';
import { TokenAmount, Trade } from '@uniswap/sdk';
import { showPath, useTradeExactIn } from './uniswap/trades.js';
import { gasCostInWei } from './utils/gas.js';
import {
  AaveLoanSummary,
  ALLOWED_LIQUIDATION,
  FLASH_LOAN_FEE,
} from './aave.js';
import { percentBigInt, tokenToDecimal } from './utils/bigintUtils.js';

const GAS_USED_ESTIMATE = 1000000n;

export const gasCostToLiquidate = function () {
  return gasCostInWei() * GAS_USED_ESTIMATE;
};

export async function liquidationProfits(
  loans: AaveLoanSummary[],
): Promise<any[]> {
  const results = await Promise.all(
    loans.map(async (loan) => {
      const profits = await liquidationProfit(loan);
      return profits;
    }),
  );
  const profitableLoans = results.flat().filter((n) => n); //remove nulls
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

async function liquidationProfit(loan: AaveLoanSummary) {
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
  // console.log(`flash loan cost in ${loan.maxBorrowedSymbol}: ${flashLoanCost}`);

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
    console.log("couldn't find trade, skipping ");
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
    console.log('loan is not profitable to liquidate, skipping');
    return null;
  }

  const result = [];

  result.push('-------------------------------');
  result.push(`- User ID:${loan.userId}`);
  result.push(`- HealthFactor ${loan.healthFactor.toFixed(2)}`);
  result.push(
    `- User borrowed ${loan.maxBorrowedSymbol} with collateral of ${loan.maxCollateralSymbol}`,
  );
  result.push(
    `- We would borrow ${loan.maxBorrowedSymbol} to liquidate ${loan.maxBorrowedSymbol} to get ${loan.maxCollateralSymbol} and swap back to ${loan.maxBorrowedSymbol} to pay off loan`,
  );
  result.push(
    `- Amount to Liquidate ${tokenToDecimal(
      amountToLiquidate,
      loan.maxBorrowedDecimals,
    )} ${loan.maxBorrowedSymbol}`,
  );
  result.push(
    `- Amount to Liquidate converted to ETH ${tokenToDecimal(
      amountToLiquidateInEth,
      18,
    )}`,
  );
  result.push(
    `- amountToLiquidate converted to ETH plus bonus ${tokenToDecimal(
      amountToLiquidateInEthPlusBonus,
      18,
    )}`,
  );
  result.push(
    `- Payout in Collateral Tokens ${tokenToDecimal(
      collateralTokensFromPayout,
      loan.maxCollateralDecimals,
    )} ${loan.maxCollateralSymbol}`,
  );

  result.push(
    `- ${loan.maxBorrowedSymbol} received from swap ${tokenToDecimal(
      minimumTokensAfterSwap,
      loan.maxBorrowedDecimals,
    )}`,
  );
  result.push(`- Best Trade ${bestTrade ? showPath(bestTrade) : 'no path'}`);

  result.push(
    `- Expected Profit In Eth After Fees ${tokenToDecimal(
      profitInEthAfterGas,
      18,
    )} ETH`,
  );
  result.push('-------------------------------');

  // result.forEach((l) => console.log(l));

  // console.log(...result);

  return result;
  // }
}
