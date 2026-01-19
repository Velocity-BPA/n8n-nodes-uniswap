/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';
import { tickToPrice } from '../../constants';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['oracle'] } },
    options: [
      { name: 'Get TWAP', value: 'getTWAP', description: 'Get time-weighted average price' },
      { name: 'Get Observations', value: 'getObservations', description: 'Get oracle observations' },
      { name: 'Get Cardinality', value: 'getCardinality', description: 'Get observation cardinality' },
      { name: 'Increase Cardinality', value: 'increaseCardinality', description: 'Increase observation slots' },
    ],
    default: 'getTWAP',
  },
  {
    displayName: 'Pool Address',
    name: 'poolAddress',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['oracle'] } },
    default: '',
    description: 'Pool contract address',
  },
  {
    displayName: 'Seconds Ago',
    name: 'secondsAgo',
    type: 'number',
    displayOptions: { show: { resource: ['oracle'], operation: ['getTWAP'] } },
    default: 1800,
    description: 'Seconds ago for TWAP calculation (e.g., 1800 = 30 min)',
  },
  {
    displayName: 'Observation Index',
    name: 'observationIndex',
    type: 'number',
    displayOptions: { show: { resource: ['oracle'], operation: ['getObservations'] } },
    default: 0,
    description: 'Observation index to retrieve',
  },
  {
    displayName: 'New Cardinality',
    name: 'newCardinality',
    type: 'number',
    displayOptions: { show: { resource: ['oracle'], operation: ['increaseCardinality'] } },
    default: 100,
    description: 'New observation cardinality (must be greater than current)',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  const poolAddress = this.getNodeParameter('poolAddress', index) as string;
  let result: Record<string, unknown>;

  const poolAbi = [
    'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)',
    'function observations(uint256) view returns (uint32,int56,uint160,bool)',
    'function observe(uint32[]) view returns (int56[],uint160[])',
    'function increaseObservationCardinalityNext(uint16)',
  ];

  switch (operation) {
    case 'getTWAP': {
      const secondsAgo = this.getNodeParameter('secondsAgo', index) as number;
      
      // Get observations at two points in time
      const secondsAgos = [secondsAgo, 0];
      const [tickCumulatives] = await client.call(poolAddress, poolAbi, 'observe', [secondsAgos]);

      // Calculate TWAP tick
      const tickCumulative0 = BigInt(tickCumulatives[0].toString());
      const tickCumulative1 = BigInt(tickCumulatives[1].toString());
      const tickDiff = tickCumulative1 - tickCumulative0;
      const twapTick = Number(tickDiff / BigInt(secondsAgo));

      const twapPrice = tickToPrice(twapTick);

      result = {
        poolAddress,
        secondsAgo,
        twapTick,
        twapPrice,
        twapPriceInverse: 1 / twapPrice,
      };
      break;
    }

    case 'getObservations': {
      const observationIndex = this.getNodeParameter('observationIndex', index) as number;
      
      const observation = await client.call(poolAddress, poolAbi, 'observations', [observationIndex]);

      result = {
        poolAddress,
        index: observationIndex,
        blockTimestamp: observation[0],
        tickCumulative: observation[1].toString(),
        secondsPerLiquidityCumulativeX128: observation[2].toString(),
        initialized: observation[3],
      };
      break;
    }

    case 'getCardinality': {
      const slot0 = await client.call(poolAddress, poolAbi, 'slot0', []);

      result = {
        poolAddress,
        observationIndex: slot0[2],
        observationCardinality: slot0[3],
        observationCardinalityNext: slot0[4],
      };
      break;
    }

    case 'increaseCardinality': {
      const newCardinality = this.getNodeParameter('newCardinality', index) as number;
      
      const tx = await client.execute(
        poolAddress,
        poolAbi,
        'increaseObservationCardinalityNext',
        [newCardinality],
      );

      result = {
        transactionHash: tx.hash,
        poolAddress,
        newCardinality,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
