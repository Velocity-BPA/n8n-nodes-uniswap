/**
 * Subgraph Actions - Custom GraphQL queries for Uniswap data
 * 
 * SPDX-License-Identifier: BSL-1.1
 * Copyright (c) 2024 Anthropic, PBC
 * Licensed under the Business Source License 1.1
 * See LICENSE file for details
 */

import type { IExecuteFunctions, INodeProperties, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { SubgraphClient } from '../../transport/subgraphClient';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['subgraph'],
			},
		},
		options: [
			{
				name: 'Custom Query',
				value: 'customQuery',
				description: 'Execute a custom GraphQL query',
				action: 'Execute custom GraphQL query',
			},
			{
				name: 'Get Pool Data',
				value: 'getPoolData',
				description: 'Get comprehensive pool data',
				action: 'Get pool data from subgraph',
			},
			{
				name: 'Get Position Data',
				value: 'getPositionData',
				description: 'Get position data by ID',
				action: 'Get position data from subgraph',
			},
			{
				name: 'Get Swaps',
				value: 'getSwaps',
				description: 'Get recent swaps with filters',
				action: 'Get swaps from subgraph',
			},
			{
				name: 'Get Token Data',
				value: 'getTokenData',
				description: 'Get token information and stats',
				action: 'Get token data from subgraph',
			},
			{
				name: 'Get User Data',
				value: 'getUserData',
				description: 'Get all data for a user address',
				action: 'Get user data from subgraph',
			},
			{
				name: 'Get Factory Stats',
				value: 'getFactoryStats',
				description: 'Get overall protocol statistics',
				action: 'Get factory stats from subgraph',
			},
			{
				name: 'Get Pool Day Data',
				value: 'getPoolDayData',
				description: 'Get historical daily data for a pool',
				action: 'Get pool day data from subgraph',
			},
			{
				name: 'Get Token Day Data',
				value: 'getTokenDayData',
				description: 'Get historical daily data for a token',
				action: 'Get token day data from subgraph',
			},
			{
				name: 'Get Ticks',
				value: 'getTicks',
				description: 'Get tick data for a pool',
				action: 'Get ticks from subgraph',
			},
		],
		default: 'customQuery',
	},
	// Custom Query
	{
		displayName: 'GraphQL Query',
		name: 'query',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['customQuery'],
			},
		},
		default: `{
  pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 { symbol }
    token1 { symbol }
    feeTier
    totalValueLockedUSD
  }
}`,
		description: 'The GraphQL query to execute',
		required: true,
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['customQuery'],
			},
		},
		default: '{}',
		description: 'GraphQL query variables as JSON',
	},
	// Pool Data
	{
		displayName: 'Pool Address',
		name: 'poolAddress',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getPoolData', 'getPoolDayData', 'getTicks'],
			},
		},
		default: '',
		placeholder: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
		description: 'The pool contract address',
		required: true,
	},
	// Position Data
	{
		displayName: 'Position ID',
		name: 'positionId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getPositionData'],
			},
		},
		default: '',
		placeholder: '12345',
		description: 'The NFT position token ID',
		required: true,
	},
	// Token Data
	{
		displayName: 'Token Address',
		name: 'tokenAddress',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getTokenData', 'getTokenDayData'],
			},
		},
		default: '',
		placeholder: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		description: 'The token contract address',
		required: true,
	},
	// User Data
	{
		displayName: 'User Address',
		name: 'userAddress',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getUserData'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'The user wallet address',
		required: true,
	},
	// Swaps filters
	{
		displayName: 'Filter By',
		name: 'swapFilter',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getSwaps'],
			},
		},
		options: [
			{ name: 'Pool', value: 'pool' },
			{ name: 'Token', value: 'token' },
			{ name: 'User', value: 'user' },
			{ name: 'Recent', value: 'recent' },
		],
		default: 'recent',
	},
	{
		displayName: 'Filter Address',
		name: 'filterAddress',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getSwaps'],
				swapFilter: ['pool', 'token', 'user'],
			},
		},
		default: '',
		description: 'Address to filter swaps by',
		required: true,
	},
	// Limit
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getSwaps', 'getPoolDayData', 'getTokenDayData', 'getTicks'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return',
	},
	// Days
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['getPoolDayData', 'getTokenDayData'],
			},
		},
		default: 30,
		description: 'Number of days of historical data',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<INodeExecutionData[]> {
	const client = await SubgraphClient.fromCredentials.call(this);

	if (operation === 'customQuery') {
		const query = this.getNodeParameter('query', index) as string;
		const variablesJson = this.getNodeParameter('variables', index, '{}') as string;
		
		let variables = {};
		try {
			variables = JSON.parse(variablesJson);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON in variables', { itemIndex: index });
		}

		const result = await client.query(query, variables);
		return [{ json: result, pairedItem: { item: index } }];
	}

	if (operation === 'getPoolData') {
		const poolAddress = this.getNodeParameter('poolAddress', index) as string;
		
		const query = `
			query GetPool($id: ID!) {
				pool(id: $id) {
					id
					token0 {
						id
						symbol
						name
						decimals
						derivedETH
					}
					token1 {
						id
						symbol
						name
						decimals
						derivedETH
					}
					feeTier
					liquidity
					sqrtPrice
					tick
					token0Price
					token1Price
					totalValueLockedToken0
					totalValueLockedToken1
					totalValueLockedUSD
					totalValueLockedETH
					volumeUSD
					volumeToken0
					volumeToken1
					feesUSD
					txCount
					collectedFeesToken0
					collectedFeesToken1
					collectedFeesUSD
					createdAtTimestamp
					createdAtBlockNumber
				}
			}
		`;

		const result = await client.query(query, { id: poolAddress.toLowerCase() });
		return [{ json: result.pool || {}, pairedItem: { item: index } }];
	}

	if (operation === 'getPositionData') {
		const positionId = this.getNodeParameter('positionId', index) as string;
		
		const query = `
			query GetPosition($id: ID!) {
				position(id: $id) {
					id
					owner
					pool {
						id
						token0 { id symbol decimals }
						token1 { id symbol decimals }
						feeTier
						tick
						sqrtPrice
					}
					tickLower { tickIdx }
					tickUpper { tickIdx }
					liquidity
					depositedToken0
					depositedToken1
					withdrawnToken0
					withdrawnToken1
					collectedFeesToken0
					collectedFeesToken1
					feeGrowthInside0LastX128
					feeGrowthInside1LastX128
					transaction {
						id
						timestamp
						blockNumber
					}
				}
			}
		`;

		const result = await client.query(query, { id: positionId });
		return [{ json: result.position || {}, pairedItem: { item: index } }];
	}

	if (operation === 'getSwaps') {
		const filter = this.getNodeParameter('swapFilter', index) as string;
		const limit = this.getNodeParameter('limit', index, 100) as number;
		
		let whereClause = '';
		let variables: Record<string, unknown> = { first: limit };

		if (filter !== 'recent') {
			const filterAddress = this.getNodeParameter('filterAddress', index) as string;
			if (filter === 'pool') {
				whereClause = 'where: { pool: $address }';
				variables.address = filterAddress.toLowerCase();
			} else if (filter === 'token') {
				whereClause = 'where: { or: [{ token0: $address }, { token1: $address }] }';
				variables.address = filterAddress.toLowerCase();
			} else if (filter === 'user') {
				whereClause = 'where: { origin: $address }';
				variables.address = filterAddress.toLowerCase();
			}
		}

		const query = `
			query GetSwaps($first: Int!${filter !== 'recent' ? ', $address: String!' : ''}) {
				swaps(first: $first, orderBy: timestamp, orderDirection: desc, ${whereClause}) {
					id
					transaction { id blockNumber timestamp }
					pool {
						id
						token0 { symbol }
						token1 { symbol }
						feeTier
					}
					sender
					recipient
					origin
					amount0
					amount1
					amountUSD
					sqrtPriceX96
					tick
					logIndex
				}
			}
		`;

		const result = await client.query(query, variables);
		return [{ json: { swaps: result.swaps || [] }, pairedItem: { item: index } }];
	}

	if (operation === 'getTokenData') {
		const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
		
		const query = `
			query GetToken($id: ID!) {
				token(id: $id) {
					id
					symbol
					name
					decimals
					totalSupply
					volume
					volumeUSD
					untrackedVolumeUSD
					feesUSD
					txCount
					poolCount
					totalValueLocked
					totalValueLockedUSD
					totalValueLockedUSDUntracked
					derivedETH
					whitelistPools {
						id
						token0 { symbol }
						token1 { symbol }
						totalValueLockedUSD
					}
				}
			}
		`;

		const result = await client.query(query, { id: tokenAddress.toLowerCase() });
		return [{ json: result.token || {}, pairedItem: { item: index } }];
	}

	if (operation === 'getUserData') {
		const userAddress = this.getNodeParameter('userAddress', index) as string;
		
		const query = `
			query GetUserData($owner: String!) {
				positions(where: { owner: $owner }) {
					id
					pool {
						id
						token0 { symbol }
						token1 { symbol }
						feeTier
					}
					tickLower { tickIdx }
					tickUpper { tickIdx }
					liquidity
					depositedToken0
					depositedToken1
					collectedFeesToken0
					collectedFeesToken1
				}
			}
		`;

		const result = await client.query(query, { owner: userAddress.toLowerCase() });
		return [{ json: { positions: result.positions || [] }, pairedItem: { item: index } }];
	}

	if (operation === 'getFactoryStats') {
		const query = `
			{
				factories(first: 1) {
					id
					poolCount
					txCount
					totalVolumeUSD
					totalVolumeETH
					totalFeesUSD
					totalFeesETH
					untrackedVolumeUSD
					totalValueLockedUSD
					totalValueLockedETH
					totalValueLockedUSDUntracked
					totalValueLockedETHUntracked
					owner
				}
			}
		`;

		const result = await client.query(query, {});
		return [{ json: result.factories?.[0] || {}, pairedItem: { item: index } }];
	}

	if (operation === 'getPoolDayData') {
		const poolAddress = this.getNodeParameter('poolAddress', index) as string;
		const days = this.getNodeParameter('days', index, 30) as number;
		const limit = this.getNodeParameter('limit', index, 100) as number;
		
		const startTime = Math.floor(Date.now() / 1000) - (days * 86400);

		const query = `
			query GetPoolDayData($pool: String!, $startTime: Int!, $first: Int!) {
				poolDayDatas(
					where: { pool: $pool, date_gte: $startTime }
					orderBy: date
					orderDirection: desc
					first: $first
				) {
					id
					date
					pool { id }
					liquidity
					sqrtPrice
					token0Price
					token1Price
					tick
					tvlUSD
					volumeToken0
					volumeToken1
					volumeUSD
					feesUSD
					txCount
					open
					high
					low
					close
				}
			}
		`;

		const result = await client.query(query, {
			pool: poolAddress.toLowerCase(),
			startTime,
			first: limit,
		});
		return [{ json: { poolDayData: result.poolDayDatas || [] }, pairedItem: { item: index } }];
	}

	if (operation === 'getTokenDayData') {
		const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
		const days = this.getNodeParameter('days', index, 30) as number;
		const limit = this.getNodeParameter('limit', index, 100) as number;
		
		const startTime = Math.floor(Date.now() / 1000) - (days * 86400);

		const query = `
			query GetTokenDayData($token: String!, $startTime: Int!, $first: Int!) {
				tokenDayDatas(
					where: { token: $token, date_gte: $startTime }
					orderBy: date
					orderDirection: desc
					first: $first
				) {
					id
					date
					token { id symbol }
					volume
					volumeUSD
					untrackedVolumeUSD
					totalValueLocked
					totalValueLockedUSD
					priceUSD
					feesUSD
					open
					high
					low
					close
				}
			}
		`;

		const result = await client.query(query, {
			token: tokenAddress.toLowerCase(),
			startTime,
			first: limit,
		});
		return [{ json: { tokenDayData: result.tokenDayDatas || [] }, pairedItem: { item: index } }];
	}

	if (operation === 'getTicks') {
		const poolAddress = this.getNodeParameter('poolAddress', index) as string;
		const limit = this.getNodeParameter('limit', index, 100) as number;

		const query = `
			query GetTicks($pool: String!, $first: Int!) {
				ticks(
					where: { pool: $pool }
					orderBy: tickIdx
					first: $first
				) {
					id
					tickIdx
					pool { id }
					liquidityGross
					liquidityNet
					price0
					price1
					volumeToken0
					volumeToken1
					volumeUSD
					untrackedVolumeUSD
					feesUSD
					collectedFeesToken0
					collectedFeesToken1
					collectedFeesUSD
					createdAtTimestamp
					createdAtBlockNumber
					feeGrowthOutside0X128
					feeGrowthOutside1X128
				}
			}
		`;

		const result = await client.query(query, {
			pool: poolAddress.toLowerCase(),
			first: limit,
		});
		return [{ json: { ticks: result.ticks || [] }, pairedItem: { item: index } }];
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
}
