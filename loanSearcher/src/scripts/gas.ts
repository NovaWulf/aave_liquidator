import * as dotenv from 'dotenv';

import { getGasPrice } from '../utils/alchemy.js';

dotenv.config();

run();

//infinite loop calling checking for profitable loans to liquidate
async function run(): Promise<void> {
  getGasPrice();
}
