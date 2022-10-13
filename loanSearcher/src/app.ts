import * as dotenv from 'dotenv';

import { setTokenList } from './chains.js';
import { runLiquidation } from './runLiquidation.js';
import { findProfitableLoan } from './searcher.js';
import { getLoans } from './theGraph.js';
import { getGas } from './utils/gas.js';
dotenv.config();

run();

//infinite loop calling checking for profitable loans to liquidate
async function run(): Promise<void> {
  console.log(`Fetching loans from: ${process.env.CHAIN}`);

  setTokenList(); // relies on env vars so needs to be run at runtime

  /* eslint-disable no-constant-condition */
  while (true) {
    await loop();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop() {
  await getGas(); // get this once per loop

  const userLoans = await getLoans(1000);
  const loan = await findProfitableLoan(userLoans);

  if (process.env.RUN_LIQUIDATIONS) {
    runLiquidation(loan);
  }

  await sleep(60000);
}
