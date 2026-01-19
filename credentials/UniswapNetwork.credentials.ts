/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class UniswapNetwork implements ICredentialType {
  name = 'uniswapNetwork';
  displayName = 'Uniswap Network';
  documentationUrl = 'https://docs.uniswap.org/';
  properties: INodeProperties[] = [
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      default: 'ethereum',
      options: [
        { name: 'Ethereum Mainnet', value: 'ethereum' },
        { name: 'Arbitrum One', value: 'arbitrum' },
        { name: 'Optimism', value: 'optimism' },
        { name: 'Polygon', value: 'polygon' },
        { name: 'Base', value: 'base' },
        { name: 'BNB Chain', value: 'bsc' },
        { name: 'Avalanche C-Chain', value: 'avalanche' },
        { name: 'Celo', value: 'celo' },
        { name: 'Blast', value: 'blast' },
        { name: 'zkSync Era', value: 'zksync' },
        { name: 'Custom', value: 'custom' },
      ],
      description: 'The blockchain network to connect to',
    },
    {
      displayName: 'RPC Endpoint URL',
      name: 'rpcUrl',
      type: 'string',
      default: '',
      placeholder: 'https://mainnet.infura.io/v3/YOUR_API_KEY',
      description: 'The RPC endpoint URL for the selected network. Required for custom networks.',
      typeOptions: {
        password: false,
      },
    },
    {
      displayName: 'Private Key',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'The private key for signing transactions. Keep this secure and never share it.',
    },
    {
      displayName: 'Chain ID',
      name: 'chainId',
      type: 'number',
      default: 1,
      description: 'The chain ID of the network. Auto-populated for known networks.',
      displayOptions: {
        show: {
          network: ['custom'],
        },
      },
    },
    {
      displayName: 'Subgraph Endpoint',
      name: 'subgraphUrl',
      type: 'string',
      default: '',
      placeholder: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      description: 'Optional: Custom subgraph endpoint for querying Uniswap data',
    },
    {
      displayName: 'Enable Permit2',
      name: 'permit2Enabled',
      type: 'boolean',
      default: true,
      description: 'Whether to enable Permit2 for gasless token approvals',
    },
    {
      displayName: 'Max Gas Price (Gwei)',
      name: 'maxGasPrice',
      type: 'number',
      default: 100,
      description: 'Maximum gas price to use for transactions in Gwei',
    },
    {
      displayName: 'Slippage Tolerance (%)',
      name: 'slippageTolerance',
      type: 'number',
      default: 0.5,
      description: 'Default slippage tolerance for swaps as a percentage',
    },
    {
      displayName: 'Transaction Deadline (minutes)',
      name: 'deadline',
      type: 'number',
      default: 20,
      description: 'Default deadline for transactions in minutes',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.rpcUrl || "https://eth.llamarpc.com"}}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    },
  };
}
