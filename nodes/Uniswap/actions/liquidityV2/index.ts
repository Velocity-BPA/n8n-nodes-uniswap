/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['liquidityV2'] } },
    options: [
      { name: 'Add Liquidity', value: 'addLiquidity', description: 'Add liquidity to V2 pool' },
      { name: 'Add Liquidity ETH', value: 'addLiquidityETH', description: 'Add liquidity with ETH' },
      { name: 'Remove Liquidity', value: 'removeLiquidity', description: 'Remove liquidity from V2 pool' },
      { name: 'Remove Liquidity ETH', value: 'removeLiquidityETH', description: 'Remove liquidity to ETH' },
      { name: 'Quote Add Liquidity', value: 'quoteAdd', description: 'Quote optimal amounts for adding liquidity' },
    ],
    default: 'addLiquidity',
  },
  {
    displayName: 'Token A',
    name: 'tokenA',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidity', 'removeLiquidity', 'quoteAdd'] } },
    default: '',
    description: 'Address of token A',
  },
  {
    displayName: 'Token B',
    name: 'tokenB',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidity', 'removeLiquidity', 'quoteAdd'] } },
    default: '',
    description: 'Address of token B',
  },
  {
    displayName: 'Token',
    name: 'token',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidityETH', 'removeLiquidityETH'] } },
    default: '',
    description: 'Address of the token to pair with ETH',
  },
  {
    displayName: 'Amount A',
    name: 'amountA',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidity', 'quoteAdd'] } },
    default: '',
    description: 'Amount of token A',
  },
  {
    displayName: 'Amount B',
    name: 'amountB',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidity'] } },
    default: '',
    description: 'Amount of token B',
  },
  {
    displayName: 'Token Amount',
    name: 'tokenAmount',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidityETH'] } },
    default: '',
    description: 'Amount of token',
  },
  {
    displayName: 'ETH Amount',
    name: 'ethAmount',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['addLiquidityETH'] } },
    default: '',
    description: 'Amount of ETH',
  },
  {
    displayName: 'Liquidity',
    name: 'liquidity',
    type: 'string',
    displayOptions: { show: { resource: ['liquidityV2'], operation: ['removeLiquidity', 'removeLiquidityETH'] } },
    default: '',
    description: 'Amount of LP tokens to remove',
  },
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    displayOptions: { show: { resource: ['liquidityV2'] } },
    default: 0.5,
    description: 'Slippage tolerance',
  },
  {
    displayName: 'Deadline (seconds)',
    name: 'deadline',
    type: 'number',
    displayOptions: { show: { resource: ['liquidityV2'] } },
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

  const routerAbi = [
    'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)',
    'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns (uint256,uint256,uint256)',
    'function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)',
    'function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)',
    'function quote(uint256,uint256,uint256) pure returns (uint256)',
  ];

  const slippage = this.getNodeParameter('slippage', index) as number;
  const deadline = this.getNodeParameter('deadline', index) as number;
  const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
  const recipient = await client.getAddress();

  switch (operation) {
    case 'addLiquidity': {
      const tokenA = this.getNodeParameter('tokenA', index) as string;
      const tokenB = this.getNodeParameter('tokenB', index) as string;
      const amountA = this.getNodeParameter('amountA', index) as string;
      const amountB = this.getNodeParameter('amountB', index) as string;

      const amountADesired = BigInt(Math.floor(parseFloat(amountA) * 1e18));
      const amountBDesired = BigInt(Math.floor(parseFloat(amountB) * 1e18));
      const amountAMin = amountADesired * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;
      const amountBMin = amountBDesired * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

      const tx = await client.execute(
        contracts.routerV2,
        routerAbi,
        'addLiquidity',
        [tokenA, tokenB, amountADesired.toString(), amountBDesired.toString(), amountAMin.toString(), amountBMin.toString(), recipient, deadlineTimestamp],
      );

      result = {
        transactionHash: tx.hash,
        tokenA,
        tokenB,
        amountADesired: amountA,
        amountBDesired: amountB,
      };
      break;
    }

    case 'addLiquidityETH': {
      const token = this.getNodeParameter('token', index) as string;
      const tokenAmount = this.getNodeParameter('tokenAmount', index) as string;
      const ethAmount = this.getNodeParameter('ethAmount', index) as string;

      const amountTokenDesired = BigInt(Math.floor(parseFloat(tokenAmount) * 1e18));
      const amountETHDesired = BigInt(Math.floor(parseFloat(ethAmount) * 1e18));
      const amountTokenMin = amountTokenDesired * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;
      const amountETHMin = amountETHDesired * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

      const tx = await client.execute(
        contracts.routerV2,
        routerAbi,
        'addLiquidityETH',
        [token, amountTokenDesired.toString(), amountTokenMin.toString(), amountETHMin.toString(), recipient, deadlineTimestamp],
        { value: amountETHDesired.toString() },
      );

      result = {
        transactionHash: tx.hash,
        token,
        tokenAmount,
        ethAmount,
      };
      break;
    }

    case 'removeLiquidity': {
      const tokenA = this.getNodeParameter('tokenA', index) as string;
      const tokenB = this.getNodeParameter('tokenB', index) as string;
      const liquidity = this.getNodeParameter('liquidity', index) as string;

      const liquidityAmount = BigInt(Math.floor(parseFloat(liquidity) * 1e18));

      const tx = await client.execute(
        contracts.routerV2,
        routerAbi,
        'removeLiquidity',
        [tokenA, tokenB, liquidityAmount.toString(), '0', '0', recipient, deadlineTimestamp],
      );

      result = {
        transactionHash: tx.hash,
        tokenA,
        tokenB,
        liquidityRemoved: liquidity,
      };
      break;
    }

    case 'removeLiquidityETH': {
      const token = this.getNodeParameter('token', index) as string;
      const liquidity = this.getNodeParameter('liquidity', index) as string;

      const liquidityAmount = BigInt(Math.floor(parseFloat(liquidity) * 1e18));

      const tx = await client.execute(
        contracts.routerV2,
        routerAbi,
        'removeLiquidityETH',
        [token, liquidityAmount.toString(), '0', '0', recipient, deadlineTimestamp],
      );

      result = {
        transactionHash: tx.hash,
        token,
        liquidityRemoved: liquidity,
      };
      break;
    }

    case 'quoteAdd': {
      const tokenA = this.getNodeParameter('tokenA', index) as string;
      const tokenB = this.getNodeParameter('tokenB', index) as string;
      const amountA = this.getNodeParameter('amountA', index) as string;

      // Get pair reserves
      const factoryAbi = ['function getPair(address,address) view returns (address)'];
      const pairAddress = await client.call(contracts.factoryV2, factoryAbi, 'getPair', [tokenA, tokenB]);
      
      const pairAbi = [
        'function token0() view returns (address)',
        'function getReserves() view returns (uint112,uint112,uint32)',
      ];
      
      const [token0, reserves] = await Promise.all([
        client.call(pairAddress, pairAbi, 'token0', []),
        client.call(pairAddress, pairAbi, 'getReserves', []),
      ]);

      const isTokenAToken0 = token0.toLowerCase() === tokenA.toLowerCase();
      const reserveA = isTokenAToken0 ? reserves[0] : reserves[1];
      const reserveB = isTokenAToken0 ? reserves[1] : reserves[0];

      const amountADesired = BigInt(Math.floor(parseFloat(amountA) * 1e18));
      
      // quote = amountA * reserveB / reserveA
      const amountBOptimal = amountADesired * BigInt(reserveB.toString()) / BigInt(reserveA.toString());

      result = {
        tokenA,
        tokenB,
        amountA,
        amountBOptimal: (Number(amountBOptimal) / 1e18).toString(),
        reserveA: reserveA.toString(),
        reserveB: reserveB.toString(),
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
