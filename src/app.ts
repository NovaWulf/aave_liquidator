import * as dotenv from 'dotenv';

import { minBonus, parseUnhealthyLoans } from './aave.js';
import { setTokenList } from './chains.js';
import { knownTokens, liquidationProfits } from './liquidations.js';
import { getLoans } from './theGraph.js';
import { getGas } from './utils/gas.js';
dotenv.config();

run();

//infinite loop calling checking for profitable loans to liquidate
async function run(): Promise<void> {
  console.log(`Fetching loans from: ${process.env.CHAIN}`);

  await getGas(); // get this ahead of time, as the value is good for each loop
  setTokenList(); // relies on env vars so needs to be run at runtime

  /* eslint-disable no-constant-condition */
  while (true) {
    const users = await getLoans(1000);
    const unhealthyLoans = parseUnhealthyLoans(users);
    const minBonusLoans = minBonus(unhealthyLoans);
    const knownTokenLoans = knownTokens(minBonusLoans);
    const profitableLoans = await liquidationProfits(knownTokenLoans);

    profitableLoans.forEach((l) => console.log(l));
    await sleep(60000);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
