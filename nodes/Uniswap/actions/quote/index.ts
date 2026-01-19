/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { QuoterClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['quote'] } },
    options: [
      { name: 'Exact Input Single', value: 'exactInputSingle', description: 'Quote for exact input single hop' },
      { name: 'Exact Output Single', value: 'exactOutputSingle', description: 'Quote for exact output single hop' },
      { name: 'Exact Input Multi-hop', value: 'exactInput', description: 'Quote for exact input multi-hop' },
      { name: 'Exact Output Multi-hop', value: 'exactOutput', description: 'Quote for exact output multi-hop' },
      { name: 'Best Quote', value: 'bestQuote', description: 'Find the best quote across all fee tiers' },
      { name: 'Compare Fee Tiers', value: 'compareFees', description: 'Compare quotes across all fee tiers' },
    ],
    default: 'exactInputSingle',
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['quote'] } },
    default: '',
    placeholder: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    description: 'Address of the input token',
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['quote'] } },
    default: '',
    placeholder: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Address of the output token',
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['quote'] } },
    default: '',
    placeholder: '1.0',
    description: 'Amount of token (human readable)',
  },
  {
    displayName: 'Fee Tier',
    name: 'feeTier',
    type: 'options',
    displayOptions: { show: { resource: ['quote'], operation: ['exactInputSingle', 'exactOutputSingle'] } },
    options: [
      { name: '0.01% (Stable pairs)', value: 100 },
      { name: '0.05% (Stable/common pairs)', value: 500 },
      { name: '0.3% (Most pairs)', value: 3000 },
      { name: '1% (Exotic pairs)', value: 10000 },
    ],
    default: 3000,
    description: 'Pool fee tier',
  },
  {
    displayName: 'Path',
    name: 'path',
    type: 'string',
    displayOptions: { show: { resource: ['quote'], operation: ['exactInput', 'exactOutput'] } },
    default: '',
    placeholder: '0xToken1,3000,0xToken2,500,0xToken3',
    description: 'Encoded path: token,fee,token,fee,token',
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

  const quoter = await QuoterClient.fromCredentials(this);
  let result: Record<string, unknown>;

  switch (operation) {
    case 'exactInputSingle': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      result = await quoter.quoteExactInputSingle(tokenIn, tokenOut, amount, feeTier);
      break;
    }

    case 'exactOutputSingle': {
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      result = await quoter.quoteExactOutputSingle(tokenIn, tokenOut, amount, feeTier);
      break;
    }

    case 'exactInput': {
      const path = this.getNodeParameter('path', index) as string;
      result = await quoter.quoteExactInput(path, amount);
      break;
    }

    case 'exactOutput': {
      const path = this.getNodeParameter('path', index) as string;
      result = await quoter.quoteExactOutput(path, amount);
      break;
    }

    case 'bestQuote': {
      result = await quoter.getBestQuote(tokenIn, tokenOut, amount);
      break;
    }

    case 'compareFees': {
      result = await quoter.compareFeeTiers(tokenIn, tokenOut, amount);
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
