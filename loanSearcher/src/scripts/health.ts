import * as dotenv from 'dotenv';

import { getUserHealthFactor } from '../aaveHealth.js';

dotenv.config();

run();

//infinite loop calling checking for profitable loans to liquidate
async function run(): Promise<void> {
  const hf = await getUserHealthFactor(
    process.env.TEST_USER_TO_LIQUIDATE,
    parseInt(process.env.TEST_BLOCK_NUMBER),
  );
  // console.log(hf);

  console.log('Health Factor: ' + hf.healthFactor);
}
