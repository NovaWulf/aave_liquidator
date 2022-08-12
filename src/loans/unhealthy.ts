// import { v2 } from '@aave/protocol-js';

// const ALLOWED_LIQUIDATION = 0.5; //50% of a borrowed asset can be liquidated
const HEALTH_FACTOR_MAX = 1; //liquidation can happen when less than 1
export const PROFIT_THRESHOLD = 0.1 * 10 ** 18; //in eth. A bonus below this will be ignored

type UnhealthyLoanSummary = {
  userId: string;
  healthFactor: number;
  max_collateralSymbol: string;
  max_borrowedSymbol: string;
  max_borrowedPrincipal: number;
  max_borrowedPriceInEth: number;
  max_collateralBonus: number;
  max_collateralPriceInEth: number;
};

export type AaveUser = {
  id: string;
  borrowedReservesCount: number;
  collateralReserve: {
    currentATokenBalance: string;
    reserve: {
      usageAsCollateralEnabled: boolean;
      reserveLiquidationThreshold: string;
      reserveLiquidationBonus: string;
      borrowingEnabled: boolean;
      utilizationRate: string;
      symbol: string;
      underlyingAsset: string;
      price: {
        priceInEth: string;
      };
      decimals: number;
    };
  }[];

  borrowReserve: {
    currentTotalDebt: string;
    reserve: {
      usageAsCollateralEnabled: boolean;
      reserveLiquidationThreshold: string;
      borrowingEnabled: boolean;
      utilizationRate: string;
      symbol: string;
      underlyingAsset: string;
      price: {
        priceInEth: string;
      };
      decimals: number;
    };
  }[];
};

export function parseUnhealthyLoans(users: AaveUser[]): UnhealthyLoanSummary[] {
  console.log('unhealthy parsing');

  const unhealthy: UnhealthyLoanSummary[] = [];

  users.forEach((user) => {
    let totalBorrowed = 0;
    // let totalCollateral = 0;
    let totalCollateralThreshold = 0;
    let max_borrowedSymbol;
    let max_borrowedPrincipal = 0;
    let max_borrowedPriceInEth = 0;
    let max_collateralSymbol;
    let max_collateralBonus = 0;
    let max_collateralPriceInEth = 0;

    user.borrowReserve.forEach((borrowReserve) => {
      const priceInEth = parseInt(borrowReserve.reserve.price.priceInEth);
      const principalBorrowed = parseInt(borrowReserve.currentTotalDebt);
      totalBorrowed +=
        (priceInEth * principalBorrowed) / 10 ** borrowReserve.reserve.decimals;
      if (principalBorrowed > max_borrowedPrincipal)
        max_borrowedSymbol = borrowReserve.reserve.symbol;
      max_borrowedPrincipal = principalBorrowed;
      max_borrowedPriceInEth = priceInEth;
    });

    user.collateralReserve.forEach((collateralReserve) => {
      const priceInEth = parseInt(collateralReserve.reserve.price.priceInEth);
      const principalATokenBalance = parseInt(
        collateralReserve.currentATokenBalance,
      );
      const reserveLiquidationThreshold = parseInt(
        collateralReserve.reserve.reserveLiquidationThreshold,
      );
      const reserveLiquidationBonus = parseInt(
        collateralReserve.reserve.reserveLiquidationBonus,
      );

      // totalCollateral +=
      //   (priceInEth * principalATokenBalance) /
      //   10 ** collateralReserve.reserve.decimals;
      totalCollateralThreshold +=
        (priceInEth *
          principalATokenBalance *
          (reserveLiquidationThreshold / 10000)) /
        10 ** collateralReserve.reserve.decimals;
      if (reserveLiquidationBonus > max_collateralBonus) {
        max_collateralSymbol = collateralReserve.reserve.symbol;
        max_collateralBonus = reserveLiquidationBonus;
        max_collateralPriceInEth = priceInEth;
      }
    });

    const healthFactor = totalCollateralThreshold / totalBorrowed;

    if (healthFactor <= HEALTH_FACTOR_MAX) {
      unhealthy.push({
        userId: user.id,
        healthFactor: healthFactor,
        max_collateralSymbol: max_collateralSymbol,
        max_borrowedSymbol: max_borrowedSymbol,
        max_borrowedPrincipal: max_borrowedPrincipal,
        max_borrowedPriceInEth: max_borrowedPriceInEth,
        max_collateralBonus: max_collateralBonus / 10000,
        max_collateralPriceInEth: max_collateralPriceInEth,
      });
    }
  });

  return unhealthy;
}
