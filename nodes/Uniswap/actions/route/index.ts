/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { QuoterClient, SubgraphClient } from '../../transport';
import { encodePath, createSingleHopPath, createMultiHopPath } from '../../utils';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['route'] } },
    options: [
      { name: 'Find Best Route', value: 'findBest', description: 'Find the optimal swap route' },
      { name: 'Get All Routes', value: 'getAllRoutes', description: 'Get all possible routes' },
      { name: 'Encode Path', value: 'encodePath', description: 'Encode a path for V3 swaps' },
      { name: 'Decode Path', value: 'decodePath', description: 'Decode an encoded path' },
      { name: 'Find Common Pairs', value: 'findCommonPairs', description: 'Find common intermediate tokens' },
    ],
    default: 'findBest',
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['route'] } },
    default: '',
    description: 'Address of the input token',
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    required: true,
    displayOptions: { show: { resource: ['route'] } },
    default: '',
    description: 'Address of the output token',
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    displayOptions: { show: { resource: ['route'], operation: ['findBest', 'getAllRoutes'] } },
    default: '1',
    description: 'Amount for quoting routes',
  },
  {
    displayName: 'Path Tokens',
    name: 'pathTokens',
    type: 'string',
    displayOptions: { show: { resource: ['route'], operation: ['encodePath'] } },
    default: '',
    placeholder: '0xToken1,0xToken2,0xToken3',
    description: 'Comma-separated token addresses',
  },
  {
    displayName: 'Fee Tiers',
    name: 'feeTiers',
    type: 'string',
    displayOptions: { show: { resource: ['route'], operation: ['encodePath'] } },
    default: '3000',
    placeholder: '3000,500',
    description: 'Comma-separated fee tiers',
  },
  {
    displayName: 'Encoded Path',
    name: 'encodedPath',
    type: 'string',
    displayOptions: { show: { resource: ['route'], operation: ['decodePath'] } },
    default: '',
    description: 'Hex-encoded path to decode',
  },
  {
    displayName: 'Max Hops',
    name: 'maxHops',
    type: 'number',
    displayOptions: { show: { resource: ['route'], operation: ['getAllRoutes'] } },
    default: 3,
    description: 'Maximum number of hops',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const tokenIn = this.getNodeParameter('tokenIn', index) as string;
  const tokenOut = this.getNodeParameter('tokenOut', index) as string;

  let result: Record<string, unknown>;

  switch (operation) {
    case 'findBest': {
      const amount = this.getNodeParameter('amount', index) as string;
      const quoter = await QuoterClient.fromCredentials(this);
      
      // Try direct routes first
      const directQuote = await quoter.getBestQuote(tokenIn, tokenOut, amount);
      
      // Try common intermediates (WETH, USDC, USDT)
      const intermediates = [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      ];

      const routes = [{ type: 'direct', ...directQuote }];

      for (const intermediate of intermediates) {
        if (intermediate.toLowerCase() !== tokenIn.toLowerCase() && 
            intermediate.toLowerCase() !== tokenOut.toLowerCase()) {
          try {
            const leg1 = await quoter.getBestQuote(tokenIn, intermediate, amount);
            const leg2 = await quoter.getBestQuote(intermediate, tokenOut, leg1.amountOutFormatted || leg1.amountOut);
            routes.push({
              type: 'multi-hop',
              intermediate,
              totalOutput: leg2.amountOut,
              hops: [leg1, leg2],
            });
          } catch {
            // Route not available
          }
        }
      }

      // Sort by output amount
      routes.sort((a, b) => {
        const aOut = BigInt(a.amountOut || a.totalOutput || '0');
        const bOut = BigInt(b.amountOut || b.totalOutput || '0');
        return bOut > aOut ? 1 : -1;
      });

      result = { bestRoute: routes[0], allRoutes: routes };
      break;
    }

    case 'getAllRoutes': {
      const amount = this.getNodeParameter('amount', index) as string;
      const subgraph = await SubgraphClient.fromCredentials(this);
      
      // Find pools containing tokenIn
      const poolsIn = await subgraph.searchPoolsByToken(tokenIn, 10);
      // Find pools containing tokenOut  
      const poolsOut = await subgraph.searchPoolsByToken(tokenOut, 10);

      result = {
        tokenIn,
        tokenOut,
        poolsContainingTokenIn: poolsIn,
        poolsContainingTokenOut: poolsOut,
      };
      break;
    }

    case 'encodePath': {
      const pathTokens = (this.getNodeParameter('pathTokens', index) as string).split(',').map(t => t.trim());
      const feeTiers = (this.getNodeParameter('feeTiers', index) as string).split(',').map(f => parseInt(f.trim()));

      if (pathTokens.length === 2) {
        const encoded = createSingleHopPath(pathTokens[0], pathTokens[1], feeTiers[0]);
        result = { encodedPath: encoded, tokens: pathTokens, fees: feeTiers };
      } else {
        const encoded = createMultiHopPath(pathTokens, feeTiers);
        result = { encodedPath: encoded, tokens: pathTokens, fees: feeTiers };
      }
      break;
    }

    case 'decodePath': {
      const encodedPath = this.getNodeParameter('encodedPath', index) as string;
      const { decodePath } = await import('../../utils');
      const decoded = decodePath(encodedPath);
      result = decoded;
      break;
    }

    case 'findCommonPairs': {
      const subgraph = await SubgraphClient.fromCredentials(this);
      
      const poolsIn = await subgraph.searchPoolsByToken(tokenIn, 20);
      const poolsOut = await subgraph.searchPoolsByToken(tokenOut, 20);

      // Find common tokens
      const tokensIn = new Set<string>();
      poolsIn.forEach((p: { token0: { id: string }; token1: { id: string } }) => {
        tokensIn.add(p.token0.id.toLowerCase());
        tokensIn.add(p.token1.id.toLowerCase());
      });

      const commonTokens: string[] = [];
      poolsOut.forEach((p: { token0: { id: string }; token1: { id: string } }) => {
        if (tokensIn.has(p.token0.id.toLowerCase()) && 
            p.token0.id.toLowerCase() !== tokenIn.toLowerCase() &&
            p.token0.id.toLowerCase() !== tokenOut.toLowerCase()) {
          commonTokens.push(p.token0.id);
        }
        if (tokensIn.has(p.token1.id.toLowerCase()) &&
            p.token1.id.toLowerCase() !== tokenIn.toLowerCase() &&
            p.token1.id.toLowerCase() !== tokenOut.toLowerCase()) {
          commonTokens.push(p.token1.id);
        }
      });

      result = { tokenIn, tokenOut, commonIntermediates: [...new Set(commonTokens)] };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
