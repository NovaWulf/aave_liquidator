import { getLoans } from '../src/theGraph.js';

describe('getLoans', () => {
  it('returns loan count', async () => {
    const loans = await getLoans(100, 1);
    expect(loans.length).toBeGreaterThan(0);
  });
});
