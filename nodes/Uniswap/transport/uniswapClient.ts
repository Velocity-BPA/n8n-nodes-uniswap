/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { getNetwork, NETWORKS } from '../constants/networks';
import { getContracts } from '../constants/contracts';

/**
 * Uniswap client for blockchain interactions
 */
export class UniswapClient {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private chainId: number;
  private networkName: string;

  constructor(
    rpcUrl: string,
    privateKey?: string,
    chainId?: number,
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = chainId || 1;
    this.networkName = 'custom';

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
  }

  /**
   * Create client from n8n credentials
   */
  static async fromCredentials(
    context: IExecuteFunctions | ILoadOptionsFunctions,
    credentialsName: string = 'uniswapNetwork',
  ): Promise<UniswapClient> {
    const credentials = await context.getCredentials(credentialsName);

    const network = credentials.network as string;
    let rpcUrl = credentials.rpcUrl as string;
    let chainId = credentials.chainId as number;

    // Get network config if not custom
    if (network !== 'custom' && NETWORKS[network]) {
      const config = getNetwork(network);
      rpcUrl = rpcUrl || config.rpcUrl;
      chainId = config.chainId;
    }

    if (!rpcUrl) {
      throw new Error('RPC URL is required');
    }

    const client = new UniswapClient(
      rpcUrl,
      credentials.privateKey as string,
      chainId,
    );
    client.networkName = network;

    // Log licensing notice once
    UniswapClient.logLicensingNotice();

    return client;
  }

  /**
   * Log licensing notice (once per session)
   */
  private static licenseLogged = false;
  private static logLicensingNotice(): void {
    if (!UniswapClient.licenseLogged) {
      console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
      UniswapClient.licenseLogged = true;
    }
  }

  /**
   * Get provider
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get wallet (throws if not configured)
   */
  getWallet(): ethers.Wallet {
    if (!this.wallet) {
      throw new Error('Private key not configured. Cannot sign transactions.');
    }
    return this.wallet;
  }

  /**
   * Get signer (wallet or provider)
   */
  getSigner(): ethers.Wallet | ethers.JsonRpcProvider {
    return this.wallet || this.provider;
  }

  /**
   * Check if wallet is configured
   */
  hasWallet(): boolean {
    return this.wallet !== null;
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Get network name
   */
  getNetworkName(): string {
    return this.networkName;
  }

  /**
   * Get contract addresses for current chain
   */
  getContracts() {
    return getContracts(this.chainId);
  }

  /**
   * Get wallet address
   */
  async getAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }
    return this.wallet.address;
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Get balance
   */
  async getBalance(address?: string): Promise<string> {
    const addr = address || (await this.getAddress());
    const balance = await this.provider.getBalance(addr);
    return balance.toString();
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string, ownerAddress?: string): Promise<string> {
    const owner = ownerAddress || (await this.getAddress());
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
    const balance = await contract.balanceOf(owner);
    return balance.toString();
  }

  /**
   * Get token info
   */
  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> {
    const erc20Abi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ];
    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);

    return { name, symbol, decimals: Number(decimals) };
  }

  /**
   * Check token allowance
   */
  async getAllowance(
    tokenAddress: string,
    spenderAddress: string,
    ownerAddress?: string,
  ): Promise<string> {
    const owner = ownerAddress || (await this.getAddress());
    const erc20Abi = ['function allowance(address,address) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
    const allowance = await contract.allowance(owner, spenderAddress);
    return allowance.toString();
  }

  /**
   * Approve token spending
   */
  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.getWallet();
    const erc20Abi = ['function approve(address,uint256) returns (bool)'];
    const contract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    return contract.approve(spenderAddress, amount);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
  ): Promise<ethers.TransactionReceipt | null> {
    return this.provider.waitForTransaction(txHash, confirmations);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    return this.provider.estimateGas(tx);
  }

  /**
   * Call a contract method (read-only)
   */
  async call(
    contractAddress: string,
    abi: ethers.InterfaceAbi,
    method: string,
    args: unknown[] = [],
  ): Promise<any> {
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    return contract[method](...args);
  }

  /**
   * Execute a contract method (write)
   */
  async execute(
    contractAddress: string,
    abi: ethers.InterfaceAbi,
    method: string,
    args: unknown[] = [],
    overrides?: ethers.Overrides,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.getWallet();
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    return contract[method](...args, overrides || {});
  }
}
