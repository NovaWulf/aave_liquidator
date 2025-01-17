import { TokenAmount } from '@uniswap/sdk';
import { setTokenList, TOKEN_LIST } from '../../src/chains.js';
import { useTradeExactIn } from '../../src/uniswap/trades.js';

describe('#bestTrade', () => {
  setTokenList();

  const tokenAmountIn = new TokenAmount(
    TOKEN_LIST['DAI'],
    1000000000000000000n,
  );

  const tokenOut = TOKEN_LIST['UNI'];

  it('finds a trade', async () => {
    const bestTrade = await useTradeExactIn(tokenAmountIn, tokenOut);
    expect(bestTrade).toBeTruthy();

    // console.log(`useTradeExactIn path: ${showPath(bestTrade)}`);
    // console.log(`useTradeExactIn output: ${bestTrade.outputAmount.toFixed(9)}`);
    // console.log(bestTrade.outputAmount.toFixed(9));

    // const { numerator, denominator } = bestTrade.outputAmount;

    // const minimumTokensAfterSwap =
    //   (BigInt(String(numerator)) * BigInt(10 ** 18)) /
    //   BigInt(String(denominator));
    // console.log(`useTradeExactIn tokens out: ${minimumTokensAfterSwap}`);
  });

  // it('#simpleTrade', async () => {
  //   const bestTrade = await simpleTrade(tokenAmountIn, tokenOut);
  //   expect(bestTrade).toBeTruthy();

  //   console.log(`simple path: ${showPath(bestTrade)}`);
  //   console.log(`simple output: ${bestTrade.outputAmount.toFixed(9)}`);
  //   const { numerator, denominator } = bestTrade.outputAmount;

  //   // JSON.stringify(bestTrade, null, 2);
  //   const minimumTokensAfterSwap =
  //     (BigInt(String(numerator)) * BigInt(10 ** 18)) /
  //     BigInt(String(denominator));
  //   console.log(`simple tokens out: ${minimumTokensAfterSwap}`);
  // });
});
