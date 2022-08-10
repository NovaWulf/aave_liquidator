import { getGas } from '../../src/utils/gas.js';

describe('getGas', () => {
  it('returns gas price', async () => {
    const gas = await getGas();
    expect(gas).toBeGreaterThan(10);
  });
});
