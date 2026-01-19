/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';
import { priceToTick, nearestUsableTick, getTickSpacing } from '../../constants';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['liquidityV3'] } },
    options: [
      { name: 'Mint Position', value: 'mint', description: 'Create a new liquidity position' },
      { name: 'Increase Liquidity', value: 'increase', description: 'Add liquidity to existing position' },
      { name: 'Decrease Liquidity', value: 'decrease', description: 'Remove liquidity from position' },
      { name: 'Collect Fees', value: 'collect', description: 'Collect accumulated fees' },
      { name: 'Burn Position', value: 'burn', description: 'Burn an empty position NFT' },
    ],
    default: 'mint',
  },
  {
    displayName: 'Token 0',
    name: 'token0',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint'] } },
    default: '',
    description: 'Address of token 0',
  },
  {
    displayName: 'Token 1',
    name: 'token1',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint'] } },
    default: '',
    description: 'Address of token 1',
  },
  {
    displayName: 'Fee Tier',
    name: 'feeTier',
    type: 'options',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint'] } },
    options: [
      { name: '0.01%', value: 100 },
      { name: '0.05%', value: 500 },
      { name: '0.3%', value: 3000 },
      { name: '1%', value: 10000 },
    ],
    default: 3000,
  },
  {
    displayName: 'Price Lower',
    name: 'priceLower',
    type: 'number',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint'] } },
    default: 0,
    description: 'Lower price bound',
  },
  {
    displayName: 'Price Upper',
    name: 'priceUpper',
    type: 'number',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint'] } },
    default: 0,
    description: 'Upper price bound',
  },
  {
    displayName: 'Amount 0 Desired',
    name: 'amount0Desired',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint', 'increase'] } },
    default: '',
    description: 'Desired amount of token 0',
  },
  {
    displayName: 'Amount 1 Desired',
    name: 'amount1Desired',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint', 'increase'] } },
    default: '',
    description: 'Desired amount of token 1',
  },
  {
    displayName: 'Token ID',
    name: 'tokenId',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['increase', 'decrease', 'collect', 'burn'] } },
    default: '',
    description: 'NFT position token ID',
  },
  {
    displayName: 'Liquidity',
    name: 'liquidity',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['decrease'] } },
    default: '',
    description: 'Amount of liquidity to remove',
  },
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint', 'increase', 'decrease'] } },
    default: 0.5,
    description: 'Slippage tolerance',
  },
  {
    displayName: 'Deadline (seconds)',
    name: 'deadline',
    type: 'number',
    displayOptions: { show: { resource: ['liquidityV3'], operation: ['mint', 'increase', 'decrease', 'collect'] } },
    default: 1200,
    description: 'Transaction deadline',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  const contracts = client.getContracts();
  let result: Record<string, unknown>;

  const nftAbi = [
    'function mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256)) payable returns (uint256,uint128,uint256,uint256)',
    'function increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256)) payable returns (uint128,uint256,uint256)',
    'function decreaseLiquidity((uint256,uint128,uint256,uint256,uint256)) payable returns (uint256,uint256)',
    'function collect((uint256,address,uint128,uint128)) payable returns (uint256,uint256)',
    'function burn(uint256) payable',
    'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
  ];

  switch (operation) {
    case 'mint': {
      const token0 = this.getNodeParameter('token0', index) as string;
      const token1 = this.getNodeParameter('token1', index) as string;
      const feeTier = this.getNodeParameter('feeTier', index) as number;
      const priceLower = this.getNodeParameter('priceLower', index) as number;
      const priceUpper = this.getNodeParameter('priceUpper', index) as number;
      const amount0Desired = this.getNodeParameter('amount0Desired', index) as string;
      const amount1Desired = this.getNodeParameter('amount1Desired', index) as string;
      const slippage = this.getNodeParameter('slippage', index) as number;
      const deadline = this.getNodeParameter('deadline', index) as number;

      const tickSpacing = getTickSpacing(feeTier);
      const tickLower = nearestUsableTick(priceToTick(priceLower), tickSpacing);
      const tickUpper = nearestUsableTick(priceToTick(priceUpper), tickSpacing);

      const amount0 = BigInt(Math.floor(parseFloat(amount0Desired) * 1e18));
      const amount1 = BigInt(Math.floor(parseFloat(amount1Desired) * 1e18));
      const amount0Min = amount0 * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;
      const amount1Min = amount1 * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

      const recipient = await client.getAddress();
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;

      const mintParams = {
        token0,
        token1,
        fee: feeTier,
        tickLower,
        tickUpper,
        amount0Desired: amount0.toString(),
        amount1Desired: amount1.toString(),
        amount0Min: amount0Min.toString(),
        amount1Min: amount1Min.toString(),
        recipient,
        deadline: deadlineTimestamp,
      };

      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'mint',
        [Object.values(mintParams)],
      );

      result = {
        transactionHash: tx.hash,
        ...mintParams,
      };
      break;
    }

    case 'increase': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const amount0Desired = this.getNodeParameter('amount0Desired', index) as string;
      const amount1Desired = this.getNodeParameter('amount1Desired', index) as string;
      const slippage = this.getNodeParameter('slippage', index) as number;
      const deadline = this.getNodeParameter('deadline', index) as number;

      const amount0 = BigInt(Math.floor(parseFloat(amount0Desired) * 1e18));
      const amount1 = BigInt(Math.floor(parseFloat(amount1Desired) * 1e18));
      const amount0Min = amount0 * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;
      const amount1Min = amount1 * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;

      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'increaseLiquidity',
        [[tokenId, amount0.toString(), amount1.toString(), amount0Min.toString(), amount1Min.toString(), deadlineTimestamp]],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        amount0Desired,
        amount1Desired,
      };
      break;
    }

    case 'decrease': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const liquidity = this.getNodeParameter('liquidity', index) as string;
      const slippage = this.getNodeParameter('slippage', index) as number;
      const deadline = this.getNodeParameter('deadline', index) as number;

      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;

      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'decreaseLiquidity',
        [[tokenId, liquidity, '0', '0', deadlineTimestamp]],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        liquidityRemoved: liquidity,
      };
      break;
    }

    case 'collect': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const recipient = await client.getAddress();

      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'collect',
        [[tokenId, recipient, '340282366920938463463374607431768211455', '340282366920938463463374607431768211455']],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        recipient,
      };
      break;
    }

    case 'burn': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;

      // First check if position has 0 liquidity
      const position = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'positions', [tokenId]);
      if (BigInt(position[7].toString()) > 0n) {
        throw new NodeOperationError(this.getNode(), 'Cannot burn position with liquidity. Decrease liquidity first.', { itemIndex: index });
      }

      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'burn',
        [tokenId],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        burned: true,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
