export const ALLOWED_LIQUIDATION = 0.5; //50% of a borrowed asset can be liquidated
const HEALTH_FACTOR_MAX = 1.01; // sometimes thegraph is slightly delayed so lets test if within 1%
export const FLASH_LOAN_FEE = 0.009;

export type AaveLoanSummary = {
  userId: string;
  healthFactor: number;
  maxCollateralSymbol: string;
  maxBorrowedSymbol: string;
  maxBorrowedPrincipal: number;
  maxBorrowedPriceInEth: number;
  maxBorrowedDecimals: number;
  maxCollateralBonus: number;
  maxCollateralPriceInEth: number;
  maxCollateralDecimals: number;
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

export function mapLoans(users: AaveUser[]): AaveLoanSummary[] {
  const summaries: AaveLoanSummary[] = [];

  for (const user of users) {
    let totalBorrowed = 0;
    let totalCollateralThreshold = 0;
    let maxBorrowedSymbol: string;
    let maxBorrowedPrincipal = 0;
    let maxBorrowedPriceInEth = 0;
    let maxBorrowedDecimals = 0;
    let maxCollateralSymbol: string;
    let maxCollateralBonus = 0;
    let maxCollateralPriceInEth = 0;
    let maxCollateralDecimals = 0;

    // loop through all borrow and add up total borrowed in eth
    // keep track of the largest borrow
    for (const borrowReserve of user.borrowReserve) {
      const principalBorrowed = parseInt(borrowReserve.currentTotalDebt);

      const { reserve } = borrowReserve;
      const priceInEth = parseInt(reserve.price.priceInEth);
      totalBorrowed +=
        (priceInEth * principalBorrowed) / 10 ** reserve.decimals;
      if (principalBorrowed > maxBorrowedPrincipal) {
        maxBorrowedSymbol = reserve.symbol;
        maxBorrowedPrincipal = principalBorrowed;
        maxBorrowedPriceInEth = priceInEth;
        maxBorrowedDecimals = reserve.decimals;
      }
    }

    // for each collateral, calculate the amount, liquidation threshold and bonus\
    // and the total collateral threshold

    for (const collateralReserve of user.collateralReserve) {
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
        maxCollateralDecimals = reserve.decimals;
      }
    }

    const healthFactor = totalCollateralThreshold / totalBorrowed;

    if (maxCollateralPriceInEth == 0) {
      console.log(
        `skipping userId: ${user.id} because collateral: ${maxCollateralSymbol} has a ETH price of 0`,
      );
      continue; // skip this user
    }
    // console.log(`Health Factor: ${healthFactor}`);

    summaries.push({
      userId: user.id,
      healthFactor: healthFactor,
      maxCollateralSymbol: maxCollateralSymbol,
      maxBorrowedSymbol: maxBorrowedSymbol,
      maxBorrowedPrincipal: maxBorrowedPrincipal,
      maxBorrowedPriceInEth: maxBorrowedPriceInEth,
      maxBorrowedDecimals: maxBorrowedDecimals,
      maxCollateralBonus: maxCollateralBonus / 10000,
      maxCollateralPriceInEth: maxCollateralPriceInEth,
      maxCollateralDecimals: maxCollateralDecimals,
    });
  }
  return summaries;
}

export async function parseUnhealthyLoans(
  users: AaveLoanSummary[],
): Promise<AaveLoanSummary[]> {
  const unhealthy: AaveLoanSummary[] = [];

  for (const user of users) {
    if (user.healthFactor <= HEALTH_FACTOR_MAX) {
      unhealthy.push(user);

      // THIS IS TOO SLOW
      // FIXME: should we eject if we find a single actual health factor < 1?

      // let's double check against the blockchain
      // we don't always do this because it's expensive (timewise)
      // const aaveSummary = await getUserHealthFactor(user.userId);
      // const actualHealthFactor = parseFloat(aaveSummary.healthFactor);
      // console.log(
      //   `Actual Health Factor for ${user.userId}: ${actualHealthFactor}`,
      // );
      // if (actualHealthFactor <= 1.0) {
      //   unhealthy.push(user);
      // }
    }
  }
  console.log(`Found ${unhealthy.length} unhealthy loans`);

  return unhealthy;
}

// is the bonus on 50% of the biggest loan greater than .1 ETH?
export function minBonus(loans: AaveLoanSummary[]): AaveLoanSummary[] {
  const threshold = parseFloat(process.env.BONUS_THRESHOLD);
  const BONUS_THRESHOLD = threshold * 10 ** 18; //in eth. A bonus below this will be ignored

  const filteredLoans = loans.filter((loan) => {
    const liquidationAmount =
      loan.maxBorrowedPrincipal *
      ALLOWED_LIQUIDATION *
      (loan.maxBorrowedPriceInEth / 10 ** loan.maxBorrowedDecimals);
    const loanProfit = liquidationAmount * (loan.maxCollateralBonus - 1.0);

    // console.log('ETH Profit: ' + loanProfit / 10 ** 18);

    return loanProfit >= BONUS_THRESHOLD;
  });
  console.log(
    `Found ${filteredLoans.length} loans with a liquidatable loan over ${threshold} ETH`,
  );
  return filteredLoans;
}

export function applyBlackList(loans: AaveLoanSummary[]): AaveLoanSummary[] {
  // some users remain in a bad state in the graph
  const blacklist = [
    '0xf37680f16b92747ee8537a7e2ccb0e51a7c52a64',
    '0xeb7a8f768b7ec4276bd440ebb652538750ab1203',
  ];
  return loans.filter((l) => !blacklist.includes(l.userId));
}
