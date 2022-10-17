import { getLoans, getUserLoans } from '../src/theGraph.js';

describe('getLoans', () => {
  it('returns loan count', async () => {
    const loans = await getLoans({ maxLoops: 1 });

    expect(loans.length).toBeGreaterThan(0);
  });

  it('returns user loan count', async () => {
    const loans = await getUserLoans({
      userId: process.env.TEST_USER_TO_LIQUIDATE,
      blockNumber: parseInt(process.env.TEST_BLOCK_NUMBER),
    });
    expect(loans.length).toBeGreaterThan(0);
  });
});
