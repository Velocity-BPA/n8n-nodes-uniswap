/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient, SubgraphClient, QuoterClient } from '../../transport';
import { tickToPrice, sqrtPriceX96ToPrice } from '../../constants';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['price'] } },
    options: [
      { name: 'Get Pool Price', value: 'getPoolPrice', description: 'Get current pool price' },
      { name: 'Get Token Price', value: 'getTokenPrice', description: 'Get token price in terms of another' },
      { name: 'Convert Price', value: 'convertPrice', description: 'Convert between tick and price' },
      { name: 'Get Spot Price', value: 'getSpotPrice', description: 'Get spot price from quoter' },
    ],
    default: 'getPoolPrice',
  },
  {
    displayName: 'Pool Address',
    name: 'poolAddress',
    type: 'string',
    displayOptions: { show: { resource: ['price'], operation: ['getPoolPrice'] } },
    default: '',
    description: 'Pool contract address',
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    displayOptions: { show: { resource: ['price'], operation: ['getTokenPrice', 'getSpotPrice'] } },
    default: '',
    description: 'Input token address',
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    displayOptions: { show: { resource: ['price'], operation: ['getTokenPrice', 'getSpotPrice'] } },
    default: '',
    description: 'Output token address',
  },
  {
    displayName: 'Tick',
    name: 'tick',
    type: 'number',
    displayOptions: { show: { resource: ['price'], operation: ['convertPrice'] } },
    default: 0,
    description: 'Tick value to convert',
  },
  {
    displayName: 'Fee Tier',
    name: 'feeTier',
    type: 'options',
    displayOptions: { show: { resource: ['price'], operation: ['getSpotPrice'] } },
    options: [
      { name: '0.01%', value: 100 },
      { name: '0.05%', value: 500 },
      { name: '0.3%', value: 3000 },
      { name: '1%', value: 10000 },
      { name: 'Auto', value: 0 },
    ],
    default: 3000,
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  let result: Record<string, unknown>;

  switch (operation) {
    case 'getPoolPrice': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const client = await UniswapClient.fromCredentials(this);
      
      const poolAbi = [
        'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)',
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function fee() view returns (uint24)',
      ];

      const [slot0, token0, token1, fee] = await Promise.all([
        client.call(poolAddress, poolAbi, 'slot0', []),
        client.call(poolAddress, poolAbi, 'token0', []),
        client.call(poolAddress, poolAbi, 'token1', []),
        client.call(poolAddress, poolAbi, 'fee', []),
      ]);

      const sqrtPriceX96 = BigInt(slot0[0].toString());
      const tick = slot0[1];
      const price = sqrtPriceX96ToPrice(sqrtPriceX96);
      const priceFromTick = tickToPrice(tick);

      result = {
        poolAddress,
        token0,
        token1,
        fee,
        tick,
        sqrtPriceX96: sqrtPriceX96.toString(),
        priceToken0InToken1: price,
        priceToken1InToken0: 1 / price,
        priceFromTick: priceFromTick,
      };
      break;
    }

    case 'getTokenPrice': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      
      const quoter = await QuoterClient.fromCredentials(this);
      const quote = await quoter.getBestQuote(tokenIn, tokenOut, '1');

      result = {
        tokenIn,
        tokenOut,
        price: quote.amountOutFormatted || quote.amountOut,
        feeTier: quote.feeTier,
        gasEstimate: quote.gasEstimate,
      };
      break;
    }

    case 'convertPrice': {
      const tick = this.getNodeParameter('tick', index) as number;
      
      const price = tickToPrice(tick);
      
      result = {
        tick,
        price,
        priceInverse: 1 / price,
      };
      break;
    }

    case 'getSpotPrice': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      
      const quoter = await QuoterClient.fromCredentials(this);
      
      // Get quote for a very small amount to approximate spot price
      let quote;
      if (feeTier === 0) {
        quote = await quoter.getBestQuote(tokenIn, tokenOut, '0.0001');
      } else {
        quote = await quoter.quoteExactInputSingle(tokenIn, tokenOut, '0.0001', feeTier);
      }

      // Scale up to get price per 1 token
      const spotPrice = parseFloat(quote.amountOutFormatted || quote.amountOut) * 10000;

      result = {
        tokenIn,
        tokenOut,
        spotPrice,
        feeTier: quote.feeTier || feeTier,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
