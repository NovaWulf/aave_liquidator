import fetch from 'node-fetch';

import mathutils from '@aave/math-utils';
const { formatUserSummary, formatReserves } = mathutils;

import dayjs from 'dayjs';

const subgraph_url = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2';

const execute = async (query: string) => {
  const response: any = await fetch(subgraph_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const data = (await response.json()) as any;

  return data.data;
};

const getPoolReserveData = async (blockNumber: number) => {
  const blockQuery = blockNumber ? `block: {number: ${blockNumber}}, ` : '';

  const query = `
  query{
    reserves(
      ${blockQuery}
      where: { pool: "${process.env.AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER}" }
    ) {
      id
      symbol
      name
      decimals
      underlyingAsset
      usageAsCollateralEnabled
      reserveFactor
      baseLTVasCollateral
      averageStableRate
      stableDebtLastUpdateTimestamp
      liquidityIndex
      reserveLiquidationThreshold
      reserveLiquidationBonus
      variableBorrowIndex
      variableBorrowRate
      liquidityRate
      totalPrincipalStableDebt
      totalScaledVariableDebt
      lastUpdateTimestamp
      availableLiquidity
      stableBorrowRate
      totalLiquidity
      price {
        priceInEth
      }
    }
  }`;

  const reserves = await execute(query);

  const reservesArray = reserves.reserves.map((reserve) => {
    return {
      ...reserve,
      priceInMarketReferenceCurrency: reserve.price.priceInEth,
      eModeCategoryId: 0,
      borrowCap: '',
      supplyCap: '',
      debtCeiling: '',
      debtCeilingDecimals: 0,
      isolationModeTotalDebt: '',
      eModeLtv: 0,
      eModeLiquidationThreshold: 0,
      eModeLiquidationBonus: 0,
    };
  });
  // console.log(reservesArray);

  return reservesArray;
};

const getUserReserveData = async (user: string, blockNumber: number) => {
  const blockQuery = blockNumber ? `block: {number: ${blockNumber}}, ` : '';

  const query = `{
    userReserves (
      ${blockQuery}
      where: { pool: "${
        process.env.AAVE_V2_LENDING_POOL_ADDRESS_PROVIDER
      }", user: "${user.toLowerCase()}"}){
      reserve{
        underlyingAsset
      }
      scaledATokenBalance
      usageAsCollateralEnabledOnUser
      stableBorrowRate
      scaledVariableDebt
      principalStableDebt
      stableBorrowLastUpdateTimestamp
    }
  }`;

  const userReserves = await execute(query);
  const userReservesArray = userReserves.userReserves.map((userReserve) => {
    return {
      ...userReserve,
      underlyingAsset: userReserve.reserve.underlyingAsset,
    };
  });
  // console.log(userReservesArray);

  return userReservesArray;
};

const getUsdPriceEth = async (blockNumber: number) => {
  const blockQuery = blockNumber ? `(block: {number: ${blockNumber}})` : '';
  // console.log(blockQuery);

  const query = `{
    priceOracles${blockQuery} {
      usdPriceEth
    }
  }`;
  return execute(query);
};

export const getUserHealthFactor = async (
  userId: string,
  blockNumber?: number,
) => {
  const reservesArray = await getPoolReserveData(blockNumber);
  const userReservesArray = await getUserReserveData(userId, blockNumber);
  const prices = await getUsdPriceEth(blockNumber);
  // console.log(prices);

  const usdPriceInEth = prices.priceOracles[0].usdPriceEth;

  const currentTimestamp = dayjs().unix();
  const marketReferenceCurrencyPriceInUsd = (
    1 /
    (usdPriceInEth / 10 ** 18)
  ).toString();
  const marketReferenceCurrencyDecimals = 18;

  const formattedPoolReserves = formatReserves({
    reserves: reservesArray,
    currentTimestamp,
    marketReferenceCurrencyDecimals: marketReferenceCurrencyDecimals,
    marketReferencePriceInUsd: marketReferenceCurrencyPriceInUsd,
  });

  const userSummary = formatUserSummary({
    currentTimestamp,
    marketReferencePriceInUsd: marketReferenceCurrencyPriceInUsd,
    marketReferenceCurrencyDecimals: marketReferenceCurrencyDecimals,
    userReserves: userReservesArray,
    formattedReserves: formattedPoolReserves,
    userEmodeCategoryId: 0,
  });
  return userSummary;
};
