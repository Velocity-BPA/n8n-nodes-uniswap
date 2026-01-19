/**
 * Utility Actions - Helper operations for Uniswap interactions
 * 
 * SPDX-License-Identifier: BSL-1.1
 * Copyright (c) 2024 Anthropic, PBC
 * Licensed under the Business Source License 1.1
 * See LICENSE file for details
 */

import type { IExecuteFunctions, INodeProperties, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { CONTRACTS } from '../../constants/contracts';
import { NETWORKS } from '../../constants/networks';
import { COMMON_TOKENS } from '../../constants/tokens';
import { FEE_TIERS } from '../../constants/feeTiers';
import { TickMath } from '../../constants/tickMath';
import { priceToTick, tickToPrice, sqrtPriceX96ToPrice } from '../../utils/priceUtils';
import { encodePath, decodePath } from '../../utils/pathUtils';
import { UniswapClient } from '../../transport/uniswapClient';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['utility'],
			},
		},
		options: [
			{
				name: 'Get Contracts',
				value: 'getContracts',
				description: 'Get contract addresses for a network',
				action: 'Get contract addresses',
			},
			{
				name: 'Get Common Tokens',
				value: 'getCommonTokens',
				description: 'Get common token addresses for a network',
				action: 'Get common tokens',
			},
			{
				name: 'Get Fee Tiers',
				value: 'getFeeTiers',
				description: 'Get available fee tiers and tick spacings',
				action: 'Get fee tiers',
			},
			{
				name: 'Convert Price to Tick',
				value: 'priceToTick',
				description: 'Convert a price to nearest valid tick',
				action: 'Convert price to tick',
			},
			{
				name: 'Convert Tick to Price',
				value: 'tickToPrice',
				description: 'Convert a tick to price',
				action: 'Convert tick to price',
			},
			{
				name: 'Convert Sqrt Price',
				value: 'sqrtPriceToPrice',
				description: 'Convert sqrtPriceX96 to human-readable price',
				action: 'Convert sqrt price',
			},
			{
				name: 'Encode Path',
				value: 'encodePath',
				description: 'Encode tokens and fees into V3 path format',
				action: 'Encode swap path',
			},
			{
				name: 'Decode Path',
				value: 'decodePath',
				description: 'Decode V3 path into tokens and fees',
				action: 'Decode swap path',
			},
			{
				name: 'Calculate Amount',
				value: 'calculateAmount',
				description: 'Convert between human-readable and raw amounts',
				action: 'Calculate token amount',
			},
			{
				name: 'Estimate Gas',
				value: 'estimateGas',
				description: 'Estimate gas for common operations',
				action: 'Estimate gas cost',
			},
			{
				name: 'Get Tick Bounds',
				value: 'getTickBounds',
				description: 'Get min/max tick values',
				action: 'Get tick bounds',
			},
			{
				name: 'Validate Address',
				value: 'validateAddress',
				description: 'Validate and checksum an address',
				action: 'Validate address',
			},
		],
		default: 'getContracts',
	},
	// Price/Tick conversion
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
		typeOptions: {
			numberPrecision: 18,
		},
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['priceToTick'],
			},
		},
		default: 1,
		description: 'The price to convert to tick',
		required: true,
	},
	{
		displayName: 'Tick',
		name: 'tick',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['tickToPrice'],
			},
		},
		default: 0,
		description: 'The tick to convert to price',
		required: true,
	},
	{
		displayName: 'Sqrt Price X96',
		name: 'sqrtPriceX96',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['sqrtPriceToPrice'],
			},
		},
		default: '',
		placeholder: '79228162514264337593543950336',
		description: 'The sqrtPriceX96 value from pool',
		required: true,
	},
	// Token decimals for price conversion
	{
		displayName: 'Token0 Decimals',
		name: 'token0Decimals',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['priceToTick', 'tickToPrice', 'sqrtPriceToPrice'],
			},
		},
		default: 18,
		description: 'Decimals of token0',
	},
	{
		displayName: 'Token1 Decimals',
		name: 'token1Decimals',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['priceToTick', 'tickToPrice', 'sqrtPriceToPrice'],
			},
		},
		default: 18,
		description: 'Decimals of token1',
	},
	// Fee tier for tick rounding
	{
		displayName: 'Fee Tier',
		name: 'feeTier',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['priceToTick', 'encodePath'],
			},
		},
		options: [
			{ name: '0.01%', value: 100 },
			{ name: '0.05%', value: 500 },
			{ name: '0.30%', value: 3000 },
			{ name: '1.00%', value: 10000 },
		],
		default: 3000,
	},
	// Encode/Decode path
	{
		displayName: 'Tokens',
		name: 'tokens',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['encodePath'],
			},
		},
		default: '',
		placeholder: '0xToken0, 0xToken1, 0xToken2',
		description: 'Comma-separated token addresses',
		required: true,
	},
	{
		displayName: 'Fees',
		name: 'fees',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['encodePath'],
			},
		},
		default: '',
		placeholder: '3000, 500',
		description: 'Comma-separated fee tiers (one less than tokens)',
		required: true,
	},
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['decodePath'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Encoded path to decode',
		required: true,
	},
	// Calculate amount
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateAmount'],
			},
		},
		default: '',
		placeholder: '1.5 or 1500000000000000000',
		description: 'Amount to convert',
		required: true,
	},
	{
		displayName: 'Decimals',
		name: 'decimals',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateAmount'],
			},
		},
		default: 18,
		description: 'Token decimals',
	},
	{
		displayName: 'Direction',
		name: 'direction',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateAmount'],
			},
		},
		options: [
			{ name: 'Human to Raw', value: 'toRaw' },
			{ name: 'Raw to Human', value: 'toHuman' },
		],
		default: 'toRaw',
	},
	// Gas estimation operation type
	{
		displayName: 'Operation Type',
		name: 'operationType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['estimateGas'],
			},
		},
		options: [
			{ name: 'Swap Exact Input', value: 'swapExactInput' },
			{ name: 'Swap Exact Output', value: 'swapExactOutput' },
			{ name: 'Add Liquidity', value: 'addLiquidity' },
			{ name: 'Remove Liquidity', value: 'removeLiquidity' },
			{ name: 'Mint Position', value: 'mintPosition' },
			{ name: 'Collect Fees', value: 'collectFees' },
			{ name: 'Approve Token', value: 'approve' },
		],
		default: 'swapExactInput',
	},
	// Validate address
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['validateAddress'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Address to validate',
		required: true,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<INodeExecutionData[]> {
	const network = this.getNodeParameter('network', index, 'ethereum') as string;

	if (operation === 'getContracts') {
		const contracts = CONTRACTS[network as keyof typeof CONTRACTS];
		if (!contracts) {
			throw new NodeOperationError(this.getNode(), `Unknown network: ${network}`, { itemIndex: index });
		}

		return [{
			json: {
				network,
				contracts: {
					factoryV3: contracts.factoryV3,
					factoryV2: contracts.factoryV2,
					routerV3: contracts.swapRouter,
					routerV2: contracts.routerV2,
					universalRouter: contracts.universalRouter,
					quoterV2: contracts.quoterV2,
					positionManager: contracts.nftPositionManager,
					permit2: contracts.permit2,
					multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
				},
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'getCommonTokens') {
		const tokens = COMMON_TOKENS[network as keyof typeof COMMON_TOKENS];
		if (!tokens) {
			throw new NodeOperationError(this.getNode(), `Unknown network: ${network}`, { itemIndex: index });
		}

		return [{
			json: { network, tokens },
			pairedItem: { item: index },
		}];
	}

	if (operation === 'getFeeTiers') {
		return [{
			json: {
				feeTiers: FEE_TIERS,
				summary: [
					{ fee: 100, percentage: '0.01%', tickSpacing: 1, useCase: 'Stable pairs' },
					{ fee: 500, percentage: '0.05%', tickSpacing: 10, useCase: 'Stable/correlated pairs' },
					{ fee: 3000, percentage: '0.30%', tickSpacing: 60, useCase: 'Most pairs (default)' },
					{ fee: 10000, percentage: '1.00%', tickSpacing: 200, useCase: 'Exotic pairs' },
				],
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'priceToTick') {
		const price = this.getNodeParameter('price', index) as number;
		const token0Decimals = this.getNodeParameter('token0Decimals', index, 18) as number;
		const token1Decimals = this.getNodeParameter('token1Decimals', index, 18) as number;
		const feeTier = this.getNodeParameter('feeTier', index, 3000) as number;
		const tickSpacing = FEE_TIERS[feeTier as keyof typeof FEE_TIERS]?.tickSpacing || 60;

		const tick = priceToTick(price, token0Decimals, token1Decimals);
		const roundedTick = Math.round(tick / tickSpacing) * tickSpacing;

		return [{
			json: {
				price,
				tick,
				roundedTick,
				tickSpacing,
				feeTier,
				// Verify by converting back
				verifiedPrice: tickToPrice(roundedTick, token0Decimals, token1Decimals),
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'tickToPrice') {
		const tick = this.getNodeParameter('tick', index) as number;
		const token0Decimals = this.getNodeParameter('token0Decimals', index, 18) as number;
		const token1Decimals = this.getNodeParameter('token1Decimals', index, 18) as number;

		const price = tickToPrice(tick, token0Decimals, token1Decimals);

		return [{
			json: {
				tick,
				price,
				priceInverse: 1 / price,
				token0Decimals,
				token1Decimals,
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'sqrtPriceToPrice') {
		const sqrtPriceX96 = this.getNodeParameter('sqrtPriceX96', index) as string;
		const token0Decimals = this.getNodeParameter('token0Decimals', index, 18) as number;
		const token1Decimals = this.getNodeParameter('token1Decimals', index, 18) as number;

		const price = sqrtPriceX96ToPrice(BigInt(sqrtPriceX96), token0Decimals, token1Decimals);

		return [{
			json: {
				sqrtPriceX96,
				price,
				priceInverse: 1 / price,
				token0Decimals,
				token1Decimals,
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'encodePath') {
		const tokensStr = this.getNodeParameter('tokens', index) as string;
		const feesStr = this.getNodeParameter('fees', index) as string;

		const tokens = tokensStr.split(',').map(t => t.trim());
		const fees = feesStr.split(',').map(f => parseInt(f.trim(), 10));

		if (tokens.length < 2) {
			throw new NodeOperationError(this.getNode(), 'At least 2 tokens required', { itemIndex: index });
		}

		if (fees.length !== tokens.length - 1) {
			throw new NodeOperationError(
				this.getNode(),
				`Number of fees (${fees.length}) must be one less than tokens (${tokens.length})`,
				{ itemIndex: index },
			);
		}

		const path = encodePath(tokens, fees);

		return [{
			json: {
				tokens,
				fees,
				path,
				hops: fees.length,
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'decodePath') {
		const path = this.getNodeParameter('path', index) as string;
		const decoded = decodePath(path);

		return [{
			json: {
				path,
				...decoded,
				hops: decoded.fees.length,
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'calculateAmount') {
		const amount = this.getNodeParameter('amount', index) as string;
		const decimals = this.getNodeParameter('decimals', index, 18) as number;
		const direction = this.getNodeParameter('direction', index, 'toRaw') as string;

		const factor = BigInt(10 ** decimals);

		if (direction === 'toRaw') {
			// Human readable to raw (e.g., 1.5 -> 1500000000000000000)
			const parts = amount.split('.');
			const wholePart = BigInt(parts[0] || '0') * factor;
			let fractionalPart = 0n;

			if (parts[1]) {
				const fractional = parts[1].padEnd(decimals, '0').slice(0, decimals);
				fractionalPart = BigInt(fractional);
			}

			const raw = wholePart + fractionalPart;

			return [{
				json: {
					input: amount,
					output: raw.toString(),
					decimals,
					direction: 'Human → Raw',
				},
				pairedItem: { item: index },
			}];
		} else {
			// Raw to human readable (e.g., 1500000000000000000 -> 1.5)
			const raw = BigInt(amount);
			const whole = raw / factor;
			const fractional = raw % factor;
			const fractionalStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
			const human = fractionalStr ? `${whole}.${fractionalStr}` : whole.toString();

			return [{
				json: {
					input: amount,
					output: human,
					decimals,
					direction: 'Raw → Human',
				},
				pairedItem: { item: index },
			}];
		}
	}

	if (operation === 'estimateGas') {
		const operationType = this.getNodeParameter('operationType', index) as string;

		// Typical gas estimates for different operations
		const gasEstimates: Record<string, { gas: number; description: string }> = {
			swapExactInput: { gas: 150000, description: 'Single-hop V3 swap' },
			swapExactOutput: { gas: 170000, description: 'Single-hop V3 swap exact output' },
			addLiquidity: { gas: 250000, description: 'Add liquidity to V2 pool' },
			removeLiquidity: { gas: 200000, description: 'Remove liquidity from V2 pool' },
			mintPosition: { gas: 500000, description: 'Mint new V3 position NFT' },
			collectFees: { gas: 150000, description: 'Collect fees from V3 position' },
			approve: { gas: 50000, description: 'ERC20 token approval' },
		};

		const estimate = gasEstimates[operationType];

		// Get current gas price if possible
		let gasPrice = null;
		let estimatedCostWei = null;
		let estimatedCostEth = null;

		try {
			const client = await UniswapClient.fromCredentials.call(this);
			const provider = client.getProvider();
			const feeData = await provider.getFeeData();
			gasPrice = feeData.gasPrice?.toString() || null;

			if (gasPrice) {
				estimatedCostWei = (BigInt(gasPrice) * BigInt(estimate.gas)).toString();
				estimatedCostEth = Number(estimatedCostWei) / 1e18;
			}
		} catch {
			// Ignore gas price fetch errors
		}

		return [{
			json: {
				operation: operationType,
				description: estimate.description,
				estimatedGas: estimate.gas,
				gasPrice,
				estimatedCostWei,
				estimatedCostEth,
				note: 'Actual gas may vary based on pool state and complexity',
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'getTickBounds') {
		return [{
			json: {
				MIN_TICK: TickMath.MIN_TICK,
				MAX_TICK: TickMath.MAX_TICK,
				MIN_SQRT_RATIO: TickMath.MIN_SQRT_RATIO.toString(),
				MAX_SQRT_RATIO: TickMath.MAX_SQRT_RATIO.toString(),
				tickSpacings: {
					'0.01%': 1,
					'0.05%': 10,
					'0.30%': 60,
					'1.00%': 200,
				},
				note: 'Valid ticks must be divisible by tick spacing for the fee tier',
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'validateAddress') {
		const address = this.getNodeParameter('address', index) as string;
		const { ethers } = await import('ethers');

		let isValid = false;
		let checksumAddress = null;
		let error = null;

		try {
			checksumAddress = ethers.getAddress(address);
			isValid = true;
		} catch (e) {
			error = (e as Error).message;
		}

		// Check if it's a contract (if we can connect)
		let isContract = null;
		if (isValid) {
			try {
				const client = await UniswapClient.fromCredentials.call(this);
				const provider = client.getProvider();
				const code = await provider.getCode(checksumAddress!);
				isContract = code !== '0x';
			} catch {
				// Ignore - can't determine
			}
		}

		return [{
			json: {
				input: address,
				isValid,
				checksumAddress,
				isContract,
				error,
			},
			pairedItem: { item: index },
		}];
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
}
