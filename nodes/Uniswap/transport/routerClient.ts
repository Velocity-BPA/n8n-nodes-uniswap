/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';
import { UniswapClient } from './uniswapClient';
import { getContracts } from '../constants/contracts';
import { encodePath, PathHop } from '../utils/pathUtils';

/**
 * Router client for swap execution
 */
export class RouterClient {
  private client: UniswapClient;
  private contracts: ReturnType<typeof getContracts>;

  // SwapRouter02 ABI (subset)
  private static SWAP_ROUTER_ABI = [
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
    'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
    'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
    'function exactOutput((bytes path, address recipient, uint256 amountOut, uint256 amountInMaximum)) external payable returns (uint256 amountIn)',
    'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
    'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable',
    'function refundETH() external payable',
  ];

  // V2 Router ABI (subset)
  private static V2_ROUTER_ABI = [
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
  ];

  constructor(client: UniswapClient) {
    this.client = client;
    this.contracts = client.getContracts();
  }

  /**
   * Execute exact input single hop swap (V3)
   */
  async exactInputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    amountOutMinimum: string,
    recipient?: string,
    deadline?: number,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.client.getWallet();
    const router = new ethers.Contract(
      this.contracts.swapRouter02,
      RouterClient.SWAP_ROUTER_ABI,
      wallet,
    );

    const recipientAddr = recipient || (await wallet.getAddress());
    const sqrtPriceLimitX96 = 0; // No limit

    const params = {
      tokenIn,
      tokenOut,
      fee,
      recipient: recipientAddr,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96,
    };

    const tx = await router.exactInputSingle(params);
    return tx;
  }

  /**
   * Execute exact output single hop swap (V3)
   */
  async exactOutputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountOut: string,
    amountInMaximum: string,
    recipient?: string,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.client.getWallet();
    const router = new ethers.Contract(
      this.contracts.swapRouter02,
      RouterClient.SWAP_ROUTER_ABI,
      wallet,
    );

    const recipientAddr = recipient || (await wallet.getAddress());
    const sqrtPriceLimitX96 = 0;

    const params = {
      tokenIn,
      tokenOut,
      fee,
      recipient: recipientAddr,
      amountOut,
      amountInMaximum,
      sqrtPriceLimitX96,
    };

    return router.exactOutputSingle(params);
  }

  /**
   * Execute exact input multi-hop swap (V3)
   */
  async exactInput(
    path: PathHop[],
    amountIn: string,
    amountOutMinimum: string,
    recipient?: string,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.client.getWallet();
    const router = new ethers.Contract(
      this.contracts.swapRouter02,
      RouterClient.SWAP_ROUTER_ABI,
      wallet,
    );

    const recipientAddr = recipient || (await wallet.getAddress());
    const encodedPath = encodePath(path);

    const params = {
      path: encodedPath,
      recipient: recipientAddr,
      amountIn,
      amountOutMinimum,
    };

    return router.exactInput(params);
  }

  /**
   * Execute exact output multi-hop swap (V3)
   */
  async exactOutput(
    path: PathHop[],
    amountOut: string,
    amountInMaximum: string,
    recipient?: string,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.client.getWallet();
    const router = new ethers.Contract(
      this.contracts.swapRouter02,
      RouterClient.SWAP_ROUTER_ABI,
      wallet,
    );

    const recipientAddr = recipient || (await wallet.getAddress());
    // Note: path must be encoded in reverse for exact output
    const encodedPath = encodePath([...path].reverse().map((h) => ({
      tokenIn: h.tokenOut,
      tokenOut: h.tokenIn,
      fee: h.fee,
    })));

    const params = {
      path: encodedPath,
      recipient: recipientAddr,
      amountOut,
      amountInMaximum,
    };

    return router.exactOutput(params);
  }

  /**
   * V2 swap exact tokens for tokens
   */
  async swapExactTokensForTokensV2(
    amountIn: string,
    amountOutMin: string,
    path: string[],
    recipient?: string,
    deadline?: number,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.client.getWallet();
    const router = new ethers.Contract(
      this.contracts.routerV2,
      RouterClient.V2_ROUTER_ABI,
      wallet,
    );

    const recipientAddr = recipient || (await wallet.getAddress());
    const txDeadline = deadline || Math.floor(Date.now() / 1000) + 1200;

    return router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      recipientAddr,
      txDeadline,
    );
  }

  /**
   * V2 get amounts out
   */
  async getAmountsOutV2(amountIn: string, path: string[]): Promise<string[]> {
    const router = new ethers.Contract(
      this.contracts.routerV2,
      RouterClient.V2_ROUTER_ABI,
      this.client.getProvider(),
    );

    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts.map((a: bigint) => a.toString());
  }

  /**
   * V2 get amounts in
   */
  async getAmountsInV2(amountOut: string, path: string[]): Promise<string[]> {
    const router = new ethers.Contract(
      this.contracts.routerV2,
      RouterClient.V2_ROUTER_ABI,
      this.client.getProvider(),
    );

    const amounts = await router.getAmountsIn(amountOut, path);
    return amounts.map((a: bigint) => a.toString());
  }

  /**
   * Get router addresses
   */
  getRouterAddresses(): { v2: string; v3: string; universal: string } {
    return {
      v2: this.contracts.routerV2,
      v3: this.contracts.swapRouter02,
      universal: this.contracts.universalRouter,
    };
  }
}
