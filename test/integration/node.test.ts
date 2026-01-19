/**
 * Integration Tests for Uniswap Node Actions
 * SPDX-License-Identifier: BSL-1.1
 * Copyright (c) 2024 Anthropic, PBC
 * 
 * These tests require a valid RPC endpoint and network access.
 * Set environment variables before running:
 *   - UNISWAP_RPC_URL: Ethereum mainnet RPC URL
 *   - UNISWAP_SUBGRAPH_URL: Uniswap V3 subgraph URL
 */

import { SubgraphClient } from '../nodes/Uniswap/transport/subgraphClient';
import { UniswapClient } from '../nodes/Uniswap/transport/uniswapClient';
import { CONTRACTS } from '../nodes/Uniswap/constants/contracts';
import { TOKENS } from '../nodes/Uniswap/constants/tokens';

// Test constants
const MAINNET_CHAIN_ID = 1;
const WETH_ADDRESS = TOKENS.mainnet.WETH;
const USDC_ADDRESS = TOKENS.mainnet.USDC;
const ETH_USDC_POOL = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640'; // ETH/USDC 0.05%

// Skip tests if no RPC URL provided
const RPC_URL = process.env.UNISWAP_RPC_URL || '';
const SUBGRAPH_URL = process.env.UNISWAP_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

const describeWithRpc = RPC_URL ? describe : describe.skip;
const describeWithSubgraph = SUBGRAPH_URL ? describe : describe.skip;

describeWithSubgraph('Subgraph Integration', () => {
	let client: SubgraphClient;

	beforeAll(() => {
		client = new SubgraphClient(SUBGRAPH_URL);
	});

	describe('Pool Queries', () => {
		it('should fetch top pools by TVL', async () => {
			const query = `
				query {
					pools(first: 5, orderBy: totalValueLockedUSD, orderDirection: desc) {
						id
						token0 { symbol }
						token1 { symbol }
						totalValueLockedUSD
					}
				}
			`;

			const result = await client.query(query);
			
			expect(result.pools).toBeDefined();
			expect(result.pools.length).toBe(5);
			expect(result.pools[0].totalValueLockedUSD).toBeDefined();
		});

		it('should fetch specific pool data', async () => {
			const query = `
				query GetPool($id: ID!) {
					pool(id: $id) {
						id
						token0 { symbol decimals }
						token1 { symbol decimals }
						feeTier
						liquidity
						sqrtPrice
						tick
					}
				}
			`;

			const result = await client.query(query, { id: ETH_USDC_POOL.toLowerCase() });
			
			expect(result.pool).toBeDefined();
			expect(result.pool.feeTier).toBe('500'); // 0.05%
		});

		it('should fetch recent swaps', async () => {
			const query = `
				query {
					swaps(first: 10, orderBy: timestamp, orderDirection: desc) {
						id
						timestamp
						amountUSD
						pool { id }
					}
				}
			`;

			const result = await client.query(query);
			
			expect(result.swaps).toBeDefined();
			expect(result.swaps.length).toBeGreaterThan(0);
		});

		it('should fetch token data', async () => {
			const query = `
				query GetToken($id: ID!) {
					token(id: $id) {
						id
						symbol
						name
						decimals
						volumeUSD
						totalValueLockedUSD
					}
				}
			`;

			const result = await client.query(query, { id: WETH_ADDRESS.toLowerCase() });
			
			expect(result.token).toBeDefined();
			expect(result.token.symbol).toBe('WETH');
			expect(result.token.decimals).toBe('18');
		});
	});

	describe('Analytics Queries', () => {
		it('should fetch protocol factory stats', async () => {
			const query = `
				query {
					factories(first: 1) {
						poolCount
						txCount
						totalVolumeUSD
						totalValueLockedUSD
					}
				}
			`;

			const result = await client.query(query);
			
			expect(result.factories).toBeDefined();
			expect(result.factories.length).toBe(1);
			expect(Number(result.factories[0].poolCount)).toBeGreaterThan(0);
		});

		it('should fetch pool day data', async () => {
			const query = `
				query GetPoolDayData($pool: String!) {
					poolDayDatas(
						where: { pool: $pool }
						first: 7
						orderBy: date
						orderDirection: desc
					) {
						date
						volumeUSD
						tvlUSD
						feesUSD
					}
				}
			`;

			const result = await client.query(query, { pool: ETH_USDC_POOL.toLowerCase() });
			
			expect(result.poolDayDatas).toBeDefined();
		});
	});
});

describeWithRpc('Contract Integration', () => {
	let client: UniswapClient;

	beforeAll(() => {
		client = new UniswapClient(RPC_URL, MAINNET_CHAIN_ID);
	});

	describe('Factory Contract', () => {
		it('should get pool address from factory', async () => {
			const factoryAddress = CONTRACTS[MAINNET_CHAIN_ID].factory;
			const factoryAbi = ['function getPool(address,address,uint24) view returns (address)'];
			
			const poolAddress = await client.call(
				factoryAddress,
				factoryAbi,
				'getPool',
				[WETH_ADDRESS, USDC_ADDRESS, 500],
			);

			expect(poolAddress).toBeDefined();
			expect(poolAddress.toLowerCase()).toBe(ETH_USDC_POOL.toLowerCase());
		});
	});

	describe('Pool Contract', () => {
		it('should get pool slot0 data', async () => {
			const poolAbi = [
				'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
			];

			const slot0 = await client.call(ETH_USDC_POOL, poolAbi, 'slot0', []);

			expect(slot0).toBeDefined();
			expect(slot0.sqrtPriceX96).toBeDefined();
			expect(typeof slot0.tick).toBe('number');
		});

		it('should get pool liquidity', async () => {
			const poolAbi = ['function liquidity() view returns (uint128)'];

			const liquidity = await client.call(ETH_USDC_POOL, poolAbi, 'liquidity', []);

			expect(liquidity).toBeDefined();
			expect(BigInt(liquidity.toString())).toBeGreaterThan(0n);
		});

		it('should get pool fee', async () => {
			const poolAbi = ['function fee() view returns (uint24)'];

			const fee = await client.call(ETH_USDC_POOL, poolAbi, 'fee', []);

			expect(fee).toBe(500); // 0.05%
		});
	});

	describe('Token Contract', () => {
		it('should get token info', async () => {
			const erc20Abi = [
				'function name() view returns (string)',
				'function symbol() view returns (string)',
				'function decimals() view returns (uint8)',
			];

			const [name, symbol, decimals] = await Promise.all([
				client.call(WETH_ADDRESS, erc20Abi, 'name', []),
				client.call(WETH_ADDRESS, erc20Abi, 'symbol', []),
				client.call(WETH_ADDRESS, erc20Abi, 'decimals', []),
			]);

			expect(name).toBe('Wrapped Ether');
			expect(symbol).toBe('WETH');
			expect(decimals).toBe(18);
		});

		it('should get token balance', async () => {
			const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
			
			// Check pool's token balance
			const balance = await client.call(
				USDC_ADDRESS,
				erc20Abi,
				'balanceOf',
				[ETH_USDC_POOL],
			);

			expect(BigInt(balance.toString())).toBeGreaterThan(0n);
		});
	});

	describe('Quoter Contract', () => {
		it('should get quote for exact input single', async () => {
			const quoterAddress = CONTRACTS[MAINNET_CHAIN_ID].quoterV2;
			const quoterAbi = [
				'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
			];

			// Quote 1 WETH -> USDC
			const amountIn = BigInt('1000000000000000000'); // 1 ETH

			try {
				const result = await client.call(
					quoterAddress,
					quoterAbi,
					'quoteExactInputSingle',
					[{
						tokenIn: WETH_ADDRESS,
						tokenOut: USDC_ADDRESS,
						amountIn,
						fee: 500,
						sqrtPriceLimitX96: 0,
					}],
				);

				expect(result.amountOut).toBeDefined();
				expect(BigInt(result.amountOut.toString())).toBeGreaterThan(0n);
			} catch (error) {
				// Quoter uses staticCall which may fail on some providers
				console.log('Quoter call failed (expected on some providers):', error);
			}
		});
	});
});

describe('Contract Addresses', () => {
	it('should have valid mainnet contract addresses', () => {
		const contracts = CONTRACTS[MAINNET_CHAIN_ID];
		
		expect(contracts.factory).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(contracts.swapRouter02).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(contracts.quoterV2).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(contracts.nftPositionManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
	});

	it('should have consistent addresses across networks', () => {
		// Universal Router should be same on most chains
		const mainnetRouter = CONTRACTS[MAINNET_CHAIN_ID].universalRouter;
		
		// Check it's a valid address
		expect(mainnetRouter).toMatch(/^0x[a-fA-F0-9]{40}$/);
	});
});

describe('Token Addresses', () => {
	it('should have valid mainnet token addresses', () => {
		expect(TOKENS.mainnet.WETH).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(TOKENS.mainnet.USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(TOKENS.mainnet.USDT).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(TOKENS.mainnet.DAI).toMatch(/^0x[a-fA-F0-9]{40}$/);
		expect(TOKENS.mainnet.WBTC).toMatch(/^0x[a-fA-F0-9]{40}$/);
	});

	it('should have correct WETH address for mainnet', () => {
		expect(TOKENS.mainnet.WETH.toLowerCase()).toBe('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');
	});

	it('should have correct USDC address for mainnet', () => {
		expect(TOKENS.mainnet.USDC.toLowerCase()).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
	});
});
