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
        ],
        default: 'swap',
      },
      // Swap operations
      ...swap.description,
      // Quote operations
      ...quote.description,
      // Route operations
      ...route.description,
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
          default:
            throw new NodeOperationError(
              this.getNode(),
              `Unknown resource: ${resource}`,
              { itemIndex: i },
            );
        }

        returnData.push(...result);
      } catch (error) {
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
