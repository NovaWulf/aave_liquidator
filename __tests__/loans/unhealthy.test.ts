import { parseUnhealthyLoans } from '../../src/loans/unhealthy.js';

describe('healthy loan', () => {
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
  it('returns loan count', () => {
    const unhealthy = parseUnhealthyLoans([user]);
    expect(unhealthy.length).toEqual(0);
  });
});

describe('unhealthy loan', () => {
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
  it('returns loan count', () => {
    const unhealthy = parseUnhealthyLoans([user]);
    expect(unhealthy.length).toEqual(1);
  });
});
