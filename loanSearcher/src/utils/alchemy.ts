import { ethers } from 'ethers';

export function provider(): ethers.providers.BaseProvider {
  const { ALCHEMY_API_KEY, LOCALHOST_PROVIDER } = process.env;
  if (LOCALHOST_PROVIDER) {
    // console.log('Running Alchemy against localhost');

    return new ethers.providers.JsonRpcProvider(); // this will connect to localhost
  } else {
    if (!ALCHEMY_API_KEY) throw new Error('ALCHEMY_API_KEY required');
    // console.log('Running Alchemy against mainnet');

    return new ethers.providers.AlchemyProvider('mainnet', ALCHEMY_API_KEY);
  }
}

export function signer(): ethers.Wallet {
  const { MAINNET_PRIVATE_KEY } = process.env;
  if (!MAINNET_PRIVATE_KEY) throw new Error('MAINNET_PRIVATE_KEY required');

  return new ethers.Wallet(MAINNET_PRIVATE_KEY, provider());
}
