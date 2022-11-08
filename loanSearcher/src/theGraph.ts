// eslint-disable-next-line @typescript-eslint/no-var-requires
import fetch from 'node-fetch';
import { AaveUser } from './aave.js';

const THE_GRAPH_URL_KOVAN =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v2-kovan';
const THE_GRAPH_URL_MAINNET =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v2';
const THE_GRAPH_URL_OPTIMISM_RINKEBY_V3 =
  'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-arbitrum-rinkeby';

const aaveInternalQuery = `id
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
}`;

type GetLoanArgs = {
  tryAmount?: number;
  maxLoops?: number;
  blockNumber?: number;
  orderDirection?: string;
};

export const getLoans = async function (
  args: GetLoanArgs,
): Promise<AaveUser[]> {
  const {
    tryAmount = 100,
    maxLoops = 6,
    orderDirection = 'desc',
    blockNumber,
  } = args;
  // console.log(process.env.CHAIN);
  const blockQuery = blockNumber ? `block: {number: ${blockNumber}}` : '';

  const userData: AaveUser[] = [];

  let count = 0;
  while (count < maxLoops) {
    const query = `
    query GET_LOANS {
      users(first:${tryAmount}, skip:${
      tryAmount * count
    }, orderBy: id, orderDirection: ${orderDirection}, where: {borrowedReservesCount_gt: 0}, ${blockQuery}) {
        ${aaveInternalQuery}
      }
    }`;
    const data = (await queryTheGraph(query)) as any;
    userData.push(...data.data.users);
    count++;
  }
  return userData;
};

type GetUserLoanArgs = {
  userId: string;
  blockNumber?: number;
};

export const getUserLoans = async function (
  args: GetUserLoanArgs,
): Promise<AaveUser[]> {
  const { userId, blockNumber } = args;
  if (!userId) throw new Error('userId required for getUserLoans');

  if (process.env.CHAIN != 'mainnet') {
    console.log(process.env.CHAIN);
  }

  const userData: AaveUser[] = [];
  const blockQuery = blockNumber ? `block: {number: ${blockNumber}}` : '';
  const query = `
  {
    user(id: "${userId}", ${blockQuery}) {
     ${aaveInternalQuery}
    }
  }`;

  const data = (await queryTheGraph(query)) as any;

  userData.push(data.data.user);

  return userData;
};

const queryTheGraph = async (query: string) => {
  const response: any = await fetch(getTheGraphUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const data = (await response.json()) as any;
  return data;
};

const getTheGraphUrl = function () {
  switch (process.env.CHAIN) {
    case 'mainnet':
      return THE_GRAPH_URL_MAINNET;
    case 'kovan':
      return THE_GRAPH_URL_KOVAN;
    case 'optimism-rinkeby':
      return THE_GRAPH_URL_OPTIMISM_RINKEBY_V3;

    default:
      return THE_GRAPH_URL_MAINNET;
  }
};
