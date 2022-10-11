import { mapLoans } from '../src/aave.js';
import { getUserHealthFactor } from '../src/aaveHealth.js';
import { getUserLoans } from '../src/theGraph.js';

describe('live loans', () => {
  // compare our calculation of a health factor from thegraph data to the onchain one
  it('calculates health within 1%', async () => {
    const loans = await getUserLoans(
      process.env.TEST_USER_TO_LIQUIDATE,
      parseInt(process.env.TEST_BLOCK_NUMBER),
    );
    const mappedLoan = mapLoans(loans)[0];

    const aaveSummary = await getUserHealthFactor(
      mappedLoan.userId,
      parseInt(process.env.TEST_BLOCK_NUMBER),
    );

    let healthFactorDiff = 0;

    healthFactorDiff = Math.abs(
      mappedLoan['healthFactor'] - parseFloat(aaveSummary['healthFactor']),
    );
    console.log(`health factor diff = ${healthFactorDiff}`);
    if (healthFactorDiff > 0.01) {
      console.log(mappedLoan);
      console.log(aaveSummary);
    }

    expect(healthFactorDiff < 0.01).toBeTruthy();
  });
});
