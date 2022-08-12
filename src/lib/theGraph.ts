// eslint-disable-next-line @typescript-eslint/no-var-requires
import fetch from 'node-fetch';
import { AaveUser } from '../loans/unhealthy.js';

const THE_GRAPH_URL_KOVAN =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v2-kovan';
const THE_GRAPH_URL_MAINNET =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v2';
const THE_GRAPH_URL =
  process.env.CHAIN == 'mainnet' ? THE_GRAPH_URL_MAINNET : THE_GRAPH_URL_KOVAN;

export const getLoans = async function (
  tryAmount: number,
  userId?: string,
): Promise<AaveUser[]> {
  // let maxCount = 6;
  console.log('hi');

  const count = 0;
  let userIdQuery = '';

  if (userId) {
    userIdQuery = `id: "${userId}",`;
    // maxCount = 1;
  }

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
  // console.log(data);

  const totalLoans = data.data.users.length;
  console.log('total loans: ' + totalLoans);
  return data.data.users;
  // const unhealthyLoans=parseUsers(res.data);
  // if(unhealthyLoans.length>0) liquidationProfits(unhealthyLoans)
  // if(total_loans>0) console.log(`Records:${total_loans} Unhealthy:${unhealthyLoans.length}`)
};
