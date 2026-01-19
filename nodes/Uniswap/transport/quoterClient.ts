/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { UniswapClient } from './uniswapClient';
import { getContracts } from '../constants/contracts';
import { encodePath, PathHop } from '../utils/pathUtils';

/**
 * Quote result from Quoter V2
 */
export interface QuoteResult {
  amountOut: string;
  sqrtPriceX96After: string;
  initializedTicksCrossed: number;
  gasEstimate: string;
}

/**
 * Quoter client for getting swap quotes
 */
export class QuoterClient {
  private client: UniswapClient;
  private contracts: ReturnType<typeof getContracts>;

  // QuoterV2 ABI
  private static QUOTER_V2_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
    'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
    'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)',
    'function quoteExactOutput(bytes memory path, uint256 amountOut) external returns (uint256 amountIn, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)',
  ];

  constructor(client: UniswapClient) {
    this.client = client;
    this.contracts = client.getContracts();
  }

  /**
   * Create client from n8n credentials
   */
  static async fromCredentials(
    context: IExecuteFunctions | ILoadOptionsFunctions,
  ): Promise<QuoterClient> {
    const uniswapClient = await UniswapClient.fromCredentials(context);
    return new QuoterClient(uniswapClient);
  }

  /**
   * Get quote for exact input single hop
   */
  async quoteExactInputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
  ): Promise<QuoteResult> {
    const quoter = new ethers.Contract(
      this.contracts.quoterV2,
      QuoterClient.QUOTER_V2_ABI,
      this.client.getProvider(),
    );

    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0,
    };

    try {
      // Quote is a static call that simulates the swap
      const result = await quoter.quoteExactInputSingle.staticCall(params);

      return {
        amountOut: result[0].toString(),
        sqrtPriceX96After: result[1].toString(),
        initializedTicksCrossed: Number(result[2]),
        gasEstimate: result[3].toString(),
      };
    } catch (error) {
      throw new Error(`Quote failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get quote for exact output single hop
   */
  async quoteExactOutputSingle(
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountOut: string,
  ): Promise<QuoteResult> {
    const quoter = new ethers.Contract(
      this.contracts.quoterV2,
      QuoterClient.QUOTER_V2_ABI,
      this.client.getProvider(),
    );

    const params = {
      tokenIn,
      tokenOut,
      amount: amountOut,
      fee,
      sqrtPriceLimitX96: 0,
    };

    try {
      const result = await quoter.quoteExactOutputSingle.staticCall(params);

      return {
        amountOut: result[0].toString(), // This is actually amountIn for exact output
        sqrtPriceX96After: result[1].toString(),
        initializedTicksCrossed: Number(result[2]),
        gasEstimate: result[3].toString(),
      };
    } catch (error) {
      throw new Error(`Quote failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get quote for exact input multi-hop
   */
  async quoteExactInput(
    path: PathHop[],
    amountIn: string,
  ): Promise<{
    amountOut: string;
    sqrtPriceX96AfterList: string[];
    initializedTicksCrossedList: number[];
    gasEstimate: string;
  }> {
    const quoter = new ethers.Contract(
      this.contracts.quoterV2,
      QuoterClient.QUOTER_V2_ABI,
      this.client.getProvider(),
    );

    const encodedPath = encodePath(path);

    try {
      const result = await quoter.quoteExactInput.staticCall(encodedPath, amountIn);

      return {
        amountOut: result[0].toString(),
        sqrtPriceX96AfterList: result[1].map((p: bigint) => p.toString()),
        initializedTicksCrossedList: result[2].map((t: number) => Number(t)),
        gasEstimate: result[3].toString(),
      };
    } catch (error) {
      throw new Error(`Quote failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get quote for exact output multi-hop
   */
  async quoteExactOutput(
    path: PathHop[],
    amountOut: string,
  ): Promise<{
    amountIn: string;
    sqrtPriceX96AfterList: string[];
    initializedTicksCrossedList: number[];
    gasEstimate: string;
  }> {
    const quoter = new ethers.Contract(
      this.contracts.quoterV2,
      QuoterClient.QUOTER_V2_ABI,
      this.client.getProvider(),
    );

    // Path must be reversed for exact output
    const reversedPath = [...path].reverse().map((h) => ({
      tokenIn: h.tokenOut,
      tokenOut: h.tokenIn,
      fee: h.fee,
    }));
    const encodedPath = encodePath(reversedPath);

    try {
      const result = await quoter.quoteExactOutput.staticCall(encodedPath, amountOut);

      return {
        amountIn: result[0].toString(),
        sqrtPriceX96AfterList: result[1].map((p: bigint) => p.toString()),
        initializedTicksCrossedList: result[2].map((t: number) => Number(t)),
        gasEstimate: result[3].toString(),
      };
    } catch (error) {
      throw new Error(`Quote failed: ${(error as Error).message}`);
    }
  }

  /**
   * Compare quotes across fee tiers
   */
  async compareFeeTiers(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
  ): Promise<
    Array<{
      fee: number;
      quote: QuoteResult | null;
      error?: string;
    }>
  > {
    const feeTiers = [100, 500, 3000, 10000];
    const results = await Promise.all(
      feeTiers.map(async (fee) => {
        try {
          const quote = await this.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn);
          return { fee, quote };
        } catch (error) {
          return { fee, quote: null, error: (error as Error).message };
        }
      }),
    );

    return results;
  }

  /**
   * Get best quote across fee tiers
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
  ): Promise<{ fee: number; quote: QuoteResult } | null> {
    const quotes = await this.compareFeeTiers(tokenIn, tokenOut, amountIn);

    let best: { fee: number; quote: QuoteResult } | null = null;

    for (const { fee, quote } of quotes) {
      if (quote) {
        if (!best || BigInt(quote.amountOut) > BigInt(best.quote.amountOut)) {
          best = { fee, quote };
        }
      }
    }

    return best;
  }
}
