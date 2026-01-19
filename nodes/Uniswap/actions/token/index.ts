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
    displayOptions: { show: { resource: ['token'] } },
    options: [
      { name: 'Get Token Info', value: 'getInfo', description: 'Get token information' },
      { name: 'Get Balance', value: 'getBalance', description: 'Get token balance' },
      { name: 'Get Allowance', value: 'getAllowance', description: 'Get token allowance' },
      { name: 'Approve', value: 'approve', description: 'Approve token spending' },
      { name: 'Get Token Stats', value: 'getStats', description: 'Get token statistics from subgraph' },
    ],
    default: 'getInfo',
  },
  {
    displayName: 'Token Address',
    name: 'tokenAddress',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['token'] } },
    default: '',
    description: 'Token contract address',
  },
  {
    displayName: 'Wallet Address',
    name: 'walletAddress',
    type: 'string',
    displayOptions: { show: { resource: ['token'], operation: ['getBalance', 'getAllowance'] } },
    default: '',
    placeholder: 'Leave empty to use connected wallet',
    description: 'Address to check balance/allowance for',
  },
  {
    displayName: 'Spender Address',
    name: 'spenderAddress',
    type: 'string',
    displayOptions: { show: { resource: ['token'], operation: ['getAllowance', 'approve'] } },
    default: '',
    placeholder: 'Use SwapRouter02 address',
    description: 'Address to check/grant allowance for',
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    displayOptions: { show: { resource: ['token'], operation: ['approve'] } },
    default: '',
    placeholder: 'Leave empty for max approval',
    description: 'Amount to approve (human readable)',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
  let result: Record<string, unknown>;

  switch (operation) {
    case 'getInfo': {
      const info = await client.getTokenInfo(tokenAddress);
      result = info;
      break;
    }

    case 'getBalance': {
      const walletAddress = this.getNodeParameter('walletAddress', index, '') as string;
      const address = walletAddress || await client.getAddress();
      
      const balance = await client.getTokenBalance(tokenAddress, address);
      const info = await client.getTokenInfo(tokenAddress);
      
      result = {
        tokenAddress,
        wallet: address,
        balance: balance.toString(),
        balanceFormatted: Number(balance) / Math.pow(10, info.decimals),
        ...info,
      };
      break;
    }

    case 'getAllowance': {
      const walletAddress = this.getNodeParameter('walletAddress', index, '') as string;
      const spenderAddress = this.getNodeParameter('spenderAddress', index) as string;
      const address = walletAddress || await client.getAddress();
      
      const allowance = await client.getAllowance(tokenAddress, address, spenderAddress);
      const info = await client.getTokenInfo(tokenAddress);
      
      const isUnlimited = BigInt(allowance) > BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935') / 2n;
      
      result = {
        tokenAddress,
        owner: address,
        spender: spenderAddress,
        allowance: allowance.toString(),
        allowanceFormatted: Number(allowance) / Math.pow(10, info.decimals),
        isUnlimited,
        ...info,
      };
      break;
    }

    case 'approve': {
      const spenderAddress = this.getNodeParameter('spenderAddress', index) as string;
      const amount = this.getNodeParameter('amount', index, '') as string;
      
      let approvalAmount: string;
      if (!amount) {
        // Max approval (2^256 - 1)
        approvalAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      } else {
        const info = await client.getTokenInfo(tokenAddress);
        approvalAmount = (BigInt(Math.floor(parseFloat(amount) * Math.pow(10, info.decimals)))).toString();
      }

      const tx = await client.approveToken(tokenAddress, spenderAddress, approvalAmount);
      
      result = {
        transactionHash: tx.hash,
        tokenAddress,
        spender: spenderAddress,
        amount: amount || 'unlimited',
      };
      break;
    }

    case 'getStats': {
      const subgraph = await SubgraphClient.fromCredentials(this);
      const stats = await subgraph.getToken(tokenAddress);
      result = stats;
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
