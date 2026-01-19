/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient, RouterClient, QuoterClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['swap'] } },
    options: [
      { name: 'Get Quote', value: 'getQuote', description: 'Get a swap quote without executing' },
      { name: 'Execute Swap', value: 'executeSwap', description: 'Execute a token swap' },
      { name: 'Execute Swap V2', value: 'executeSwapV2', description: 'Execute a V2 swap' },
      { name: 'Get Price Impact', value: 'getPriceImpact', description: 'Calculate price impact' },
      { name: 'Get Minimum Received', value: 'getMinimumReceived', description: 'Calculate minimum output with slippage' },
    ],
    default: 'getQuote',
  },
  // Token In
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['swap'] } },
    default: '',
    placeholder: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    description: 'Address of the input token',
  },
  // Token Out
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['swap'] } },
    default: '',
    placeholder: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Address of the output token',
  },
  // Amount
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['swap'] } },
    default: '',
    placeholder: '1.0',
    description: 'Amount of input token (human readable)',
  },
  // Fee Tier
  {
    displayName: 'Fee Tier',
    name: 'feeTier',
    type: 'options',
    displayOptions: { show: { resource: ['swap'], operation: ['getQuote', 'executeSwap', 'getPriceImpact'] } },
    options: [
      { name: '0.01% (Stable pairs)', value: 100 },
      { name: '0.05% (Stable/common pairs)', value: 500 },
      { name: '0.3% (Most pairs)', value: 3000 },
      { name: '1% (Exotic pairs)', value: 10000 },
      { name: 'Auto (Best fee)', value: 0 },
    ],
    default: 3000,
    description: 'Pool fee tier',
  },
  // Slippage
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    displayOptions: { show: { resource: ['swap'], operation: ['executeSwap', 'executeSwapV2', 'getMinimumReceived'] } },
    default: 0.5,
    description: 'Maximum slippage tolerance in percent',
  },
  // Deadline
  {
    displayName: 'Deadline (seconds)',
    name: 'deadline',
    type: 'number',
    displayOptions: { show: { resource: ['swap'], operation: ['executeSwap', 'executeSwapV2'] } },
    default: 1200,
    description: 'Transaction deadline in seconds from now',
  },
  // Recipient
  {
    displayName: 'Recipient',
    name: 'recipient',
    type: 'string',
    displayOptions: { show: { resource: ['swap'], operation: ['executeSwap', 'executeSwapV2'] } },
    default: '',
    placeholder: 'Leave empty to use wallet address',
    description: 'Recipient address (optional, defaults to wallet)',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const tokenIn = this.getNodeParameter('tokenIn', index) as string;
  const tokenOut = this.getNodeParameter('tokenOut', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;

  const client = await UniswapClient.fromCredentials(this);
  const quoter = await QuoterClient.fromCredentials(this);
  const router = await RouterClient.fromCredentials(this);

  let result: Record<string, unknown>;

  switch (operation) {
    case 'getQuote': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      
      if (feeTier === 0) {
        // Auto-select best fee tier
        const quote = await quoter.getBestQuote(tokenIn, tokenOut, amount);
        result = quote;
      } else {
        const quote = await quoter.quoteExactInputSingle(tokenIn, tokenOut, amount, feeTier);
        result = quote;
      }
      break;
    }

    case 'executeSwap': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      const slippage = this.getNodeParameter('slippage', index) as number;
      const deadline = this.getNodeParameter('deadline', index) as number;
      const recipient = this.getNodeParameter('recipient', index, '') as string;

      // Get quote first
      let quote;
      let selectedFee = feeTier;
      if (feeTier === 0) {
        quote = await quoter.getBestQuote(tokenIn, tokenOut, amount);
        selectedFee = quote.feeTier;
      } else {
        quote = await quoter.quoteExactInputSingle(tokenIn, tokenOut, amount, feeTier);
      }

      // Calculate minimum output with slippage
      const minOutput = BigInt(quote.amountOut) * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

      // Execute swap
      const tx = await router.exactInputSingle(
        tokenIn,
        tokenOut,
        selectedFee,
        recipient || await client.getAddress(),
        amount,
        minOutput.toString(),
        deadline,
      );

      result = {
        transactionHash: tx.hash,
        tokenIn,
        tokenOut,
        amountIn: amount,
        expectedOut: quote.amountOut,
        minOutput: minOutput.toString(),
        feeTier: selectedFee,
      };
      break;
    }

    case 'executeSwapV2': {
      const slippage = this.getNodeParameter('slippage', index) as number;
      const deadline = this.getNodeParameter('deadline', index) as number;
      const recipient = this.getNodeParameter('recipient', index, '') as string;

      // Get V2 quote
      const quote = await router.getAmountsOutV2([tokenIn, tokenOut], amount);
      const expectedOut = quote.amounts[quote.amounts.length - 1];

      // Calculate minimum output with slippage
      const minOutput = BigInt(expectedOut) * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

      // Execute V2 swap
      const tx = await router.swapExactTokensForTokensV2(
        amount,
        minOutput.toString(),
        [tokenIn, tokenOut],
        recipient || await client.getAddress(),
        deadline,
      );

      result = {
        transactionHash: tx.hash,
        tokenIn,
        tokenOut,
        amountIn: amount,
        expectedOut,
        minOutput: minOutput.toString(),
        protocol: 'V2',
      };
      break;
    }

    case 'getPriceImpact': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;

      // Get quotes for small and large amounts
      const smallQuote = await quoter.quoteExactInputSingle(tokenIn, tokenOut, '0.001', feeTier || 3000);
      const largeQuote = await quoter.quoteExactInputSingle(tokenIn, tokenOut, amount, feeTier || 3000);

      // Calculate prices
      const spotPrice = BigInt(smallQuote.amountOut) * 1000000000000000000n / 1000000000000000n;
      const effectivePrice = BigInt(largeQuote.amountOut) * 1000000000000000000n / BigInt(parseFloat(amount) * 1e18);

      // Price impact = (spot - effective) / spot * 100
      const priceImpact = Number((spotPrice - effectivePrice) * 10000n / spotPrice) / 100;

      result = {
        tokenIn,
        tokenOut,
        amount,
        spotPrice: spotPrice.toString(),
        effectivePrice: effectivePrice.toString(),
        priceImpact: `${priceImpact.toFixed(4)}%`,
        priceImpactRaw: priceImpact,
      };
      break;
    }

    case 'getMinimumReceived': {
      const slippage = this.getNodeParameter('slippage', index) as number;

      // Get best quote
      const quote = await quoter.getBestQuote(tokenIn, tokenOut, amount);

      // Calculate minimum with slippage
      const minOutput = BigInt(quote.amountOut) * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

      result = {
        expectedOutput: quote.amountOut,
        minimumReceived: minOutput.toString(),
        slippage: `${slippage}%`,
        feeTier: quote.feeTier,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
