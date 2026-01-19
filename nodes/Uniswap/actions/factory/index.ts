/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['factory'] } },
    options: [
      { name: 'Get Pool V3', value: 'getPoolV3', description: 'Get V3 pool address' },
      { name: 'Get Pair V2', value: 'getPairV2', description: 'Get V2 pair address' },
      { name: 'Get Fee Tier Tick Spacing', value: 'getTickSpacing', description: 'Get tick spacing for fee tier' },
      { name: 'Create Pool V3', value: 'createPoolV3', description: 'Create a new V3 pool' },
      { name: 'Create Pair V2', value: 'createPairV2', description: 'Create a new V2 pair' },
    ],
    default: 'getPoolV3',
  },
  {
    displayName: 'Token A',
    name: 'tokenA',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['factory'] } },
    default: '',
    description: 'Address of token A',
  },
  {
    displayName: 'Token B',
    name: 'tokenB',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['factory'] } },
    default: '',
    description: 'Address of token B',
  },
  {
    displayName: 'Fee Tier',
    name: 'feeTier',
    type: 'options',
    displayOptions: { show: { resource: ['factory'], operation: ['getPoolV3', 'getTickSpacing', 'createPoolV3'] } },
    options: [
      { name: '0.01%', value: 100 },
      { name: '0.05%', value: 500 },
      { name: '0.3%', value: 3000 },
      { name: '1%', value: 10000 },
    ],
    default: 3000,
  },
  {
    displayName: 'Initial Price',
    name: 'initialPrice',
    type: 'number',
    displayOptions: { show: { resource: ['factory'], operation: ['createPoolV3'] } },
    default: 1,
    description: 'Initial price of token0 in terms of token1',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  const contracts = client.getContracts();
  const tokenA = this.getNodeParameter('tokenA', index) as string;
  const tokenB = this.getNodeParameter('tokenB', index) as string;
  let result: Record<string, unknown>;

  const factoryV3Abi = [
    'function getPool(address,address,uint24) view returns (address)',
    'function feeAmountTickSpacing(uint24) view returns (int24)',
    'function createPool(address,address,uint24) returns (address)',
  ];

  const factoryV2Abi = [
    'function getPair(address,address) view returns (address)',
    'function createPair(address,address) returns (address)',
    'function allPairsLength() view returns (uint256)',
  ];

  switch (operation) {
    case 'getPoolV3': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      
      const poolAddress = await client.call(contracts.factoryV3, factoryV3Abi, 'getPool', [tokenA, tokenB, feeTier]);
      
      const exists = poolAddress !== '0x0000000000000000000000000000000000000000';

      result = {
        tokenA,
        tokenB,
        feeTier,
        poolAddress,
        exists,
      };
      break;
    }

    case 'getPairV2': {
      const pairAddress = await client.call(contracts.factoryV2, factoryV2Abi, 'getPair', [tokenA, tokenB]);
      
      const exists = pairAddress !== '0x0000000000000000000000000000000000000000';

      result = {
        tokenA,
        tokenB,
        pairAddress,
        exists,
      };
      break;
    }

    case 'getTickSpacing': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      
      const tickSpacing = await client.call(contracts.factoryV3, factoryV3Abi, 'feeAmountTickSpacing', [feeTier]);

      result = {
        feeTier,
        tickSpacing,
        feePercent: `${feeTier / 10000}%`,
      };
      break;
    }

    case 'createPoolV3': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      const initialPrice = this.getNodeParameter('initialPrice', index) as number;

      // Check if pool already exists
      const existingPool = await client.call(contracts.factoryV3, factoryV3Abi, 'getPool', [tokenA, tokenB, feeTier]);
      if (existingPool !== '0x0000000000000000000000000000000000000000') {
        throw new NodeOperationError(this.getNode(), 'Pool already exists', { itemIndex: index });
      }

      // Create pool
      const tx = await client.execute(
        contracts.factoryV3,
        factoryV3Abi,
        'createPool',
        [tokenA, tokenB, feeTier],
      );

      // Calculate sqrtPriceX96 for initialization
      const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(initialPrice) * 2 ** 96));

      result = {
        transactionHash: tx.hash,
        tokenA,
        tokenB,
        feeTier,
        initialPrice,
        sqrtPriceX96: sqrtPriceX96.toString(),
        note: 'Pool created. Initialize with NonfungiblePositionManager.createAndInitializePoolIfNecessary',
      };
      break;
    }

    case 'createPairV2': {
      // Check if pair already exists
      const existingPair = await client.call(contracts.factoryV2, factoryV2Abi, 'getPair', [tokenA, tokenB]);
      if (existingPair !== '0x0000000000000000000000000000000000000000') {
        throw new NodeOperationError(this.getNode(), 'Pair already exists', { itemIndex: index });
      }

      const tx = await client.execute(
        contracts.factoryV2,
        factoryV2Abi,
        'createPair',
        [tokenA, tokenB],
      );

      result = {
        transactionHash: tx.hash,
        tokenA,
        tokenB,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
