/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient, SubgraphClient } from '../../transport';
import { tickToPrice } from '../../constants';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['poolV3'] } },
    options: [
      { name: 'Get Pool', value: 'getPool', description: 'Get pool information' },
      { name: 'Get Pool by Address', value: 'getPoolByAddress', description: 'Get pool by contract address' },
      { name: 'Get Top Pools', value: 'getTopPools', description: 'Get top pools by TVL' },
      { name: 'Get Pool Liquidity', value: 'getLiquidity', description: 'Get pool liquidity' },
      { name: 'Get Pool Price', value: 'getPrice', description: 'Get current pool price' },
      { name: 'Get Pool Ticks', value: 'getTicks', description: 'Get pool tick data' },
      { name: 'Get Pool Swaps', value: 'getSwaps', description: 'Get recent swaps in pool' },
      { name: 'Search Pools', value: 'searchPools', description: 'Search pools by token' },
    ],
    default: 'getPool',
  },
  {
    displayName: 'Token 0',
    name: 'token0',
    type: 'string',
    displayOptions: { show: { resource: ['poolV3'], operation: ['getPool'] } },
    default: '',
    description: 'Address of token 0',
  },
  {
    displayName: 'Token 1',
    name: 'token1',
    type: 'string',
    displayOptions: { show: { resource: ['poolV3'], operation: ['getPool'] } },
    default: '',
    description: 'Address of token 1',
  },
  {
    displayName: 'Fee Tier',
    name: 'feeTier',
    type: 'options',
    displayOptions: { show: { resource: ['poolV3'], operation: ['getPool'] } },
    options: [
      { name: '0.01%', value: 100 },
      { name: '0.05%', value: 500 },
      { name: '0.3%', value: 3000 },
      { name: '1%', value: 10000 },
    ],
    default: 3000,
  },
  {
    displayName: 'Pool Address',
    name: 'poolAddress',
    type: 'string',
    displayOptions: { show: { resource: ['poolV3'], operation: ['getPoolByAddress', 'getLiquidity', 'getPrice', 'getTicks', 'getSwaps'] } },
    default: '',
    description: 'Pool contract address',
  },
  {
    displayName: 'Token Address',
    name: 'tokenAddress',
    type: 'string',
    displayOptions: { show: { resource: ['poolV3'], operation: ['searchPools'] } },
    default: '',
    description: 'Token address to search for',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: { show: { resource: ['poolV3'], operation: ['getTopPools', 'getSwaps', 'getTicks', 'searchPools'] } },
    default: 10,
    description: 'Number of results to return',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const subgraph = await SubgraphClient.fromCredentials(this);
  let result: Record<string, unknown>;

  switch (operation) {
    case 'getPool': {
      const token0 = this.getNodeParameter('token0', index) as string;
      const token1 = this.getNodeParameter('token1', index) as string;
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      
      // Get pool address from factory
      const client = await UniswapClient.fromCredentials(this);
      const contracts = client.getContracts();
      
      const factoryAbi = ['function getPool(address,address,uint24) view returns (address)'];
      const poolAddress = await client.call(contracts.factoryV3, factoryAbi, 'getPool', [token0, token1, feeTier]);
      
      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        throw new NodeOperationError(this.getNode(), 'Pool does not exist', { itemIndex: index });
      }

      const pool = await subgraph.getPool(poolAddress);
      result = pool;
      break;
    }

    case 'getPoolByAddress': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const pool = await subgraph.getPool(poolAddress);
      result = pool;
      break;
    }

    case 'getTopPools': {
      const limit = this.getNodeParameter('limit', index) as number;
      const pools = await subgraph.getTopPools(limit);
      result = { pools };
      break;
    }

    case 'getLiquidity': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const pool = await subgraph.getPool(poolAddress);
      
      result = {
        poolAddress,
        liquidity: pool.liquidity,
        totalValueLockedUSD: pool.totalValueLockedUSD,
        totalValueLockedToken0: pool.totalValueLockedToken0,
        totalValueLockedToken1: pool.totalValueLockedToken1,
      };
      break;
    }

    case 'getPrice': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const pool = await subgraph.getPool(poolAddress);
      
      const tick = parseInt(pool.tick);
      const price = tickToPrice(tick);
      
      result = {
        poolAddress,
        tick,
        sqrtPriceX96: pool.sqrtPrice,
        token0Price: pool.token0Price,
        token1Price: pool.token1Price,
        calculatedPrice: price,
      };
      break;
    }

    case 'getTicks': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const limit = this.getNodeParameter('limit', index) as number;
      
      const ticks = await subgraph.getPoolTicks(poolAddress, limit);
      result = { poolAddress, ticks };
      break;
    }

    case 'getSwaps': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const limit = this.getNodeParameter('limit', index) as number;
      
      const swaps = await subgraph.getPoolSwaps(poolAddress, limit);
      result = { poolAddress, swaps };
      break;
    }

    case 'searchPools': {
      const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
      const limit = this.getNodeParameter('limit', index) as number;
      
      const pools = await subgraph.searchPoolsByToken(tokenAddress, limit);
      result = { tokenAddress, pools };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
