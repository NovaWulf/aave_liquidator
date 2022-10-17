import { TokenAmount } from '@uniswap/sdk';
import { setTokenList, TOKEN_LIST } from '../../src/chains.js';
import { useTradeExactIn } from '../../src/uniswap/trades.js';

describe('#bestTrade', () => {
  setTokenList();

  const tokenAmountIn = new TokenAmount(TOKEN_LIST['UNI'], 100000000000000000n);

  const tokenOut = TOKEN_LIST['DAI'];

  it('finds a trade', async () => {
    const bestTrade = await useTradeExactIn(tokenAmountIn, tokenOut);
    expect(bestTrade).toBeTruthy();
  });
});
