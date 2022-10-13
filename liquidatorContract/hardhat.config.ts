import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import * as dotenv from "dotenv";
dotenv.config();

const { ALCHEMY_API_KEY, MAINNET_PRIVATE_KEY } = process.env;
if (!ALCHEMY_API_KEY) throw new Error("ALCHEMY_API_KEY required");
if (!MAINNET_PRIVATE_KEY) throw new Error("MAINNET_PRIVATE_KEY required");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/" + ALCHEMY_API_KEY,
        blockNumber: 14367536,
      },
    },
    mainnet: {
      url: "https://eth-mainnet.g.alchemy.com/v2/" + ALCHEMY_API_KEY,
      accounts: [MAINNET_PRIVATE_KEY],
    },
  },
};

export default config;
