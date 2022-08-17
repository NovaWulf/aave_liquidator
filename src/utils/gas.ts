// we're using 2.6 because 3 had an issue with jest. thus the require vs import
// https://github.com/node-fetch/node-fetch/discussions/1503
// eslint-disable-next-line @typescript-eslint/no-var-requires
import fetch from 'node-fetch';

const GAS_USED_ESTIMATE = 1000000;

type EtherscanGasApiResponse = {
  status: string;
  message: string;
  result: {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
  };
};
export let gasCost = 0;

//returns gas for rapid time (within 15s)
export const getGas = async function () {
  const response: any = await fetch(
    `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  const data = (await response.json()) as EtherscanGasApiResponse;
  gasCost = parseInt(data.result.FastGasPrice);

  console.log(`Current ETH Gas Prices (in GWEI): ${gasCost}`);

  return gasCost;
};

export const gasCostToLiquidate = async function () {
  return BigInt(gasCost * GAS_USED_ESTIMATE);
};
