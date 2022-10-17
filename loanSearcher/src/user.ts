import * as dotenv from 'dotenv';
import { setTokenList } from './chains.js';
import { findProfitableLoan } from './searcher.js';
import { getUserLoans } from './theGraph.js';
import { getGas } from './utils/gas.js';

dotenv.config();

run();

export async function run(): Promise<void> {
  console.log(`Fetching loans from: ${process.env.CHAIN}`);

  setTokenList(); // relies on env vars so needs to be run at runtime

  await getGas(); // get this once per loop
  const userLoans = await getUserLoans({
    userId: process.env.TEST_USER_TO_LIQUIDATE,
    blockNumber: parseInt(process.env.TEST_BLOCK_NUMBER),
  });
  await findProfitableLoan(userLoans);
}
