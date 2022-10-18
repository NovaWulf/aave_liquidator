import { AaveLoanSummary } from '../src/aave.js';
import { setTokenList } from '../src/chains.js';
import {
  excludeRecentlyAttempted,
  knownTokens,
  LiquidationParams,
  liquidationProfits,
  mostProfitableLoan,
  sortLoansbyProfit,
} from '../src/liquidations.js';
import { jest } from '@jest/globals';
import { runLiquidation } from '../src/runLiquidation.js';

describe('excluding recently attempted', () => {
  const lp1: LiquidationParams = {
    assetToLiquidate: 'UNI',
    flashAmount: 1000000000000,
    collateralAddress: '0xabc',
    userToLiquidate: '0x234',
    amountOutMin: 90,
    swapPath: ['UNI', 'WETH'],
    profitInEthAfterGas: 500,
  };
  const lp2: LiquidationParams = {
    assetToLiquidate: 'UNI',
    flashAmount: 1000000000000,
    collateralAddress: '0xabc',
    userToLiquidate: '0x345',
    amountOutMin: 90,
    swapPath: ['UNI', 'WETH'],
    profitInEthAfterGas: 600,
  };

  it('excludes', () => {
    runLiquidation(lp1);
    expect(excludeRecentlyAttempted([lp1, lp2])).toEqual([lp2]);
  });
});

describe('sorting liquidation params', () => {
  const lp1: LiquidationParams = {
    assetToLiquidate: 'UNI',
    flashAmount: 1000000000000,
    collateralAddress: '0xabc',
    userToLiquidate: '0x234',
    amountOutMin: 90,
    swapPath: ['UNI', 'WETH'],
    profitInEthAfterGas: 500,
  };
  const lp2: LiquidationParams = {
    assetToLiquidate: 'UNI',
    flashAmount: 1000000000000,
    collateralAddress: '0xabc',
    userToLiquidate: '0x345',
    amountOutMin: 90,
    swapPath: ['UNI', 'WETH'],
    profitInEthAfterGas: 600,
  };

  it('sorts by expected profit', () => {
    expect(sortLoansbyProfit([lp1, lp2])).toEqual([lp2, lp1]);
  });
});

// test for mostProfitableLoan

describe('#mostProfitableLoan', () => {
  // the user IDs are real the rest of the data fake.

  const lp1: LiquidationParams = {
    assetToLiquidate: 'UNI',
    flashAmount: 1000000000000,
    collateralAddress: '0xabc',
    userToLiquidate: '0xf69f061646e0dcc54c4cf8b9b7b935e0485b2614',
    amountOutMin: 90,
    swapPath: ['UNI', 'WETH'],
    profitInEthAfterGas: 500,
  };
  const lp2: LiquidationParams = {
    assetToLiquidate: 'UNI',
    flashAmount: 1000000000000,
    collateralAddress: '0xf72a2caa677b90b0ae449af1318f1b80344ae97c',
    userToLiquidate: '0x234',
    amountOutMin: 90,
    swapPath: ['UNI', 'WETH'],
    profitInEthAfterGas: 600,
  };

  it('selects the most profitable', async () => {
    // these both have HFs below 1, so return the first
    expect(await mostProfitableLoan([lp1, lp2])).toEqual(lp1);
  });
});

describe('#knownTokens', () => {
  const ls1: AaveLoanSummary = {
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
  const ls2: AaveLoanSummary = {
    userId: '0xffff8941130157a0153fb5be2618b257f28d3b55',
    healthFactor: 1.311947614042801,
    maxCollateralSymbol: 'WETH',
    maxBorrowedSymbol: 'DAIXXX', // note fake symbol
    maxBorrowedPrincipal: 2.379851736894203e22,
    maxBorrowedPriceInEth: 542907290000000,
    maxBorrowedDecimals: 18,
    maxCollateralBonus: 1.05,
    maxCollateralPriceInEth: 1000000000000000000,
    maxCollateralDecimals: 18,
  };

  it('filters out unknown symbols', () => {
    setTokenList();
    expect(knownTokens([ls1, ls2])).toEqual([ls1]);
  });
});

describe('#liquidationProfit', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  const unhealthyLoan: AaveLoanSummary = {
    userId: '0x8a8967428b96b9c64d5f578b25ab20c378abb896',
    healthFactor: 1.001661751119138,
    maxCollateralSymbol: 'WETH',
    maxBorrowedSymbol: 'WETH',
    maxBorrowedPrincipal: 60003262283279190000,
    maxBorrowedPriceInEth: 1000000000000000000,
    maxBorrowedDecimals: 18,
    maxCollateralBonus: 1.05,
    maxCollateralPriceInEth: 1000000000000000000,
    maxCollateralDecimals: 18,
  };

  const expectedResult = {
    amountOutMin: expect.any(BigInt),
    assetToLiquidate: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    collateralAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    flashAmount: 30001631141639593984n,
    profitInEthAfterGas: expect.any(BigInt),
    swapPath: expect.arrayContaining([
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ]),
    userToLiquidate: '0x8a8967428b96b9c64d5f578b25ab20c378abb896',
  };

  it('is profitable', async () => {
    process.env.TEST_BLOCK_NUMBER = '14367536';
    setTokenList();
    const liqParams = await liquidationProfits([unhealthyLoan]);
    expect(liqParams[0]).toMatchObject(expectedResult);
  });
});
