/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['uniswapX'] } },
    options: [
      { name: 'Get Order Info', value: 'getOrderInfo', description: 'Get Uniswap X order information' },
      { name: 'Get Open Orders', value: 'getOpenOrders', description: 'Get open orders for user' },
      { name: 'Get Order Status', value: 'getOrderStatus', description: 'Check order status' },
      { name: 'Get Quote', value: 'getQuote', description: 'Get Uniswap X quote' },
    ],
    default: 'getOrderInfo',
  },
  {
    displayName: 'Order Hash',
    name: 'orderHash',
    type: 'string',
    displayOptions: { show: { resource: ['uniswapX'], operation: ['getOrderInfo', 'getOrderStatus'] } },
    default: '',
    description: 'Order hash to query',
  },
  {
    displayName: 'User Address',
    name: 'userAddress',
    type: 'string',
    displayOptions: { show: { resource: ['uniswapX'], operation: ['getOpenOrders'] } },
    default: '',
    placeholder: 'Leave empty to use wallet address',
    description: 'User address to query orders for',
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    displayOptions: { show: { resource: ['uniswapX'], operation: ['getQuote'] } },
    default: '',
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    displayOptions: { show: { resource: ['uniswapX'], operation: ['getQuote'] } },
    default: '',
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    displayOptions: { show: { resource: ['uniswapX'], operation: ['getQuote'] } },
    default: '',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  let result: Record<string, unknown>;

  // Note: Uniswap X API integration would require API endpoints
  // This is a placeholder implementation showing the structure

  switch (operation) {
    case 'getOrderInfo': {
      const orderHash = this.getNodeParameter('orderHash', index) as string;
      
      result = {
        orderHash,
        status: 'Uniswap X API integration pending',
        note: 'Requires Uniswap X API endpoint configuration in credentials',
      };
      break;
    }

    case 'getOpenOrders': {
      const userAddress = this.getNodeParameter('userAddress', index, '') as string;
      
      result = {
        userAddress: userAddress || 'wallet address',
        orders: [],
        note: 'Uniswap X API integration pending',
      };
      break;
    }

    case 'getOrderStatus': {
      const orderHash = this.getNodeParameter('orderHash', index) as string;
      
      result = {
        orderHash,
        status: 'pending',
        note: 'Uniswap X API integration pending',
      };
      break;
    }

    case 'getQuote': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      
      result = {
        tokenIn,
        tokenOut,
        amount,
        quote: null,
        note: 'Uniswap X API integration pending - use standard quote for now',
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
