/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { SubgraphClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['analytics'] } },
    options: [
      { name: 'Get Protocol Stats', value: 'getProtocolStats', description: 'Get overall protocol statistics' },
      { name: 'Get Top Pools', value: 'getTopPools', description: 'Get top pools by TVL or volume' },
      { name: 'Get Top Tokens', value: 'getTopTokens', description: 'Get top tokens by volume' },
      { name: 'Get Pool Analytics', value: 'getPoolAnalytics', description: 'Get detailed pool analytics' },
      { name: 'Get Historical Data', value: 'getHistoricalData', description: 'Get historical protocol data' },
    ],
    default: 'getProtocolStats',
  },
  {
    displayName: 'Sort By',
    name: 'sortBy',
    type: 'options',
    displayOptions: { show: { resource: ['analytics'], operation: ['getTopPools', 'getTopTokens'] } },
    options: [
      { name: 'TVL (Total Value Locked)', value: 'totalValueLockedUSD' },
      { name: 'Volume (24h)', value: 'volumeUSD' },
      { name: 'Fee Revenue (24h)', value: 'feesUSD' },
    ],
    default: 'totalValueLockedUSD',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: { show: { resource: ['analytics'], operation: ['getTopPools', 'getTopTokens', 'getHistoricalData'] } },
    default: 10,
    description: 'Number of results',
  },
  {
    displayName: 'Pool Address',
    name: 'poolAddress',
    type: 'string',
    displayOptions: { show: { resource: ['analytics'], operation: ['getPoolAnalytics'] } },
    default: '',
    description: 'Pool address for detailed analytics',
  },
  {
    displayName: 'Period',
    name: 'period',
    type: 'options',
    displayOptions: { show: { resource: ['analytics'], operation: ['getHistoricalData'] } },
    options: [
      { name: 'Daily', value: 'day' },
      { name: 'Hourly', value: 'hour' },
    ],
    default: 'day',
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
    case 'getProtocolStats': {
      const stats = await subgraph.getProtocolStats();
      result = stats;
      break;
    }

    case 'getTopPools': {
      const sortBy = this.getNodeParameter('sortBy', index) as string;
      const limit = this.getNodeParameter('limit', index) as number;

      const query = `{
        pools(first: ${limit}, orderBy: ${sortBy}, orderDirection: desc) {
          id
          token0 { id symbol name decimals }
          token1 { id symbol name decimals }
          feeTier
          liquidity
          sqrtPrice
          tick
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          volumeUSD
          feesUSD
          txCount
        }
      }`;

      const data = await subgraph.queryV3(query);
      result = { pools: data.pools, sortedBy: sortBy };
      break;
    }

    case 'getTopTokens': {
      const sortBy = this.getNodeParameter('sortBy', index) as string;
      const limit = this.getNodeParameter('limit', index) as number;

      const query = `{
        tokens(first: ${limit}, orderBy: ${sortBy}, orderDirection: desc) {
          id
          symbol
          name
          decimals
          totalValueLockedUSD
          volumeUSD
          feesUSD
          txCount
          poolCount
        }
      }`;

      const data = await subgraph.queryV3(query);
      result = { tokens: data.tokens, sortedBy: sortBy };
      break;
    }

    case 'getPoolAnalytics': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;

      const query = `{
        pool(id: "${poolAddress.toLowerCase()}") {
          id
          token0 { id symbol name decimals }
          token1 { id symbol name decimals }
          feeTier
          liquidity
          sqrtPrice
          tick
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          volumeUSD
          feesUSD
          txCount
          token0Price
          token1Price
          poolDayData(first: 30, orderBy: date, orderDirection: desc) {
            date
            volumeUSD
            tvlUSD
            feesUSD
            open
            high
            low
            close
          }
        }
      }`;

      const data = await subgraph.queryV3(query);
      
      if (!data.pool) {
        throw new NodeOperationError(this.getNode(), 'Pool not found', { itemIndex: index });
      }

      // Calculate additional metrics
      const pool = data.pool;
      const dayData = pool.poolDayData || [];
      
      const avgDailyVolume = dayData.length > 0 
        ? dayData.reduce((sum: number, d: { volumeUSD: string }) => sum + parseFloat(d.volumeUSD), 0) / dayData.length 
        : 0;
      
      const avgDailyFees = dayData.length > 0
        ? dayData.reduce((sum: number, d: { feesUSD: string }) => sum + parseFloat(d.feesUSD), 0) / dayData.length
        : 0;

      result = {
        ...pool,
        analytics: {
          avgDailyVolume,
          avgDailyFees,
          estimatedAPR: pool.totalValueLockedUSD > 0 
            ? (avgDailyFees * 365 / parseFloat(pool.totalValueLockedUSD)) * 100 
            : 0,
        },
      };
      break;
    }

    case 'getHistoricalData': {
      const period = this.getNodeParameter('period', index) as string;
      const limit = this.getNodeParameter('limit', index) as number;

      const entityName = period === 'day' ? 'uniswapDayDatas' : 'uniswapHourDatas';
      const dateField = period === 'day' ? 'date' : 'periodStartUnix';

      const query = `{
        ${entityName}(first: ${limit}, orderBy: ${dateField}, orderDirection: desc) {
          ${dateField}
          volumeUSD
          tvlUSD
          feesUSD
          txCount
        }
      }`;

      const data = await subgraph.queryV3(query);
      result = { 
        period, 
        data: data[entityName],
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
