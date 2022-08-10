// import fetch, { Response } from 'node-fetch';
const fetch = require('node-fetch');

// import axios from 'axios';
// import { EthGasStationApiResponse } from './gas.types.js';

type EthGasStationApiResponse = {
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

//returns gas for rapid time (within 15s)
export const getGas = async function () {
  const response: any = await fetch(
    `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  const data = (await response.json()) as EthGasStationApiResponse;
  const fastPrice = parseInt(data.result.FastGasPrice);

  console.log(`Current ETH Gas Prices (in GWEI): ${fastPrice}`);

  return fastPrice;
};
