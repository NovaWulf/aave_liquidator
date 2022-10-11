import * as dotenv from 'dotenv';

import { mapLoans, minBonus, parseUnhealthyLoans } from './aave.js';
import { setTokenList } from './chains.js';
import { knownTokens, liquidationProfits } from './liquidations.js';
import { getUserLoans } from './theGraph.js';
import { getGas } from './utils/gas.js';
import { sendLoanEmail } from './utils/mailer.js';
dotenv.config();

run();

async function run(): Promise<void> {
  console.log(`Fetching loans from: ${process.env.CHAIN}`);

  setTokenList(); // relies on env vars so needs to be run at runtime

  await getGas(); // get this once per loop
  const users = await getUserLoans(
    process.env.TEST_USER_TO_LIQUIDATE,
    parseInt(process.env.TEST_BLOCK_NUMBER),
  );
  console.log(`user: ${JSON.stringify(users, null, 2)}`);

  const unhealthyLoans = await parseUnhealthyLoans(mapLoans(users));
  const minBonusLoans = minBonus(unhealthyLoans);
  const knownTokenLoans = knownTokens(minBonusLoans);
  const profitableLoans = await liquidationProfits(knownTokenLoans);
  sendLoanEmail(profitableLoans);

  profitableLoans.forEach((l) => console.log(l));
}
