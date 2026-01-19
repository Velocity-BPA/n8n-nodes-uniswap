/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';
import { createPermitSingle, signPermit, getDeadline } from '../../utils';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['permit2'] } },
    options: [
      { name: 'Get Allowance', value: 'getAllowance', description: 'Get Permit2 allowance' },
      { name: 'Approve Token', value: 'approve', description: 'Approve token for Permit2' },
      { name: 'Sign Permit', value: 'signPermit', description: 'Sign a Permit2 permit' },
      { name: 'Get Nonce', value: 'getNonce', description: 'Get permit nonce' },
      { name: 'Revoke', value: 'revoke', description: 'Revoke Permit2 approval' },
    ],
    default: 'getAllowance',
  },
  {
    displayName: 'Token Address',
    name: 'tokenAddress',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['permit2'] } },
    default: '',
    description: 'Token contract address',
  },
  {
    displayName: 'Spender Address',
    name: 'spenderAddress',
    type: 'string',
    displayOptions: { show: { resource: ['permit2'], operation: ['getAllowance', 'signPermit', 'revoke'] } },
    default: '',
    description: 'Spender address (e.g., Universal Router)',
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    displayOptions: { show: { resource: ['permit2'], operation: ['signPermit'] } },
    default: '',
    placeholder: 'Leave empty for max amount',
    description: 'Amount to permit',
  },
  {
    displayName: 'Expiration (seconds)',
    name: 'expiration',
    type: 'number',
    displayOptions: { show: { resource: ['permit2'], operation: ['signPermit'] } },
    default: 86400,
    description: 'Permit expiration in seconds from now',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
  const contracts = client.getContracts();
  let result: Record<string, unknown>;

  const permit2Abi = [
    'function allowance(address,address,address) view returns (uint160,uint48,uint48)',
    'function approve(address,address,uint160,uint48)',
    'function lockdown((address,address)[])',
  ];

  switch (operation) {
    case 'getAllowance': {
      const spenderAddress = this.getNodeParameter('spenderAddress', index) as string;
      const owner = await client.getAddress();
      
      const allowance = await client.call(contracts.permit2, permit2Abi, 'allowance', [owner, tokenAddress, spenderAddress]);

      result = {
        tokenAddress,
        owner,
        spender: spenderAddress,
        amount: allowance[0].toString(),
        expiration: allowance[1],
        nonce: allowance[2],
        isExpired: allowance[1] < Math.floor(Date.now() / 1000),
      };
      break;
    }

    case 'approve': {
      // First approve token to Permit2 contract
      const maxApproval = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const tx = await client.approveToken(tokenAddress, contracts.permit2, maxApproval);

      result = {
        transactionHash: tx.hash,
        tokenAddress,
        spender: contracts.permit2,
        amount: 'unlimited',
      };
      break;
    }

    case 'signPermit': {
      const spenderAddress = this.getNodeParameter('spenderAddress', index) as string;
      const amount = this.getNodeParameter('amount', index, '') as string;
      const expiration = this.getNodeParameter('expiration', index) as number;

      const owner = await client.getAddress();
      const chainId = client.getChainId();

      // Get current nonce
      const allowance = await client.call(contracts.permit2, permit2Abi, 'allowance', [owner, tokenAddress, spenderAddress]);
      const nonce = allowance[2];

      const permitAmount = amount 
        ? BigInt(Math.floor(parseFloat(amount) * 1e18)).toString()
        : '1461501637330902918203684832716283019655932542975'; // type(uint160).max

      const deadline = getDeadline(expiration);

      const permit = createPermitSingle(
        tokenAddress,
        permitAmount,
        Math.floor(Date.now() / 1000) + expiration,
        nonce,
        spenderAddress,
        deadline,
      );

      // Sign the permit
      const signer = client.getSigner();
      if (!signer) {
        throw new NodeOperationError(this.getNode(), 'Wallet required for signing', { itemIndex: index });
      }

      const signature = await signPermit(signer, chainId, contracts.permit2, permit);

      result = {
        permit,
        signature,
        owner,
        spender: spenderAddress,
        tokenAddress,
        amount: permitAmount,
        deadline,
      };
      break;
    }

    case 'getNonce': {
      const spenderAddress = this.getNodeParameter('spenderAddress', index) as string;
      const owner = await client.getAddress();
      
      const allowance = await client.call(contracts.permit2, permit2Abi, 'allowance', [owner, tokenAddress, spenderAddress]);

      result = {
        tokenAddress,
        owner,
        spender: spenderAddress,
        nonce: allowance[2],
      };
      break;
    }

    case 'revoke': {
      const spenderAddress = this.getNodeParameter('spenderAddress', index) as string;
      
      // Set allowance to 0 with expiration in the past
      const tx = await client.execute(
        contracts.permit2,
        permit2Abi,
        'approve',
        [tokenAddress, spenderAddress, '0', '0'],
      );

      result = {
        transactionHash: tx.hash,
        tokenAddress,
        spender: spenderAddress,
        revoked: true,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
