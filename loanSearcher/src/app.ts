import * as dotenv from 'dotenv';

import { mapLoans, minBonus, parseUnhealthyLoans } from './aave.js';
import { setTokenList } from './chains.js';
import { knownTokens, liquidationProfits } from './liquidations.js';
import { getLoans } from './theGraph.js';
import { getGas } from './utils/gas.js';
import { sendLoanEmail } from './utils/mailer.js';
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
  const users = await getLoans(1000);
  const mappedLoans = mapLoans(users);
  const unhealthyLoans = await parseUnhealthyLoans(mappedLoans);
  const minBonusLoans = minBonus(unhealthyLoans);
  const knownTokenLoans = knownTokens(minBonusLoans);
  const profitableLoans = await liquidationProfits(knownTokenLoans);
  sendLoanEmail(profitableLoans);

  profitableLoans.forEach((l) => console.log(l));
  await sleep(60000);
}
