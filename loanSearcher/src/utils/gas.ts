import { provider } from './alchemy.js';

export let gasCost = 0n;

//returns gas for rapid time (within 15s)
export const getGas = async function (): Promise<bigint> {
  const gasPrice = await provider().getGasPrice();

  gasCost = gasPrice.toBigInt();

  console.log(`Current ETH Gas Prices (in wei): ${gasCost}`);

  return gasCost;
};
