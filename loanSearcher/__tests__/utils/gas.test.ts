import { getGas } from '../../src/utils/gas.js';
import { jest } from '@jest/globals';

describe('getGas', () => {
  it('returns gas price', async () => {
    jest.setTimeout(10000);

    const gas = await getGas();
    expect(gas).toBeGreaterThan(5);
  });
});
