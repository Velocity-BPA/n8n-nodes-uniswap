/**
 * Uniswap Trigger Node - Event Monitoring
 * SPDX-License-Identifier: BSL-1.1
 * Copyright (c) 2024 Anthropic, PBC
 */

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { SubgraphClient } from './transport/subgraphClient';

export class UniswapTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Uniswap Trigger',
		name: 'uniswapTrigger',
		icon: 'file:uniswap.svg',
		group: ['trigger'],
		version: 1,
		description: 'Monitor Uniswap events and trigger workflows',
		defaults: {
			name: 'Uniswap Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'uniswapNetwork',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				options: [
					{ name: 'New Swaps', value: 'swaps', description: 'Monitor swap transactions' },
					{ name: 'New Pools', value: 'pools', description: 'Monitor new pool creations' },
					{ name: 'Liquidity Changes', value: 'liquidity', description: 'Monitor mint/burn events' },
					{ name: 'Price Changes', value: 'price', description: 'Monitor significant price movements' },
					{ name: 'Position Changes', value: 'positions', description: 'Monitor position updates for an address' },
					{ name: 'Large Transactions', value: 'whale', description: 'Monitor large swap transactions' },
				],
				default: 'swaps',
				description: 'Type of event to monitor',
			},
			// Pool filter for swaps, liquidity, price
			{
				displayName: 'Pool Address',
				name: 'poolAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: { eventType: ['swaps', 'liquidity', 'price'] },
				},
				description: 'Pool address to monitor (leave empty for all pools)',
			},
			// Token filter
			{
				displayName: 'Token Address',
				name: 'tokenAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: { eventType: ['swaps', 'pools', 'whale'] },
				},
				description: 'Filter by token address (optional)',
			},
			// User address for positions
			{
				displayName: 'User Address',
				name: 'userAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: { eventType: ['positions'] },
				},
				description: 'Wallet address to monitor for position changes',
				required: true,
			},
			// Price change threshold
			{
				displayName: 'Price Change Threshold (%)',
				name: 'priceThreshold',
				type: 'number',
				default: 5,
				displayOptions: {
					show: { eventType: ['price'] },
				},
				description: 'Minimum price change percentage to trigger',
			},
			// Whale threshold
			{
				displayName: 'Minimum USD Value',
				name: 'minUsdValue',
				type: 'number',
				default: 100000,
				displayOptions: {
					show: { eventType: ['whale'] },
				},
				description: 'Minimum swap value in USD to trigger',
			},
			// Limit results
			{
				displayName: 'Max Results Per Poll',
				name: 'limit',
				type: 'number',
				default: 10,
				description: 'Maximum number of events to return per poll',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const eventType = this.getNodeParameter('eventType') as string;
		const limit = this.getNodeParameter('limit') as number;
		const webhookData = this.getWorkflowStaticData('node');
		
		// Get last poll timestamp
		const lastTimestamp = (webhookData.lastTimestamp as number) || Math.floor(Date.now() / 1000) - 300; // Default: 5 minutes ago
		const currentTimestamp = Math.floor(Date.now() / 1000);

		let client: SubgraphClient;
		try {
			client = await SubgraphClient.fromCredentials.call(this as any);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Failed to initialize client: ${error}`);
		}

		let events: IDataObject[] = [];

		try {
			switch (eventType) {
				case 'swaps': {
					const poolAddress = this.getNodeParameter('poolAddress', '') as string;
					const tokenAddress = this.getNodeParameter('tokenAddress', '') as string;

					let whereClause = `timestamp_gt: ${lastTimestamp}`;
					if (poolAddress) whereClause += `, pool: "${poolAddress.toLowerCase()}"`;

					const query = `
						query GetNewSwaps($first: Int!) {
							swaps(
								where: { ${whereClause} }
								first: $first
								orderBy: timestamp
								orderDirection: desc
							) {
								id
								transaction { id blockNumber }
								timestamp
								pool { id token0 { symbol } token1 { symbol } feeTier }
								sender
								recipient
								amount0
								amount1
								amountUSD
								sqrtPriceX96
								tick
							}
						}
					`;

					const result = await client.query(query, { first: limit });
					events = result.swaps || [];

					// Filter by token if specified
					if (tokenAddress && events.length > 0) {
						events = events.filter((swap: IDataObject) => {
							const pool = swap.pool as IDataObject;
							const token0 = pool?.token0 as IDataObject;
							const token1 = pool?.token1 as IDataObject;
							return token0?.id === tokenAddress.toLowerCase() || token1?.id === tokenAddress.toLowerCase();
						});
					}
					break;
				}

				case 'pools': {
					const tokenAddress = this.getNodeParameter('tokenAddress', '') as string;

					let whereClause = `createdAtTimestamp_gt: ${lastTimestamp}`;
					if (tokenAddress) {
						whereClause += `, or: [{ token0: "${tokenAddress.toLowerCase()}" }, { token1: "${tokenAddress.toLowerCase()}" }]`;
					}

					const query = `
						query GetNewPools($first: Int!) {
							pools(
								where: { createdAtTimestamp_gt: ${lastTimestamp} }
								first: $first
								orderBy: createdAtTimestamp
								orderDirection: desc
							) {
								id
								token0 { id symbol name decimals }
								token1 { id symbol name decimals }
								feeTier
								createdAtTimestamp
								createdAtBlockNumber
								liquidity
								totalValueLockedUSD
							}
						}
					`;

					const result = await client.query(query, { first: limit });
					events = result.pools || [];
					break;
				}

				case 'liquidity': {
					const poolAddress = this.getNodeParameter('poolAddress', '') as string;

					// Get mints
					const mintQuery = `
						query GetMints($first: Int!, $pool: String) {
							mints(
								where: { timestamp_gt: ${lastTimestamp}${poolAddress ? `, pool: "${poolAddress.toLowerCase()}"` : ''} }
								first: $first
								orderBy: timestamp
								orderDirection: desc
							) {
								id
								transaction { id }
								timestamp
								pool { id token0 { symbol } token1 { symbol } }
								owner
								amount0
								amount1
								amountUSD
								tickLower
								tickUpper
							}
						}
					`;

					// Get burns
					const burnQuery = `
						query GetBurns($first: Int!, $pool: String) {
							burns(
								where: { timestamp_gt: ${lastTimestamp}${poolAddress ? `, pool: "${poolAddress.toLowerCase()}"` : ''} }
								first: $first
								orderBy: timestamp
								orderDirection: desc
							) {
								id
								transaction { id }
								timestamp
								pool { id token0 { symbol } token1 { symbol } }
								owner
								amount0
								amount1
								amountUSD
								tickLower
								tickUpper
							}
						}
					`;

					const [mints, burns] = await Promise.all([
						client.query(mintQuery, { first: limit }),
						client.query(burnQuery, { first: limit }),
					]);

					events = [
						...(mints.mints || []).map((m: IDataObject) => ({ ...m, type: 'mint' })),
						...(burns.burns || []).map((b: IDataObject) => ({ ...b, type: 'burn' })),
					].sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).slice(0, limit);
					break;
				}

				case 'price': {
					const poolAddress = this.getNodeParameter('poolAddress') as string;
					const priceThreshold = this.getNodeParameter('priceThreshold') as number;

					if (!poolAddress) {
						throw new NodeOperationError(this.getNode(), 'Pool address is required for price monitoring');
					}

					// Get current pool data
					const query = `
						query GetPoolPrice($id: ID!) {
							pool(id: $id) {
								id
								token0 { symbol decimals }
								token1 { symbol decimals }
								token0Price
								token1Price
								sqrtPrice
								tick
							}
						}
					`;

					const result = await client.query(query, { id: poolAddress.toLowerCase() });
					const pool = result.pool;

					if (pool) {
						const lastPrice = webhookData.lastPrice as number;
						const currentPrice = parseFloat(pool.token0Price);

						if (lastPrice) {
							const priceChange = Math.abs((currentPrice - lastPrice) / lastPrice * 100);
							
							if (priceChange >= priceThreshold) {
								events = [{
									pool: pool.id,
									token0: pool.token0?.symbol,
									token1: pool.token1?.symbol,
									previousPrice: lastPrice,
									currentPrice,
									priceChange: priceChange.toFixed(2) + '%',
									direction: currentPrice > lastPrice ? 'up' : 'down',
									timestamp: currentTimestamp,
								}];
							}
						}

						webhookData.lastPrice = currentPrice;
					}
					break;
				}

				case 'positions': {
					const userAddress = this.getNodeParameter('userAddress') as string;

					const query = `
						query GetUserPositions($owner: Bytes!) {
							positions(where: { owner: $owner }) {
								id
								pool { id token0 { symbol } token1 { symbol } tick }
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
					const positions = result.positions || [];

					// Compare with last known positions
					const lastPositions = (webhookData.lastPositions as IDataObject[]) || [];
					const lastPositionMap = new Map(lastPositions.map((p: IDataObject) => [p.id, p]));

					const changedPositions = positions.filter((pos: IDataObject) => {
						const lastPos = lastPositionMap.get(pos.id);
						if (!lastPos) return true; // New position
						return pos.liquidity !== lastPos.liquidity ||
							   pos.collectedFeesToken0 !== lastPos.collectedFeesToken0 ||
							   pos.collectedFeesToken1 !== lastPos.collectedFeesToken1;
					});

					events = changedPositions.map((pos: IDataObject) => {
						const pool = pos.pool as IDataObject | null;
						const tickLower = pos.tickLower as IDataObject | null;
						const tickUpper = pos.tickUpper as IDataObject | null;
						const currentTick = pool?.tick as number | undefined;
						const lowerIdx = tickLower?.tickIdx as number | undefined;
						const upperIdx = tickUpper?.tickIdx as number | undefined;
						
						let inRange = false;
						if (currentTick !== undefined && lowerIdx !== undefined && upperIdx !== undefined) {
							inRange = currentTick >= lowerIdx && currentTick < upperIdx;
						}
						
						return {
							...pos,
							changeType: lastPositionMap.has(pos.id as string) ? 'updated' : 'new',
							inRange,
						};
					});

					webhookData.lastPositions = positions;
					break;
				}

				case 'whale': {
					const minUsdValue = this.getNodeParameter('minUsdValue') as number;
					const tokenAddress = this.getNodeParameter('tokenAddress', '') as string;

					let whereClause = `timestamp_gt: ${lastTimestamp}, amountUSD_gte: ${minUsdValue}`;

					const query = `
						query GetWhaleSwaps($first: Int!) {
							swaps(
								where: { ${whereClause} }
								first: $first
								orderBy: amountUSD
								orderDirection: desc
							) {
								id
								transaction { id blockNumber }
								timestamp
								pool { id token0 { id symbol } token1 { id symbol } feeTier }
								sender
								recipient
								amount0
								amount1
								amountUSD
							}
						}
					`;

					const result = await client.query(query, { first: limit });
					events = result.swaps || [];

					// Filter by token if specified
					if (tokenAddress && events.length > 0) {
						events = events.filter((swap: IDataObject) => {
							const pool = swap.pool as IDataObject;
							const token0 = pool?.token0 as IDataObject;
							const token1 = pool?.token1 as IDataObject;
							return token0?.id === tokenAddress.toLowerCase() || token1?.id === tokenAddress.toLowerCase();
						});
					}
					break;
				}
			}
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Failed to poll events: ${error}`);
		}

		// Update last timestamp
		webhookData.lastTimestamp = currentTimestamp;

		if (events.length === 0) {
			return null;
		}

		return [this.helpers.returnJsonArray(events)];
	}
}
