import * as dotenv from 'dotenv';

import { setTokenList } from './chains.js';
import { runLiquidation } from './runLiquidation.js';
import { findProfitableLoan } from './searcher.js';
import { getLoans } from './theGraph.js';
import { getGas } from './utils/gas.js';
import { sendMail } from './utils/mailer.js';
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
  const blockNumber = process.env.TEST_BLOCK_NUMBER;
  await getGas(); // get this once per loop

  const args = { maxLoops: 6, tryAmount: 1000 };
  if (blockNumber) {
    args['blockNumber'] = blockNumber;
  }

  const userLoans = await getLoans(args);
  const loan = await findProfitableLoan(userLoans);
  if (loan) {
    runLiquidation(loan); // async
    console.log(loan.description);
    sendMail(loan.description); // async
  }

  await sleep(60000);
}
