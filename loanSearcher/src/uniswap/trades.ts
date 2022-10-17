import {
  TokenAmount,
  Token,
  Trade,
  Pair,
  ChainId,
  ETHER,
  WETH,
  Percent,
  currencyEquals,
  Fetcher,
} from '@uniswap/sdk';
import { BASES_TO_CHECK_TRADES_AGAINST } from '../chains.js';
import { provider } from '../utils/alchemy.js';
import { usePairReserves } from './reserves.js';

const ZERO_PERCENT = new Percent('0');
const ONE_HUNDRED_PERCENT = new Percent('1');
const MAX_HOPS = 3;

export async function simpleTrade(
  tokenAmountIn?: TokenAmount,
  tokenOut?: Token,
): Promise<Trade | null> {
  const pair = await Fetcher.fetchPairData(
    tokenAmountIn.token,
    tokenOut,
    provider(),
  );
  const bestTrade = Trade.bestTradeExactIn([pair], tokenAmountIn, tokenOut, {
    maxHops: 3,
    maxNumResults: 1,
  });
  console.log(bestTrade[0]);

  return bestTrade[0];
}

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
export async function useTradeExactIn(
  tokenAmountIn?: TokenAmount,
  tokenOut?: Token,
): Promise<Trade | null> {
  const allowedPairs = await useAllCommonPairs(tokenAmountIn?.token, tokenOut);
  // console.log(`allowed pairs: ${allowedPairs.length}`);
  // console.log(`allowed pairs ${JSON.stringify(allowedPairs, null, 2)}`);

  const singleHopOnly = false;
  if (tokenAmountIn && tokenOut && allowedPairs.length > 0) {
    if (singleHopOnly) {
      return (
        Trade.bestTradeExactIn(allowedPairs, tokenAmountIn, tokenOut, {
          maxHops: 1,
          maxNumResults: 1,
        })[0] ?? null
      );
    }
    // search through trades with varying hops, find best trade out of them
    let bestTradeSoFar: Trade | null = null;
    for (let i = 1; i <= MAX_HOPS; i++) {
      const currentTrade: Trade | null =
        Trade.bestTradeExactIn(allowedPairs, tokenAmountIn, tokenOut, {
          maxHops: i,
          maxNumResults: 1,
        })[0] ?? null;
      // if current trade is best yet, save it
      if (isTradeBetter(bestTradeSoFar, currentTrade)) {
        bestTradeSoFar = currentTrade;
      }
    }
    //console.log(`bestTradeSoFar ${JSON.stringify(bestTradeSoFar,null,2)}`)
    //console.log(`inputAmount ${bestTradeSoFar.inputAmount.toSignificant(8)}`)
    //console.log(`outputAmount ${bestTradeSoFar.outputAmount.toSignificant(8)}`)
    //console.log(`executionPrice ${bestTradeSoFar.executionPrice.toSignificant(8)}`)
    return bestTradeSoFar;
  }
  return null;
}

export async function useAllCommonPairs(
  token1?: Token,
  token2?: Token,
): Promise<Pair[]> {
  if (!token1.chainId || !token2.chainId || token1.chainId != token2.chainId) {
    throw new Error('missing token or chain');
  }
  const chainId = token1.chainId;
  const bases: Token[] = chainId ? BASES_TO_CHECK_TRADES_AGAINST[chainId] : [];

  const [tokenA, tokenB] = [
    wrappedCurrency(token1, chainId),
    wrappedCurrency(token2, chainId),
  ];

  const basePairs: [Token, Token][] = bases
    .flatMap((base): [Token, Token][] =>
      bases.map((otherBase) => [base, otherBase]),
    )
    .filter(([t0, t1]) => t0.address !== t1.address);

  const allPairCombinations: [Token, Token][] =
    tokenA && tokenB
      ? [
          // the direct pair
          [tokenA, tokenB],
          // token A against all bases
          ...bases.map((base): [Token, Token] => [tokenA, base]),
          // token B against all bases
          ...bases.map((base): [Token, Token] => [tokenB, base]),
          // each base against all bases
          ...basePairs,
        ]
          .filter((tokens): tokens is [Token, Token] =>
            Boolean(tokens[0] && tokens[1]),
          ) // both exist
          .filter(([t0, t1]) => t0.address !== t1.address) //not the same
      : [];

  const allPairReserves = await usePairReserves(allPairCombinations, chainId);

  // only pass along valid pairs, non-duplicated pairs
  return Object.values(
    allPairReserves
      // filter out duplicated pairs
      .reduce<{ [pairAddress: string]: Pair }>((memo, curr) => {
        memo[curr.liquidityToken.address] =
          memo[curr.liquidityToken.address] ?? curr;
        return memo;
      }, {}),
  );
}

export function wrappedCurrency(
  token: Token | undefined,
  chainId: ChainId | undefined,
): Token {
  return chainId && token === ETHER ? WETH[chainId] : token;
}

function isTradeBetter(
  tradeA: Trade | undefined | null,
  tradeB: Trade | undefined | null,
  minimumDelta: Percent = ZERO_PERCENT,
): boolean | undefined {
  if (tradeA && !tradeB) return false;
  if (tradeB && !tradeA) return true;
  if (!tradeA || !tradeB) return undefined;

  if (
    tradeA.tradeType !== tradeB.tradeType ||
    !currencyEquals(tradeA.inputAmount.currency, tradeB.inputAmount.currency) ||
    !currencyEquals(tradeB.outputAmount.currency, tradeB.outputAmount.currency)
  ) {
    throw new Error('Trades are not comparable');
  }

  if (minimumDelta.equalTo(ZERO_PERCENT)) {
    return tradeA.executionPrice.lessThan(tradeB.executionPrice);
  } else {
    return tradeA.executionPrice.raw
      .multiply(minimumDelta.add(ONE_HUNDRED_PERCENT))
      .lessThan(tradeB.executionPrice);
  }
}

export function showPath(trade: Trade) {
  let pathSymbol = '';
  const pathAddress = [];
  trade.route.path.map(async (token) => {
    pathSymbol += token.symbol + '->';
    pathAddress.push(token.address);
  });
  pathSymbol = pathSymbol.slice(0, -2);
  return `${pathSymbol} ${JSON.stringify(pathAddress)}`;
  // return [pathSymbol, pathAddress];
}

export function getPathAddresses(trade: Trade): string[] {
  return trade.route.path.map((token) => token.address);
}
