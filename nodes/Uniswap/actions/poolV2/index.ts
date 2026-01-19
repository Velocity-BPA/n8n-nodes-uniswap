/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient, SubgraphClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['poolV2'] } },
    options: [
      { name: 'Get Pair', value: 'getPair', description: 'Get V2 pair information' },
      { name: 'Get Reserves', value: 'getReserves', description: 'Get pair reserves' },
      { name: 'Get Price', value: 'getPrice', description: 'Get pair price' },
      { name: 'Calculate Output', value: 'calcOutput', description: 'Calculate swap output amount' },
    ],
    default: 'getPair',
  },
  {
    displayName: 'Token A',
    name: 'tokenA',
    type: 'string',
    displayOptions: { show: { resource: ['poolV2'], operation: ['getPair', 'getReserves', 'getPrice'] } },
    default: '',
    description: 'Address of first token',
  },
  {
    displayName: 'Token B',
    name: 'tokenB',
    type: 'string',
    displayOptions: { show: { resource: ['poolV2'], operation: ['getPair', 'getReserves', 'getPrice'] } },
    default: '',
    description: 'Address of second token',
  },
  {
    displayName: 'Pair Address',
    name: 'pairAddress',
    type: 'string',
    displayOptions: { show: { resource: ['poolV2'], operation: ['calcOutput'] } },
    default: '',
    description: 'V2 pair contract address',
  },
  {
    displayName: 'Amount In',
    name: 'amountIn',
    type: 'string',
    displayOptions: { show: { resource: ['poolV2'], operation: ['calcOutput'] } },
    default: '',
    description: 'Input amount',
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    displayOptions: { show: { resource: ['poolV2'], operation: ['calcOutput'] } },
    default: '',
    description: 'Input token (0 or 1)',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  let result: Record<string, unknown>;

  switch (operation) {
    case 'getPair': {
      const tokenA = this.getNodeParameter('tokenA', index) as string;
      const tokenB = this.getNodeParameter('tokenB', index) as string;
      
      const contracts = client.getContracts();
      const factoryAbi = ['function getPair(address,address) view returns (address)'];
      const pairAddress = await client.call(contracts.factoryV2, factoryAbi, 'getPair', [tokenA, tokenB]);
      
      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        throw new NodeOperationError(this.getNode(), 'Pair does not exist', { itemIndex: index });
      }

      const pairAbi = [
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function getReserves() view returns (uint112,uint112,uint32)',
        'function totalSupply() view returns (uint256)',
      ];

      const [token0, token1, reserves, totalSupply] = await Promise.all([
        client.call(pairAddress, pairAbi, 'token0', []),
        client.call(pairAddress, pairAbi, 'token1', []),
        client.call(pairAddress, pairAbi, 'getReserves', []),
        client.call(pairAddress, pairAbi, 'totalSupply', []),
      ]);

      result = {
        pairAddress,
        token0,
        token1,
        reserve0: reserves[0].toString(),
        reserve1: reserves[1].toString(),
        blockTimestampLast: reserves[2],
        totalSupply: totalSupply.toString(),
      };
      break;
    }

    case 'getReserves': {
      const tokenA = this.getNodeParameter('tokenA', index) as string;
      const tokenB = this.getNodeParameter('tokenB', index) as string;
      
      const contracts = client.getContracts();
      const factoryAbi = ['function getPair(address,address) view returns (address)'];
      const pairAddress = await client.call(contracts.factoryV2, factoryAbi, 'getPair', [tokenA, tokenB]);
      
      const pairAbi = ['function getReserves() view returns (uint112,uint112,uint32)'];
      const reserves = await client.call(pairAddress, pairAbi, 'getReserves', []);

      result = {
        pairAddress,
        reserve0: reserves[0].toString(),
        reserve1: reserves[1].toString(),
        blockTimestampLast: reserves[2],
      };
      break;
    }

    case 'getPrice': {
      const tokenA = this.getNodeParameter('tokenA', index) as string;
      const tokenB = this.getNodeParameter('tokenB', index) as string;
      
      const contracts = client.getContracts();
      const factoryAbi = ['function getPair(address,address) view returns (address)'];
      const pairAddress = await client.call(contracts.factoryV2, factoryAbi, 'getPair', [tokenA, tokenB]);
      
      const pairAbi = [
        'function token0() view returns (address)',
        'function getReserves() view returns (uint112,uint112,uint32)',
      ];
      
      const [token0, reserves] = await Promise.all([
        client.call(pairAddress, pairAbi, 'token0', []),
        client.call(pairAddress, pairAbi, 'getReserves', []),
      ]);

      const reserve0 = BigInt(reserves[0].toString());
      const reserve1 = BigInt(reserves[1].toString());
      
      // Price of token0 in terms of token1
      const price0 = Number(reserve1 * 1000000000000000000n / reserve0) / 1e18;
      const price1 = Number(reserve0 * 1000000000000000000n / reserve1) / 1e18;

      result = {
        pairAddress,
        token0,
        token0Price: price0,
        token1Price: price1,
      };
      break;
    }

    case 'calcOutput': {
      const pairAddress = this.getNodeParameter('pairAddress', index) as string;
      const amountIn = this.getNodeParameter('amountIn', index) as string;
      
      const pairAbi = ['function getReserves() view returns (uint112,uint112,uint32)'];
      const reserves = await client.call(pairAddress, pairAbi, 'getReserves', []);

      const reserveIn = BigInt(reserves[0].toString());
      const reserveOut = BigInt(reserves[1].toString());
      const amountInBN = BigInt(Math.floor(parseFloat(amountIn) * 1e18));
      
      // V2 constant product formula with 0.3% fee
      const amountInWithFee = amountInBN * 997n;
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn * 1000n + amountInWithFee;
      const amountOut = numerator / denominator;

      result = {
        amountIn,
        amountOut: amountOut.toString(),
        amountOutFormatted: Number(amountOut) / 1e18,
        reserveIn: reserveIn.toString(),
        reserveOut: reserveOut.toString(),
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
