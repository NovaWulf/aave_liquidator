import { getGas } from '../../src/utils/gas.js';

describe('getGas', () => {
  it('returns gas price', async () => {
    let gas = await getGas();
    expect(gas).toBeGreaterThan(10);
  });
});
