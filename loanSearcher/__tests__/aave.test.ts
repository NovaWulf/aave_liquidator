import {
  AaveLoanSummary,
  applyBlackList,
  mapLoans,
  minBonus,
  parseUnhealthyLoans,
} from '../src/aave.js';

describe('mocked healthy loan', () => {
  const mappedLoan = {
    userId: '0xffff8941130157a0153fb5be2618b257f28d3b55',
    healthFactor: 1.311947614042801,
    maxCollateralSymbol: 'WETH',
    maxBorrowedSymbol: 'DAI',
    maxBorrowedPrincipal: 2.379851736894203e22,
    maxBorrowedPriceInEth: 542907290000000,
    maxBorrowedDecimals: 18,
    maxCollateralBonus: 1.05,
    maxCollateralPriceInEth: 1000000000000000000,
    maxCollateralDecimals: 18,
  };

  const user = {
    id: '0xffff8941130157a0153fb5be2618b257f28d3b55',
    borrowedReservesCount: 2,
    collateralReserve: [
      {
        currentATokenBalance: '28000526989655924616',
        reserve: {
          usageAsCollateralEnabled: true,
          reserveLiquidationThreshold: '8500',
          reserveLiquidationBonus: '10500',
          borrowingEnabled: true,
          utilizationRate: '0.57855859',
          symbol: 'WETH',
          underlyingAsset: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          price: {
            priceInEth: '1000000000000000000',
          },
          decimals: 18,
        },
      },
    ],
    borrowReserve: [
      {
        currentTotalDebt: '23798517368942026580572',
        reserve: {
          usageAsCollateralEnabled: true,
          reserveLiquidationThreshold: '8000',
          borrowingEnabled: true,
          utilizationRate: '0.21639186',
          symbol: 'DAI',
          underlyingAsset: '0x6b175474e89094c44da98b954eedeac495271d0f',
          price: {
            priceInEth: '542907290000000',
          },
          decimals: 18,
        },
      },
      {
        currentTotalDebt: '9541843169',
        reserve: {
          usageAsCollateralEnabled: true,
          reserveLiquidationThreshold: '8800',
          borrowingEnabled: true,
          utilizationRate: '0.29154981',
          symbol: 'USDC',
          underlyingAsset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          price: {
            priceInEth: '547160649134404',
          },
          decimals: 6,
        },
      },
    ],
  };

  it('maps correctly', () => {
    expect(mapLoans([user])[0]).toEqual(mappedLoan);
  });

  it('returns loan count', async () => {
    const unhealthy = await parseUnhealthyLoans([mappedLoan]);
    expect(unhealthy.length).toEqual(0);
  });
});

describe('mocked unhealthy loan', () => {
  const user = {
    id: '0xffff8941130157a0153fb5be2618b257f28d3b55',
    borrowedReservesCount: 2,
    collateralReserve: [
      {
        currentATokenBalance: '2800052698965592461', // removed a digit
        reserve: {
          usageAsCollateralEnabled: true,
          reserveLiquidationThreshold: '8500',
          reserveLiquidationBonus: '10500',
          borrowingEnabled: true,
          utilizationRate: '0.57855859',
          symbol: 'WETH',
          underlyingAsset: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          price: {
            priceInEth: '1000000000000000000',
          },
          decimals: 18,
        },
      },
    ],
    borrowReserve: [
      {
        currentTotalDebt: '23798517368942026580572',
        reserve: {
          usageAsCollateralEnabled: true,
          reserveLiquidationThreshold: '8000',
          borrowingEnabled: true,
          utilizationRate: '0.21639186',
          symbol: 'DAI',
          underlyingAsset: '0x6b175474e89094c44da98b954eedeac495271d0f',
          price: {
            priceInEth: '542907290000000',
          },
          decimals: 18,
        },
      },
      {
        currentTotalDebt: '9541843169',
        reserve: {
          usageAsCollateralEnabled: true,
          reserveLiquidationThreshold: '8800',
          borrowingEnabled: true,
          utilizationRate: '0.29154981',
          symbol: 'USDC',
          underlyingAsset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          price: {
            priceInEth: '547160649134404',
          },
          decimals: 6,
        },
      },
    ],
  };

  it('returns loan count', async () => {
    const unhealthy = await parseUnhealthyLoans(mapLoans([user]));

    expect(unhealthy.length).toEqual(1);
  });
});

describe('healthy loan above threshold', () => {
  it('is has a big enough bonus', () => {
    const unhealthyLoan: AaveLoanSummary = {
      userId: '0xabc',
      healthFactor: 0.13119476140428013,
      maxCollateralSymbol: 'WETH',
      maxBorrowedSymbol: 'DAI',
      maxBorrowedPrincipal: 2.379851736894203e22,
      maxBorrowedPriceInEth: 542907290000000,
      maxBorrowedDecimals: 18,
      maxCollateralBonus: 1.05,
      maxCollateralPriceInEth: 1000000000000000000,
      maxCollateralDecimals: 18,
    };

    const profitableLoans = minBonus([unhealthyLoan]);
    expect(profitableLoans.length).toEqual(1);
  });
});

describe('healthy loan with blacklisted user', () => {
  it('is has a big enough bonus', () => {
    const healthyLoan: AaveLoanSummary = {
      userId: '0xf37680f16b92747ee8537a7e2ccb0e51a7c52a64',
      healthFactor: 0.13119476140428013,
      maxCollateralSymbol: 'WETH',
      maxBorrowedSymbol: 'DAI',
      maxBorrowedPrincipal: 2.379851736894203e22,
      maxBorrowedPriceInEth: 542907290000000,
      maxBorrowedDecimals: 18,
      maxCollateralBonus: 1.05,
      maxCollateralPriceInEth: 1000000000000000000,
      maxCollateralDecimals: 18,
    };

    const loans = applyBlackList([healthyLoan]);
    expect(loans.length).toEqual(0);
  });
});

describe('unhealthy loan below threshold', () => {
  it('does not have a big enough bonus', () => {
    const unhealthyLoan: AaveLoanSummary = {
      userId: '0xabc',
      healthFactor: 0.13119476140428013,
      maxCollateralSymbol: 'WETH',
      maxBorrowedSymbol: 'DAI',
      maxBorrowedPrincipal: 2.379851736894203e22,
      maxBorrowedPriceInEth: 542907290000000,
      maxBorrowedDecimals: 18,
      maxCollateralBonus: 1.0,
      maxCollateralPriceInEth: 1000000000000000000,
      maxCollateralDecimals: 18,
    };

    const profitableLoans = minBonus([unhealthyLoan]);
    expect(profitableLoans.length).toEqual(0);
  });
});
