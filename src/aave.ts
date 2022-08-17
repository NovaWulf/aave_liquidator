import { TOKEN_LIST } from './chains.js';

export const ALLOWED_LIQUIDATION = 0.5; //50% of a borrowed asset can be liquidated
const HEALTH_FACTOR_MAX = 1; //liquidation can happen when less than 1
export const BONUS_THRESHOLD = 0.1 * 10 ** 18; //in eth. A bonus below this will be ignored
export const FLASH_LOAN_FEE = 0.009;

export type AaveLoanSummary = {
  userId: string;
  healthFactor: number;
  maxCollateralSymbol: string;
  maxBorrowedSymbol: string;
  maxBorrowedPrincipal: number;
  maxBorrowedPriceInEth: number;
  maxCollateralBonus: number;
  maxCollateralPriceInEth: number;
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

export function parseUnhealthyLoans(users: AaveUser[]): AaveLoanSummary[] {
  const unhealthy: AaveLoanSummary[] = [];

  users.forEach((user) => {
    let totalBorrowed = 0;
    let totalCollateralThreshold = 0;
    let maxBorrowedSymbol: string;
    let maxBorrowedPrincipal = 0;
    let maxBorrowedPriceInEth = 0;
    let maxCollateralSymbol: string;
    let maxCollateralBonus = 0;
    let maxCollateralPriceInEth = 0;

    // loop through all borrow and add up total borrowed in eth
    // keep track of the largest borrow
    user.borrowReserve.forEach((borrowReserve) => {
      const principalBorrowed = parseInt(borrowReserve.currentTotalDebt);

      const { reserve } = borrowReserve;
      const priceInEth = parseInt(reserve.price.priceInEth);
      totalBorrowed +=
        (priceInEth * principalBorrowed) / 10 ** reserve.decimals;
      if (principalBorrowed > maxBorrowedPrincipal) {
        maxBorrowedSymbol = reserve.symbol;
        maxBorrowedPrincipal = principalBorrowed;
        maxBorrowedPriceInEth = priceInEth;
      }
    });

    // for each collateral, calculate the amount, liquidation threshold and bonus\
    // and the total collateral threshold

    user.collateralReserve.forEach((collateralReserve) => {
      const principalATokenBalance = parseInt(
        collateralReserve.currentATokenBalance,
      );

      const { reserve } = collateralReserve;

      const priceInEth = parseInt(reserve.price.priceInEth);
      const reserveLiquidationThreshold = parseInt(
        reserve.reserveLiquidationThreshold,
      );
      const reserveLiquidationBonus = parseInt(reserve.reserveLiquidationBonus);

      totalCollateralThreshold +=
        (priceInEth *
          principalATokenBalance *
          (reserveLiquidationThreshold / 10000)) /
        10 ** collateralReserve.reserve.decimals;

      // track the best collateral to liquidate
      if (reserveLiquidationBonus > maxCollateralBonus) {
        maxCollateralSymbol = reserve.symbol;
        maxCollateralBonus = reserveLiquidationBonus;
        maxCollateralPriceInEth = priceInEth;
      }
    });

    const healthFactor = totalCollateralThreshold / totalBorrowed;

    if (healthFactor <= HEALTH_FACTOR_MAX) {
      unhealthy.push({
        userId: user.id,
        healthFactor: healthFactor,
        maxCollateralSymbol: maxCollateralSymbol,
        maxBorrowedSymbol: maxBorrowedSymbol,
        maxBorrowedPrincipal: maxBorrowedPrincipal,
        maxBorrowedPriceInEth: maxBorrowedPriceInEth,
        maxCollateralBonus: maxCollateralBonus / 10000,
        maxCollateralPriceInEth: maxCollateralPriceInEth,
      });
    }
  });
  console.log(`Found ${unhealthy.length} unhealthy loans`);

  return unhealthy;
}

// is the bonus on 50% of the biggest loan greater than .1 ETH?
export function minBonus(loans: AaveLoanSummary[]) {
  return loans.filter((loan) => {
    const liquidationAmount =
      loan.maxBorrowedPrincipal *
      ALLOWED_LIQUIDATION *
      (loan.maxBorrowedPriceInEth /
        10 ** TOKEN_LIST[loan.maxBorrowedSymbol].decimals);
    const loanProfit = liquidationAmount * (loan.maxCollateralBonus - 1.0);

    console.log('ETH Profit: ' + loanProfit / 10 ** 18);

    return loanProfit >= BONUS_THRESHOLD;
  });
}

// percent is represented as a number less than 1 ie 0.75 is equivalent to 75%
// multiply base and percent and return a BigInt
export function percentBigInt(base: bigint, percent: number): bigint {
  return BigInt((base * BigInt(percent * 10000)) / 10000n);
}
