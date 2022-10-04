import { v2 } from '@aave/protocol-js';
import fetch from 'node-fetch';

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

const getIncentives = async () => {
  const query = `query{
    incentivizedActions {
      incentivesController {
        rewardToken
        rewardTokenSymbol
        rewardTokenDecimals
        precision
        emissionEndTimestamp
      }
    }
  }`;
  return execute(query);
};

const getPoolReserveData = async () => {
  const query = `query{
    reserves {
      id
      underlyingAsset
      name
      symbol
      decimals
      isActive
      isFrozen
      usageAsCollateralEnabled
      borrowingEnabled
      stableBorrowRateEnabled
      baseLTVasCollateral
      optimalUtilisationRate
      averageStableRate
      stableRateSlope1
      stableRateSlope2
      baseVariableBorrowRate
      variableRateSlope1
      variableRateSlope2
      liquidityIndex
      reserveLiquidationThreshold
      variableBorrowIndex
      aToken {
        id
      }
      vToken {
        id
      }
      sToken {
        id
      }
      availableLiquidity
      stableBorrowRate
      liquidityRate
      totalPrincipalStableDebt
      totalScaledVariableDebt
      reserveLiquidationBonus
      variableBorrowRate
      price {
        priceInEth
      }
      lastUpdateTimestamp
      stableDebtLastUpdateTimestamp
      reserveFactor
      aEmissionPerSecond
      vEmissionPerSecond
      sEmissionPerSecond
      aTokenIncentivesIndex
      vTokenIncentivesIndex
      sTokenIncentivesIndex
      aIncentivesLastUpdateTimestamp
      vIncentivesLastUpdateTimestamp
      sIncentivesLastUpdateTimestamp
    }
  }`;

  return execute(query);
};

const getUserReserveData = async (user: string) => {
  const query = `{
    userReserves (where: { user: "${user.toLowerCase()}"}){
      scaledATokenBalance
      reserve {
        id
        underlyingAsset
        name
        symbol
        decimals
        liquidityRate
        reserveLiquidationBonus
        lastUpdateTimestamp
      }
      usageAsCollateralEnabledOnUser
      stableBorrowRate
      stableBorrowLastUpdateTimestamp
      principalStableDebt
      scaledVariableDebt
      variableBorrowIndex
      aTokenincentivesUserIndex
      vTokenincentivesUserIndex
      sTokenincentivesUserIndex
    }
  }`;

  return execute(query);
};

// Fetch ethPriceUSD from GQL Subscription/query

export const getUserHealthFactor = async (userId: string) => {
  const poolReservesData = (await getPoolReserveData()).reserves;
  const rawUserReserves = (await getUserReserveData(userId)).userReserves;
  const incentives = (await getIncentives()).incentivizedActions[0];

  // console.log(rawUserReserves);

  const userSummary = v2.formatUserSummaryData(
    poolReservesData,
    rawUserReserves,
    userId,
    ((1 / 1900) * 10) ^ 18,
    Math.floor(Date.now() / 1000),
    {
      rewardTokenAddress: incentives.rewardToken,
      rewardTokenDecimals: incentives.rewardTokenDecimals,
      incentivePrecision: incentives.precision,
      emissionEndTimestamp: incentives.emissionEndTimestamp,
      rewardTokenPriceEth: '57237766000000000', // hardcoded, but doesn't effect health factor
    },
  );
  return userSummary;
};
