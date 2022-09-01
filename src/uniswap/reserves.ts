import { ChainId, Fetcher, Pair, Token } from '@uniswap/sdk';
import { wrappedCurrency } from './trades.js';

export async function usePairReserves(
  currencies: [Token | undefined, Token | undefined][],
  chainId: ChainId,
): Promise<Pair[]> {
  //convert to to wrapped tokens where needed
  const tokens: [Token, Token][] = currencies.map(([currencyA, currencyB]) => [
    wrappedCurrency(currencyA, chainId),
    wrappedCurrency(currencyB, chainId),
  ]);
  //convert to pairs and get their reserves
  const reserves = await getReserves(tokens);
  //filter out nulls
  const reserves_cleansed = reserves.filter((result) => !!result);
  // console.log(`reserves ${JSON.stringify(reserves, null, 2)}`);
  return reserves_cleansed;
}

async function getReserves(tokens: [Token, Token][]): Promise<Pair[]> {
  const results = await Promise.all(
    tokens.map(async ([tokenA, tokenB]) => {
      if (tokenA && tokenB && tokenA.equals(tokenB)) {
        return null;
      }
      //console.log (`tokenA ${tokenA.symbol} tokenB ${tokenB.symbol}`)
      try {
        const pairDetails = await Fetcher.fetchPairData(tokenA, tokenB);
        return pairDetails;
      } catch (e) {
        return null;
      }
    }),
  );
  return results;
}
