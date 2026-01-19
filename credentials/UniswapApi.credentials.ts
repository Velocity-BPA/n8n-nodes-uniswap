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

export class UniswapApi implements ICredentialType {
  name = 'uniswapApi';
  displayName = 'Uniswap API';
  documentationUrl = 'https://docs.uniswap.org/api/';
  properties: INodeProperties[] = [
    {
      displayName: 'API Endpoint',
      name: 'apiEndpoint',
      type: 'string',
      default: 'https://api.uniswap.org',
      description: 'The Uniswap API endpoint',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'API key for Uniswap API (if applicable)',
    },
    {
      displayName: 'V2 Subgraph URL',
      name: 'subgraphV2Url',
      type: 'string',
      default: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
      description: 'The Graph subgraph URL for Uniswap V2',
    },
    {
      displayName: 'V3 Subgraph URL',
      name: 'subgraphV3Url',
      type: 'string',
      default: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      description: 'The Graph subgraph URL for Uniswap V3',
    },
    {
      displayName: 'Routing API Endpoint',
      name: 'routingApiEndpoint',
      type: 'string',
      default: 'https://api.uniswap.org/v1',
      description: 'The Uniswap routing API endpoint for best swap routes',
    },
    {
      displayName: 'Uniswap X API Endpoint',
      name: 'uniswapXEndpoint',
      type: 'string',
      default: 'https://api.uniswap.org/x/v1',
      description: 'The Uniswap X API endpoint for intent-based trading',
    },
    {
      displayName: 'Request Timeout (ms)',
      name: 'timeout',
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
    {
      displayName: 'Enable Caching',
      name: 'enableCaching',
      type: 'boolean',
      default: true,
      description: 'Whether to enable caching for API responses',
    },
    {
      displayName: 'Cache TTL (seconds)',
      name: 'cacheTtl',
      type: 'number',
      default: 60,
      description: 'Cache time-to-live in seconds',
      displayOptions: {
        show: {
          enableCaching: [true],
        },
      },
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.apiEndpoint}}',
      url: '/v1/health',
      method: 'GET',
    },
  };
}
