import { EthersContractContextV5 } from 'ethereum-abi-types-generator';
import {
  BigNumber,
  BigNumberish,
  BytesLike as Arrayish,
  ContractTransaction,
} from 'ethers';

export type ContractContext = EthersContractContextV5<
  LiquidateLoan,
  LiquidateLoanMethodNames,
  LiquidateLoanEventsContext,
  LiquidateLoanEvents
>;

export declare type EventFilter = {
  address?: string;
  topics?: Array<string>;
  fromBlock?: string | number;
  toBlock?: string | number;
};

export interface ContractTransactionOverrides {
  /**
   * The maximum units of gas for the transaction to use
   */
  gasLimit?: number;
  /**
   * The price (in wei) per unit of gas
   */
  gasPrice?: BigNumber | string | number | Promise<any>;
  /**
   * The nonce to use in the transaction
   */
  nonce?: number;
  /**
   * The amount to send with the transaction (i.e. msg.value)
   */
  value?: BigNumber | string | number | Promise<any>;
  /**
   * The chain ID (or network ID) to use
   */
  chainId?: number;
}

export interface ContractCallOverrides {
  /**
   * The address to execute the call as
   */
  from?: string;
  /**
   * The maximum units of gas for the transaction to use
   */
  gasLimit?: number;
}
export type LiquidateLoanEvents = 'ErrorHandled' | 'OwnershipTransferred';
export interface LiquidateLoanEventsContext {
  ErrorHandled(...parameters: any): EventFilter;
  OwnershipTransferred(...parameters: any): EventFilter;
}
export type LiquidateLoanMethodNames =
  | 'new'
  | 'executeFlashLoans'
  | 'executeOperation'
  | 'isOwner'
  | 'lendingPoolAddr'
  | 'owner'
  | 'provider'
  | 'renounceOwnership'
  | 'transferOwnership';
export interface ErrorHandledEventEmittedResponse {
  stringFailure: string;
}
export interface OwnershipTransferredEventEmittedResponse {
  previousOwner: string;
  newOwner: string;
}
export interface LiquidateLoan {
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: constructor
   * @param _addressProvider Type: address, Indexed: false
   * @param _uniswapV2Router Type: address, Indexed: false
   */
  'new'(
    _addressProvider: string,
    _uniswapV2Router: string,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param _assetToLiquidate Type: address, Indexed: false
   * @param _flashAmt Type: uint256, Indexed: false
   * @param _collateral Type: address, Indexed: false
   * @param _userToLiquidate Type: address, Indexed: false
   * @param _amountOutMin Type: uint256, Indexed: false
   * @param _swapPath Type: address[], Indexed: false
   */
  executeFlashLoans(
    _assetToLiquidate: string,
    _flashAmt: BigNumberish,
    _collateral: string,
    _userToLiquidate: string,
    _amountOutMin: BigNumberish,
    _swapPath: string[],
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param assets Type: address[], Indexed: false
   * @param amounts Type: uint256[], Indexed: false
   * @param premiums Type: uint256[], Indexed: false
   * @param parameter3 Type: address, Indexed: false
   * @param params Type: bytes, Indexed: false
   */
  executeOperation(
    assets: string[],
    amounts: BigNumberish[],
    premiums: BigNumberish[],
    parameter3: string,
    params: Arrayish,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  isOwner(overrides?: ContractCallOverrides): Promise<boolean>;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  lendingPoolAddr(overrides?: ContractCallOverrides): Promise<string>;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  owner(overrides?: ContractCallOverrides): Promise<string>;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  provider(overrides?: ContractCallOverrides): Promise<string>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   */
  renounceOwnership(
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param newOwner Type: address, Indexed: false
   */
  transferOwnership(
    newOwner: string,
    overrides?: ContractTransactionOverrides,
  ): Promise<ContractTransaction>;
}
