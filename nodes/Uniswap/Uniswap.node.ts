/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as swap from './actions/swap';
import * as quote from './actions/quote';
import * as route from './actions/route';
import * as poolV3 from './actions/poolV3';
import * as poolV2 from './actions/poolV2';
import * as position from './actions/position';
import * as liquidityV3 from './actions/liquidityV3';
import * as liquidityV2 from './actions/liquidityV2';
import * as token from './actions/token';
import * as price from './actions/price';
import * as oracle from './actions/oracle';
import * as permit2 from './actions/permit2';
import * as universalRouter from './actions/universalRouter';
import * as uniswapX from './actions/uniswapX';
import * as nftPositionManager from './actions/nftPositionManager';
import * as factory from './actions/factory';
import * as staking from './actions/staking';
import * as governance from './actions/governance';
import * as analytics from './actions/analytics';
import * as subgraph from './actions/subgraph';
import * as multicall from './actions/multicall';
import * as utility from './actions/utility';

export class Uniswap implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Uniswap',
    name: 'uniswap',
    icon: 'file:uniswap.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Interact with Uniswap DEX - swaps, liquidity, analytics',
    defaults: {
      name: 'Uniswap',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'uniswapNetwork',
        required: true,
      },
      {
        name: 'uniswapApi',
        required: false,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Swap', value: 'swap' },
          { name: 'Quote', value: 'quote' },
          { name: 'Route', value: 'route' },
          { name: 'Pool', value: 'pool' },
          { name: 'Pool (V3)', value: 'poolV3' },
          { name: 'Pool (V2)', value: 'poolV2' },
          { name: 'Position', value: 'position' },
          { name: 'Liquidity (V3)', value: 'liquidityV3' },
          { name: 'Liquidity (V2)', value: 'liquidityV2' },
          { name: 'Token', value: 'token' },
          { name: 'Price', value: 'price' },
          { name: 'Oracle', value: 'oracle' },
          { name: 'Permit2', value: 'permit2' },
          { name: 'Universal Router', value: 'universalRouter' },
          { name: 'Uniswap X', value: 'uniswapX' },
          { name: 'NFT Position Manager', value: 'nftPositionManager' },
          { name: 'Factory', value: 'factory' },
          { name: 'Staking', value: 'staking' },
          { name: 'Governance', value: 'governance' },
          { name: 'Analytics', value: 'analytics' },
          { name: 'Subgraph', value: 'subgraph' },
          { name: 'Multicall', value: 'multicall' },
          { name: 'Utility', value: 'utility' },
          { name: 'Mint', value: 'mint' },
          { name: 'Burn', value: 'burn' },
          { name: 'Tick', value: 'tick' },
        ],
        default: 'swap',
      },
      // Swap operations
      ...swap.description,
      // Quote operations
      ...quote.description,
      // Route operations
      ...route.description,
      // Pool operations (newly generated)
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['pool'],
          },
        },
        options: [
          {
            name: 'Get Pool',
            value: 'getPool',
            description: 'Get specific pool information by ID',
            action: 'Get pool information',
          },
          {
            name: 'Get All Pools',
            value: 'getAllPools',
            description: 'Get all pools with filtering options',
            action: 'Get all pools',
          },
          {
            name: 'Get Pool Day Data',
            value: 'getPoolDayData',
            description: 'Get historical daily data for pools',
            action: 'Get pool day data',
          },
          {
            name: 'Get Pool Hour Data',
            value: 'getPoolHourData',
            description: 'Get hourly pool statistics',
            action: 'Get pool hour data',
          },
        ],
        default: 'getPool',
      },
      // Pool V3 operations
      ...poolV3.description,
      // Pool V2 operations
      ...poolV2.description,
      // Position operations
      ...position.description,
      // Liquidity V3 operations
      ...liquidityV3.description,
      // Liquidity V2 operations
      ...liquidityV2.description,
      // Token operations
      ...token.description,
      // Price operations
      ...price.description,
      // Oracle operations
      ...oracle.description,
      // Permit2 operations
      ...permit2.description,
      // Universal Router operations
      ...universalRouter.description,
      // Uniswap X operations
      ...uniswapX.description,
      // NFT Position Manager operations
      ...nftPositionManager.description,
      // Factory operations
      ...factory.description,
      // Staking operations
      ...staking.description,
      // Governance operations
      ...governance.description,
      // Analytics operations
      ...analytics.description,
      // Subgraph operations
      ...subgraph.description,
      // Multicall operations
      ...multicall.description,
      // Utility operations
      ...utility.description,
      // Generated operations for new resources
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['position'] } },
        options: [
          { name: 'Get Position', value: 'getPosition', description: 'Get specific position details', action: 'Get position details' },
          { name: 'Get All Positions', value: 'getAllPositions', description: 'Get positions with filtering by owner or pool', action: 'Get all positions' },
          { name: 'Get Position Snapshots', value: 'getPositionSnapshots', description: 'Get historical position snapshots', action: 'Get position snapshots' }
        ],
        default: 'getPosition',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['mint'] } },
        options: [
          { name: 'Get Mint', value: 'getMint', description: 'Get specific mint transaction details', action: 'Get mint transaction' },
          { name: 'Get All Mints', value: 'getAllMints', description: 'Get mint transactions with filtering', action: 'Get all mint transactions' },
          { name: 'Get Mints By Pool', value: 'getMintsByPool', description: 'Get mint events for specific pool', action: 'Get mints by pool' },
          { name: 'Get Mints By Owner', value: 'getMintsByOwner', description: 'Get mints by liquidity provider', action: 'Get mints by owner' },
        ],
        default: 'getMint',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['burn'] } },
        options: [
          { name: 'Get Burn', value: 'getBurn', description: 'Get specific burn transaction details', action: 'Get burn transaction' },
          { name: 'Get All Burns', value: 'getAllBurns', description: 'Get burn transactions with filtering', action: 'Get all burn transactions' },
          { name: 'Get Burns by Pool', value: 'getBurnsByPool', description: 'Get burn events for specific pool', action: 'Get burns by pool' },
          { name: 'Get Burns by Owner', value: 'getBurnsByOwner', description: 'Get burns by liquidity provider', action: 'Get burns by owner' }
        ],
        default: 'getBurn',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['tick'] } },
        options: [
          { name: 'Get Tick', value: 'getTick', description: 'Get specific tick information', action: 'Get specific tick information' },
          { name: 'Get All Ticks', value: 'getAllTicks', description: 'Get ticks for a pool with filtering', action: 'Get all ticks for a pool' },
          { name: 'Get Tick Day Data', value: 'getTickDayData', description: 'Get historical tick data', action: 'Get historical tick data' },
        ],
        default: 'getTick',
      },
      // Parameters for new resources
      {
        displayName: 'Pool ID',
        name: 'poolId',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['pool'],
            operation: ['getPool'],
          },
        },
        default: '',
        description: 'The ID of the pool to retrieve information for',
      },
      {
        displayName: 'First',
        name: 'first',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['pool'],
            operation: ['getAllPools'],
          },
        },
        default: 10,
        description: 'Number of pools to return',
      },
      {
        displayName: 'Skip',
        name: 'skip',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['pool'],
            operation: ['getAllPools'],
          },
        },
        default: 0,
        description: 'Number of pools to skip',
      },
      {
        displayName: 'Where Clause',
        name: 'where',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['pool'],
            operation: ['getAllPools'],
          },
        },
        default: '',
        description: 'GraphQL where clause for filtering pools (optional)',
        placeholder: '{ volumeUSD_gt: "1000" }',
      },
      {
        displayName: 'Order By',
        name: 'orderBy',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['pool'],
            operation: ['getAllPools'],
          },
        },
        options: [
          { name: 'Created At', value: 'createdAtTimestamp' },
          { name: 'Total Value Locked USD', value: 'totalValueLockedUSD' },
          { name: 'Volume USD', value: 'volumeUSD' },
          { name: 'Fee Growth Global0X128', value: 'feeGrowthGlobal0X128' },
          { name: 'Fee Growth Global1X128', value: 'feeGrowthGlobal1X128' },
        ],
        default: 'totalValueLockedUSD',
        description: 'Field to order pools by',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: INodeExecutionData[] = [];

        switch (resource) {
          case 'swap':
            result = await swap.execute.call(this, i, operation);
            break;
          case 'quote':
            result = await quote.execute.call(this, i, operation);
            break;
          case 'route':
            result = await route.execute.call(this, i, operation);
            break;
          case 'pool':
            result = await executePoolOperations.call(this, items);
            break;
          case 'poolV3':
            result = await poolV3.execute.call(this, i, operation);
            break;
          case 'poolV2':
            result = await poolV2.execute.call(this, i, operation);
            break;
          case 'position':
            result = await position.execute.call(this, i, operation);
            break;
          case 'liquidityV3':
            result = await liquidityV3.execute.call(this, i, operation);
            break;
          case 'liquidityV2':
            result = await liquidityV2.execute.call(this, i, operation);
            break;
          case 'token':
            result = await token.execute.call(this, i, operation);
            break;
          case 'price':
            result = await price.execute.call(this, i, operation);
            break;
          case 'oracle':
            result = await oracle.execute.call(this, i, operation);
            break;
          case 'permit2':
            result = await permit2.execute.call(this, i, operation);
            break;
          case 'universalRouter':
            result = await universalRouter.execute.call(this, i, operation);
            break;
          case 'uniswapX':
            result = await uniswapX.execute.call(this, i, operation);
            break;
          case 'nftPositionManager':
            result = await nftPositionManager.execute.call(this, i, operation);
            break;
          case 'factory':
            result = await factory.execute.call(this, i, operation);
            break;
          case 'staking':
            result = await staking.execute.call(this, i, operation);
            break;
          case 'governance':
            result = await governance.execute.call(this, i, operation);
            break;
          case 'analytics':
            result = await analytics.execute.call(this, i, operation);
            break;
          case 'subgraph':
            result = await subgraph.execute.call(this, i, operation);
            break;
          case 'multicall':
            result = await multicall.execute.call(this, i, operation);
            break;
          case 'utility':
            result = await utility.execute.call(this, i, operation);
            break;
          case 'mint':
            result = await executeMintOperations.call(this, items);
            break;
          case 'burn':
            result = await executeBurnOperations.call(this, items);
            break;
          case 'tick':
            result = await executeTickOperations.call(this, items);
            break;
          default:
            throw new NodeOperationError(
              this.getNode(),
              `Unknown resource: ${resource}`,
              { itemIndex: i },
            );
        }

        returnData.push(...result);
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

// ============================================================
// Resource Handler Functions (from generated code)
// ============================================================

async function executePoolOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('uniswapApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;

      switch (operation) {
        case 'getPool': {
          const poolId = this.getNodeParameter('poolId', i) as string;
          const query = `
            query GetPool($id: ID!) {
              pool(id: $id) {
                id
                token0 {
                  id
                  symbol
                  name
                  decimals
                }
                token1 {
                  id
                  symbol
                  name
                  decimals
                }
                feeTier
                liquidity
                sqrtPrice
                tick
                observationIndex
                volumeToken0
                volumeToken1
                volumeUSD
                untrackedVolumeUSD
                txCount
                collectedFeesToken0
                collectedFeesToken1
                collectedFeesUSD
                totalValueLockedToken0
                totalValueLockedToken1
                totalValueLockedETH
                totalValueLockedUSD
                totalValueLockedUSDUntracked
                createdAtTimestamp
                createdAtBlockNumber
                feeGrowthGlobal0X128
                feeGrowthGlobal1X128
              }
            }
          `;
          const options: any = {
            method: 'POST',
            url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { id: poolId },
            }),
            json: true,
          };
          result = await this.helpers.httpRequest(options) as any;
          result = result.data?.pool || result;
          break;
        }

        case 'getAllPools': {
          const first = this.getNodeParameter('first', i, 10) as number;
          const skip = this.getNodeParameter('skip', i, 0) as number;
          const where = this.getNodeParameter('where', i, '') as string;
          const orderBy = this.getNodeParameter('orderBy', i, 'totalValueLockedUSD') as string;

          let whereClause = '';
          if (where) {
            whereClause = `, where: ${where}`;
          }

          const query = `
            query GetAllPools($first: Int!, $skip: Int!, $orderBy: String!) {
              pools(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: desc${whereClause}) {
                id
                token0 {
                  id
                  symbol
                  name
                  decimals
                }
                token1 {
                  id
                  symbol
                  name
                  decimals
                }
                feeTier
                liquidity
                sqrtPrice
                tick
                volumeToken0
                volumeToken1
                volumeUSD
                txCount
                totalValueLockedToken0
                totalValueLockedToken1
                totalValueLockedUSD
                createdAtTimestamp
              }
            }
          `;
          const options: any = {
            method: 'POST',
            url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: query.replace('${whereClause}', whereClause),
              variables: { first, skip, orderBy },
            }),
            json: true,
          };
          result = await this.helpers.httpRequest(options) as any;
          result = result.data?.pools || result;
          break;
        }

        case 'getPoolDayData': {
          const poolId = this.getNodeParameter('poolId', i) as string;
          const date = this.getNodeParameter('date', i, '') as string;

          let whereClause = `{ pool: "${poolId}" }`;
          if (date) {
            const timestamp = Math.floor(new Date(date).getTime() / 1000);
            whereClause = `{ pool: "${poolId}", date: ${timestamp} }`;
          }

          const query = `
            query GetPoolDayData($where: PoolDayData_filter!) {
              poolDayDatas(where: $where, orderBy: date, orderDirection: desc, first: 100) {
                id
                date
                pool {
                  id
                  token0 {
                    symbol
                  }
                  token1 {
                    symbol
                  }
                }
                liquidity
                sqrtPrice
                tick
                volumeToken0
                volumeToken1
                volumeUSD
                txCount
                open
                high
                low
                close
                feeGrowthGlobal0X128
                feeGrowthGlobal1X128
                tvlUSD
              }
            }
          `;
          const options: any = {
            method: 'POST',
            url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { where: JSON.parse(whereClause) },
            }),
            json: true,
          };
          result = await this.helpers.httpRequest(options) as any;
          result = result.data?.poolDayDatas || result;
          break;
        }

        case 'getPoolHourData': {
          const poolId = this.getNodeParameter('poolId', i) as string;
          const timestamp = this.getNodeParameter('timestamp', i, 0) as number;

          let whereClause = `{ pool: "${poolId}" }`;
          if (timestamp > 0) {
            whereClause = `{ pool: "${poolId}", periodStartUnix: ${timestamp} }`;
          }

          const query = `
            query GetPoolHourData($where: PoolHourData_filter!) {
              poolHourDatas(where: $where, orderBy: periodStartUnix, orderDirection: desc, first: 100) {
                id
                periodStartUnix
                pool {
                  id
                  token0 {
                    symbol
                  }
                  token1 {
                    symbol
                  }
                }
                liquidity
                sqrtPrice
                tick
                volumeToken0
                volumeToken1
                volumeUSD
                txCount
                open
                high
                low
                close
                feeGrowthGlobal0X128
                feeGrowthGlobal1X128
                tvlUSD
              }
            }
          `;
          const options: any = {
            method: 'POST',
            url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { where: JSON.parse(whereClause) },
            }),
            json: true,
          };
          result = await this.helpers.httpRequest(options) as any;
          result = result.data?.poolHourDatas || result;
          break;
        }

        default:
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation: ${operation}`,
            { itemIndex: i },
          );
      }

      returnData.push({
        json: result,
        pairedItem: { item: i },
      });
    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },
        });
      } else {
        throw error;
      }
    }
  }

  return returnData;
}

async function executeMintOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('uniswapApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;

      switch (operation) {
        case 'getMint': {
          const mintId = this.getNodeParameter('mintId', i) as string;
          const query = `
            query GetMint($mintId: ID!) {
              mint(id: $mintId) {
                id
                transaction {
                  id
                  blockNumber
                  timestamp
                }
                pool {
                  id
                  token0 {
                    id
                    symbol
                    name
                  }
                  token1 {
                    id
                    symbol
                    name
                  }
                }
                owner
                sender
                origin
                amount
                amount0
                amount1
                amountUSD
                tickLower
                tickUpper
                logIndex
              }
            }
          `;
          const options: any = {
            method: 'POST',
            url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { mintId },
            }),
            json: true,
          };
          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
      }

      if (result.errors) {
        throw new NodeOperationError(this.getNode(), `GraphQL Error: ${JSON.stringify(result.errors)}`);
      }

      returnData.push({ json: result.data, pairedItem: { item: i } });
    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
      } else {
        throw error;
      }
    }
  }

  return returnData;
}

async function executeBurnOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('uniswapApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;
      let query: string = '';

      switch (operation) {
        case 'getBurn': {
          const burnId = this.getNodeParameter('burnId', i) as string;
          query = `
            query {
              burn(id: "${burnId}") {
                id
                transaction {
                  id
                  timestamp
                  blockNumber
                }
                pool {
                  id
                  token0 {
                    id
                    symbol
                    name
                  }
                  token1 {
                    id
                    symbol
                    name
                  }
                }
                owner
                origin
                amount
                amount0
                amount1
                amountUSD
                tickLower
                tickUpper
                logIndex
              }
            }
          `;
          break;
        }

        default:
          throw new NodeOperationError(this.getNode(), 'Unknown operation: ' + operation);
      }

      const options: any = {
        method: 'POST',
        url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          query: query,
        },
        json: true,
      };

      if (credentials.apiKey) {
        options.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }

      result = await this.helpers.httpRequest(options) as any;

      if (result.errors) {
        throw new NodeOperationError(this.getNode(), `GraphQL Error: ${JSON.stringify(result.errors)}`);
      }

      returnData.push({ json: result.data, pairedItem: { item: i } });
    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
      } else {
        throw error;
      }
    }
  }

  return returnData;
}

async function executeTickOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('uniswapApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;

      switch (operation) {
        case 'getTick': {
          const poolAddress = this.getNodeParameter('poolAddress', i) as string;
          const tickIdx = this.getNodeParameter('tickIdx', i) as number;

          const query = `
            query {
              ticks(where: { pool: "${poolAddress.toLowerCase()}", tickIdx: "${tickIdx}" }) {
                id
                tickIdx
                pool {
                  id
                  token0 {
                    symbol
                    decimals
                  }
                  token1 {
                    symbol
                    decimals
                  }
                }
                liquidityGross
                liquidityNet
                price0
                price1
                volumeToken0
                volumeToken1
                volumeUSD
                untrackedVolumeUSD
                feesUSD
                collectedFeesToken0
                collectedFeesToken1
                collectedFeesUSD
                createdAtTimestamp
                createdAtBlockNumber
                liquidityProviderCount
                feeGrowthOutside0X128
                feeGrowthOutside1X128
              }
            }
          `;

          const options: any = {
            method: 'POST',
            url: credentials.baseUrl || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              query: query,
            },
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
      }

      if (result.errors) {
        throw new NodeOperationError(this.getNode(), `GraphQL error: ${JSON.stringify(result.errors)}`);
      }

      returnData.push({
        json: result.data,
        pairedItem: { item: i },
      });

    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },
        });
      } else {
        throw error;
      }
    }
  }

  return returnData;
}