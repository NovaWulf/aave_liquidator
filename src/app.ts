import * as dotenv from 'dotenv';
import { getLoans } from './theGraph.js';
dotenv.config();

run();

//infinite loop calling fetchUnhealthyLoans
//sleep for 1 minute before each call
async function run(): Promise<void> {
  // while (true) {
  console.log('fetching loans');

  const users = await getLoans(1000);
  console.log(users);

  // await sleep(60000);
  // }
  //TODO calculate liquidation threshold daily
}

// function sleep(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }
