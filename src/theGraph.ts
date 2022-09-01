// eslint-disable-next-line @typescript-eslint/no-var-requires
import fetch from 'node-fetch';
import { AaveUser } from './aave.js';

console.log(process.env.CHAIN);

const THE_GRAPH_URL_KOVAN =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v2-kovan';
const THE_GRAPH_URL_MAINNET =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v2';

export const getLoans = async function (
  tryAmount: number,
  maxLoops = 6,
  userId?: string,
): Promise<AaveUser[]> {
  const userData: AaveUser[] = [];

  let count = 0;
  let maxCount = maxLoops;
  const THE_GRAPH_URL =
    process.env.CHAIN == 'mainnet'
      ? THE_GRAPH_URL_MAINNET
      : THE_GRAPH_URL_KOVAN;

  let userIdQuery = '';
  if (userId) {
    userIdQuery = `id: "${userId}",`;
    maxCount = 1;
  }

  while (count < maxCount) {
    const response: any = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
      query GET_LOANS {
        users(first:${tryAmount}, skip:${
          tryAmount * count
        }, orderBy: id, orderDirection: desc, where: {${userIdQuery}borrowedReservesCount_gt: 0}) {
          id
          borrowedReservesCount
          collateralReserve:reserves(where: {currentATokenBalance_gt: 0}) {
            currentATokenBalance
            reserve{
              usageAsCollateralEnabled
              reserveLiquidationThreshold
              reserveLiquidationBonus
              borrowingEnabled
              utilizationRate
              symbol
              underlyingAsset
              price {
                priceInEth
              }
              decimals
            }
          }
          borrowReserve: reserves(where: {currentTotalDebt_gt: 0}) {
            currentTotalDebt
            reserve{
              usageAsCollateralEnabled
              reserveLiquidationThreshold
              borrowingEnabled
              utilizationRate
              symbol
              underlyingAsset
              price {
                priceInEth
              }
              decimals
            }
          }
        }
      }`,
      }),
    });

    const data = (await response.json()) as any;

    userData.push(...data.data.users);
    count++;
  }
  return userData;
};
