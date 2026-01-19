/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient, SubgraphClient } from '../../transport';
import { tickToPrice } from '../../constants';
import { isPositionInRange, calculatePositionValue, calculateImpermanentLoss } from '../../utils';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['position'] } },
    options: [
      { name: 'Get Position', value: 'getPosition', description: 'Get position by token ID' },
      { name: 'Get User Positions', value: 'getUserPositions', description: 'Get all positions for a user' },
      { name: 'Check In Range', value: 'checkInRange', description: 'Check if position is in range' },
      { name: 'Calculate Value', value: 'calcValue', description: 'Calculate position value' },
      { name: 'Calculate IL', value: 'calcIL', description: 'Calculate impermanent loss' },
      { name: 'Get Unclaimed Fees', value: 'getUnclaimedFees', description: 'Get unclaimed fees for position' },
    ],
    default: 'getPosition',
  },
  {
    displayName: 'Token ID',
    name: 'tokenId',
    type: 'string',
    displayOptions: { show: { resource: ['position'], operation: ['getPosition', 'checkInRange', 'calcValue', 'calcIL', 'getUnclaimedFees'] } },
    default: '',
    description: 'NFT position token ID',
  },
  {
    displayName: 'User Address',
    name: 'userAddress',
    type: 'string',
    displayOptions: { show: { resource: ['position'], operation: ['getUserPositions'] } },
    default: '',
    placeholder: 'Leave empty to use wallet address',
    description: 'User address to query positions for',
  },
  {
    displayName: 'Entry Price',
    name: 'entryPrice',
    type: 'number',
    displayOptions: { show: { resource: ['position'], operation: ['calcIL'] } },
    default: 0,
    description: 'Price when position was opened',
  },
  {
    displayName: 'Current Price',
    name: 'currentPrice',
    type: 'number',
    displayOptions: { show: { resource: ['position'], operation: ['calcIL'] } },
    default: 0,
    description: 'Current price',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  let result: Record<string, unknown>;

  switch (operation) {
    case 'getPosition': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const contracts = client.getContracts();
      const nftAbi = [
        'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
      ];

      const position = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'positions', [tokenId]);

      result = {
        tokenId,
        nonce: position[0].toString(),
        operator: position[1],
        token0: position[2],
        token1: position[3],
        fee: position[4],
        tickLower: position[5],
        tickUpper: position[6],
        liquidity: position[7].toString(),
        feeGrowthInside0LastX128: position[8].toString(),
        feeGrowthInside1LastX128: position[9].toString(),
        tokensOwed0: position[10].toString(),
        tokensOwed1: position[11].toString(),
        priceLower: tickToPrice(position[5]),
        priceUpper: tickToPrice(position[6]),
      };
      break;
    }

    case 'getUserPositions': {
      const userAddress = this.getNodeParameter('userAddress', index, '') as string;
      const address = userAddress || await client.getAddress();
      
      const subgraph = await SubgraphClient.fromCredentials(this);
      const positions = await subgraph.getPositions(address);
      
      result = { owner: address, positions };
      break;
    }

    case 'checkInRange': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const contracts = client.getContracts();
      const nftAbi = [
        'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
      ];

      const position = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'positions', [tokenId]);
      const tickLower = position[5];
      const tickUpper = position[6];
      const fee = position[4];

      // Get pool to check current tick
      const token0 = position[2];
      const token1 = position[3];
      
      const factoryAbi = ['function getPool(address,address,uint24) view returns (address)'];
      const poolAddress = await client.call(contracts.factoryV3, factoryAbi, 'getPool', [token0, token1, fee]);
      
      const poolAbi = ['function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)'];
      const slot0 = await client.call(poolAddress, poolAbi, 'slot0', []);
      const currentTick = slot0[1];

      const inRange = isPositionInRange(tickLower, tickUpper, currentTick);

      result = {
        tokenId,
        tickLower,
        tickUpper,
        currentTick,
        inRange,
        priceLower: tickToPrice(tickLower),
        priceUpper: tickToPrice(tickUpper),
        currentPrice: tickToPrice(currentTick),
      };
      break;
    }

    case 'calcValue': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const contracts = client.getContracts();
      const nftAbi = [
        'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
      ];

      const position = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'positions', [tokenId]);
      const token0 = position[2];
      const token1 = position[3];
      const fee = position[4];
      const tickLower = position[5];
      const tickUpper = position[6];
      const liquidity = BigInt(position[7].toString());

      // Get current tick
      const factoryAbi = ['function getPool(address,address,uint24) view returns (address)'];
      const poolAddress = await client.call(contracts.factoryV3, factoryAbi, 'getPool', [token0, token1, fee]);
      
      const poolAbi = ['function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)'];
      const slot0 = await client.call(poolAddress, poolAbi, 'slot0', []);
      const currentTick = slot0[1];
      const sqrtPriceX96 = BigInt(slot0[0].toString());

      const value = calculatePositionValue(
        liquidity,
        tickLower,
        tickUpper,
        currentTick,
        sqrtPriceX96,
      );

      result = {
        tokenId,
        ...value,
        tokensOwed0: position[10].toString(),
        tokensOwed1: position[11].toString(),
      };
      break;
    }

    case 'calcIL': {
      const entryPrice = this.getNodeParameter('entryPrice', index) as number;
      const currentPrice = this.getNodeParameter('currentPrice', index) as number;
      
      const il = calculateImpermanentLoss(entryPrice, currentPrice);
      
      result = {
        entryPrice,
        currentPrice,
        priceRatio: currentPrice / entryPrice,
        impermanentLoss: il,
        impermanentLossPercent: `${(il * 100).toFixed(4)}%`,
      };
      break;
    }

    case 'getUnclaimedFees': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const contracts = client.getContracts();
      const nftAbi = [
        'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
      ];

      const position = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'positions', [tokenId]);

      result = {
        tokenId,
        token0: position[2],
        token1: position[3],
        tokensOwed0: position[10].toString(),
        tokensOwed1: position[11].toString(),
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
