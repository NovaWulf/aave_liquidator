import { parseUnhealthyLoans } from '../src/aave.js';
import { getUserHealthFactor } from '../src/aaveHealth.js';
import { getLoans } from '../src/theGraph.js';

describe('live loans', () => {
  it('calculates health within 1%', async () => {
    const loans = await getLoans(100, 1);
    const unhealthy = parseUnhealthyLoans(loans);
    console.log(unhealthy[0]);

    const aaveSummary = await getUserHealthFactor(unhealthy[0].userId);
    console.log(aaveSummary);

    let healthFactorDiff = 0;

    if (unhealthy[0]) {
      healthFactorDiff = Math.abs(
        unhealthy[0]['healthFactor'] - parseFloat(aaveSummary['healthFactor']),
      );
      console.log(`health factor diff = ${healthFactorDiff}`);
    }

    expect(healthFactorDiff < 0.01).toBeTruthy();
  });
});
