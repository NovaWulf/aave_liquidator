// eslint-disable max-len
import { ChainId, Token, WETH } from '@uniswap/sdk';
import { chains } from './utils/rawChains.js';

type ChainTokenList = {
  readonly [chainId in ChainId]: Token[];
};

function tokenList(chainId: ChainId) {
  const filteredTokens = chains['tokens'].filter((t) => t.chainId === chainId);
  return filteredTokens.reduce(
    (obj, item) => (
      (obj[item.symbol] = new Token(
        item.chainId,
        item.address,
        item.decimals,
        item.symbol,
        item.name,
      )),
      obj
    ),
    {},
  );
}

export let TOKEN_LIST = {};

export function setTokenList(): void {
  const chainId =
    process.env.CHAIN == 'mainnet' ? ChainId.MAINNET : ChainId.KOVAN;
  TOKEN_LIST = tokenList(chainId);
}

const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.ROPSTEN]: [WETH[ChainId.ROPSTEN]],
  [ChainId.RINKEBY]: [WETH[ChainId.RINKEBY]],
  [ChainId.GÖRLI]: [WETH[ChainId.GÖRLI]],
  [ChainId.KOVAN]: [WETH[ChainId.KOVAN]],
};

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [
    ...WETH_ONLY[ChainId.MAINNET],
    ...['DAI', 'USDC', 'USDT', 'COMP', 'MKR'].map(
      (t) => tokenList(ChainId.MAINNET)[t],
    ),
  ],
};
