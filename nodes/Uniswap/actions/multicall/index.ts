/**
 * Multicall Actions - Batch contract calls for efficiency
 * 
 * SPDX-License-Identifier: BSL-1.1
 * Copyright (c) 2024 Anthropic, PBC
 * Licensed under the Business Source License 1.1
 * See LICENSE file for details
 */

import type { IExecuteFunctions, INodeProperties, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport/uniswapClient';
import { CONTRACTS } from '../../constants/contracts';

// Multicall3 contract (deployed on all major chains at same address)
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const MULTICALL3_ABI = [
	'function aggregate(tuple(address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)',
	'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[] returnData)',
	'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[] returnData)',
	'function blockAndAggregate(tuple(address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)',
	'function getBlockNumber() view returns (uint256 blockNumber)',
	'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
	'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
	'function getEthBalance(address addr) view returns (uint256 balance)',
];

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['multicall'],
			},
		},
		options: [
			{
				name: 'Batch Calls',
				value: 'batchCalls',
				description: 'Execute multiple contract calls in single transaction',
				action: 'Execute batch contract calls',
			},
			{
				name: 'Try Aggregate',
				value: 'tryAggregate',
				description: 'Execute calls with optional failure handling',
				action: 'Execute calls with failure handling',
			},
			{
				name: 'Get Pool States',
				value: 'getPoolStates',
				description: 'Batch fetch multiple pool states',
				action: 'Get multiple pool states',
			},
			{
				name: 'Get Token Balances',
				value: 'getTokenBalances',
				description: 'Batch fetch token balances for address',
				action: 'Get token balances',
			},
			{
				name: 'Get Block Info',
				value: 'getBlockInfo',
				description: 'Get current block number, hash, and timestamp',
				action: 'Get block info',
			},
		],
		default: 'batchCalls',
	},
	// Batch Calls
	{
		displayName: 'Calls',
		name: 'calls',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['multicall'],
				operation: ['batchCalls', 'tryAggregate'],
			},
		},
		default: `[
  {
    "target": "0x...",
    "callData": "0x...",
    "allowFailure": false
  }
]`,
		description: 'Array of calls with target address and encoded callData',
		required: true,
	},
	{
		displayName: 'Require Success',
		name: 'requireSuccess',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['multicall'],
				operation: ['tryAggregate'],
			},
		},
		default: false,
		description: 'Whether to revert if any call fails',
	},
	// Pool States
	{
		displayName: 'Pool Addresses',
		name: 'poolAddresses',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['multicall'],
				operation: ['getPoolStates'],
			},
		},
		default: '',
		placeholder: '0x8ad599..., 0x88e6A0...',
		description: 'Comma-separated list of V3 pool addresses',
		required: true,
	},
	// Token Balances
	{
		displayName: 'Wallet Address',
		name: 'walletAddress',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['multicall'],
				operation: ['getTokenBalances'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'The wallet address to check balances for',
		required: true,
	},
	{
		displayName: 'Token Addresses',
		name: 'tokenAddresses',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['multicall'],
				operation: ['getTokenBalances'],
			},
		},
		default: '',
		placeholder: '0xA0b86991..., 0xC02aaA39...',
		description: 'Comma-separated list of token addresses',
		required: true,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<INodeExecutionData[]> {
	const client = await UniswapClient.fromCredentials.call(this);
	const network = this.getNodeParameter('network', index, 'ethereum') as string;
	const contracts = CONTRACTS[network as keyof typeof CONTRACTS];

	if (operation === 'batchCalls') {
		const callsJson = this.getNodeParameter('calls', index) as string;
		
		let calls: Array<{ target: string; callData: string; allowFailure?: boolean }>;
		try {
			calls = typeof callsJson === 'string' ? JSON.parse(callsJson) : callsJson;
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON in calls parameter', { itemIndex: index });
		}

		if (!Array.isArray(calls) || calls.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Calls must be a non-empty array', { itemIndex: index });
		}

		// Use aggregate3 for more flexibility
		const formattedCalls = calls.map(call => ({
			target: call.target,
			allowFailure: call.allowFailure ?? false,
			callData: call.callData,
		}));

		const result = await client.call(
			MULTICALL3_ADDRESS,
			MULTICALL3_ABI,
			'aggregate3',
			[formattedCalls],
		);

		const results = result.map((r: { success: boolean; returnData: string }, i: number) => ({
			index: i,
			target: calls[i].target,
			success: r.success,
			returnData: r.returnData,
		}));

		return [{ json: { results, count: results.length }, pairedItem: { item: index } }];
	}

	if (operation === 'tryAggregate') {
		const callsJson = this.getNodeParameter('calls', index) as string;
		const requireSuccess = this.getNodeParameter('requireSuccess', index, false) as boolean;
		
		let calls: Array<{ target: string; callData: string }>;
		try {
			calls = typeof callsJson === 'string' ? JSON.parse(callsJson) : callsJson;
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON in calls parameter', { itemIndex: index });
		}

		const formattedCalls = calls.map(call => ({
			target: call.target,
			callData: call.callData,
		}));

		const result = await client.call(
			MULTICALL3_ADDRESS,
			MULTICALL3_ABI,
			'tryAggregate',
			[requireSuccess, formattedCalls],
		);

		const results = result.map((r: { success: boolean; returnData: string }, i: number) => ({
			index: i,
			target: calls[i].target,
			success: r.success,
			returnData: r.returnData,
		}));

		return [{ json: { results, count: results.length }, pairedItem: { item: index } }];
	}

	if (operation === 'getPoolStates') {
		const poolAddressesStr = this.getNodeParameter('poolAddresses', index) as string;
		const poolAddresses = poolAddressesStr.split(',').map(a => a.trim()).filter(a => a);

		if (poolAddresses.length === 0) {
			throw new NodeOperationError(this.getNode(), 'At least one pool address is required', { itemIndex: index });
		}

		// Build calls for slot0 and liquidity for each pool
		const { ethers } = await import('ethers');
		const poolInterface = new ethers.Interface([
			'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
			'function liquidity() view returns (uint128)',
			'function token0() view returns (address)',
			'function token1() view returns (address)',
			'function fee() view returns (uint24)',
		]);

		const calls = poolAddresses.flatMap(pool => [
			{ target: pool, allowFailure: true, callData: poolInterface.encodeFunctionData('slot0') },
			{ target: pool, allowFailure: true, callData: poolInterface.encodeFunctionData('liquidity') },
			{ target: pool, allowFailure: true, callData: poolInterface.encodeFunctionData('token0') },
			{ target: pool, allowFailure: true, callData: poolInterface.encodeFunctionData('token1') },
			{ target: pool, allowFailure: true, callData: poolInterface.encodeFunctionData('fee') },
		]);

		const result = await client.call(
			MULTICALL3_ADDRESS,
			MULTICALL3_ABI,
			'aggregate3',
			[calls],
		);

		// Parse results
		const poolStates = poolAddresses.map((pool, i) => {
			const baseIndex = i * 5;
			const slot0Result = result[baseIndex];
			const liquidityResult = result[baseIndex + 1];
			const token0Result = result[baseIndex + 2];
			const token1Result = result[baseIndex + 3];
			const feeResult = result[baseIndex + 4];

			let slot0 = null;
			let liquidity = null;
			let token0 = null;
			let token1 = null;
			let fee = null;

			if (slot0Result.success) {
				const decoded = poolInterface.decodeFunctionResult('slot0', slot0Result.returnData);
				slot0 = {
					sqrtPriceX96: decoded.sqrtPriceX96.toString(),
					tick: Number(decoded.tick),
					observationIndex: Number(decoded.observationIndex),
					observationCardinality: Number(decoded.observationCardinality),
					feeProtocol: Number(decoded.feeProtocol),
					unlocked: decoded.unlocked,
				};
			}

			if (liquidityResult.success) {
				const decoded = poolInterface.decodeFunctionResult('liquidity', liquidityResult.returnData);
				liquidity = decoded[0].toString();
			}

			if (token0Result.success) {
				const decoded = poolInterface.decodeFunctionResult('token0', token0Result.returnData);
				token0 = decoded[0];
			}

			if (token1Result.success) {
				const decoded = poolInterface.decodeFunctionResult('token1', token1Result.returnData);
				token1 = decoded[0];
			}

			if (feeResult.success) {
				const decoded = poolInterface.decodeFunctionResult('fee', feeResult.returnData);
				fee = Number(decoded[0]);
			}

			return {
				pool,
				token0,
				token1,
				fee,
				slot0,
				liquidity,
			};
		});

		return [{ json: { pools: poolStates, count: poolStates.length }, pairedItem: { item: index } }];
	}

	if (operation === 'getTokenBalances') {
		const walletAddress = this.getNodeParameter('walletAddress', index) as string;
		const tokenAddressesStr = this.getNodeParameter('tokenAddresses', index) as string;
		const tokenAddresses = tokenAddressesStr.split(',').map(a => a.trim()).filter(a => a);

		if (tokenAddresses.length === 0) {
			throw new NodeOperationError(this.getNode(), 'At least one token address is required', { itemIndex: index });
		}

		const { ethers } = await import('ethers');
		const erc20Interface = new ethers.Interface([
			'function balanceOf(address) view returns (uint256)',
			'function decimals() view returns (uint8)',
			'function symbol() view returns (string)',
		]);

		// Build calls for balanceOf, decimals, and symbol for each token
		const calls = tokenAddresses.flatMap(token => [
			{ target: token, allowFailure: true, callData: erc20Interface.encodeFunctionData('balanceOf', [walletAddress]) },
			{ target: token, allowFailure: true, callData: erc20Interface.encodeFunctionData('decimals') },
			{ target: token, allowFailure: true, callData: erc20Interface.encodeFunctionData('symbol') },
		]);

		// Also get ETH balance
		calls.push({
			target: MULTICALL3_ADDRESS,
			allowFailure: false,
			callData: new ethers.Interface(MULTICALL3_ABI).encodeFunctionData('getEthBalance', [walletAddress]),
		});

		const result = await client.call(
			MULTICALL3_ADDRESS,
			MULTICALL3_ABI,
			'aggregate3',
			[calls],
		);

		// Parse token results
		const balances = tokenAddresses.map((token, i) => {
			const baseIndex = i * 3;
			const balanceResult = result[baseIndex];
			const decimalsResult = result[baseIndex + 1];
			const symbolResult = result[baseIndex + 2];

			let balance = '0';
			let decimals = 18;
			let symbol = 'UNKNOWN';

			if (balanceResult.success) {
				const decoded = erc20Interface.decodeFunctionResult('balanceOf', balanceResult.returnData);
				balance = decoded[0].toString();
			}

			if (decimalsResult.success) {
				const decoded = erc20Interface.decodeFunctionResult('decimals', decimalsResult.returnData);
				decimals = Number(decoded[0]);
			}

			if (symbolResult.success) {
				try {
					const decoded = erc20Interface.decodeFunctionResult('symbol', symbolResult.returnData);
					symbol = decoded[0];
				} catch {
					// Some tokens return bytes32 for symbol
					symbol = 'UNKNOWN';
				}
			}

			const formattedBalance = Number(BigInt(balance)) / Math.pow(10, decimals);

			return {
				token,
				symbol,
				decimals,
				balance,
				formattedBalance,
			};
		});

		// Parse ETH balance
		const ethBalanceResult = result[result.length - 1];
		let ethBalance = '0';
		if (ethBalanceResult.success) {
			const multicallInterface = new ethers.Interface(MULTICALL3_ABI);
			const decoded = multicallInterface.decodeFunctionResult('getEthBalance', ethBalanceResult.returnData);
			ethBalance = decoded[0].toString();
		}

		return [{
			json: {
				wallet: walletAddress,
				ethBalance,
				ethBalanceFormatted: Number(BigInt(ethBalance)) / 1e18,
				tokens: balances,
				count: balances.length,
			},
			pairedItem: { item: index },
		}];
	}

	if (operation === 'getBlockInfo') {
		const { ethers } = await import('ethers');
		const multicallInterface = new ethers.Interface(MULTICALL3_ABI);

		const calls = [
			{
				target: MULTICALL3_ADDRESS,
				allowFailure: false,
				callData: multicallInterface.encodeFunctionData('getBlockNumber'),
			},
			{
				target: MULTICALL3_ADDRESS,
				allowFailure: false,
				callData: multicallInterface.encodeFunctionData('getCurrentBlockTimestamp'),
			},
		];

		const result = await client.call(
			MULTICALL3_ADDRESS,
			MULTICALL3_ABI,
			'aggregate3',
			[calls],
		);

		const blockNumber = multicallInterface.decodeFunctionResult('getBlockNumber', result[0].returnData)[0];
		const timestamp = multicallInterface.decodeFunctionResult('getCurrentBlockTimestamp', result[1].returnData)[0];

		// Get block hash for the previous block (current block hash not available)
		const blockHashResult = await client.call(
			MULTICALL3_ADDRESS,
			MULTICALL3_ABI,
			'getBlockHash',
			[BigInt(blockNumber.toString()) - 1n],
		);

		return [{
			json: {
				blockNumber: blockNumber.toString(),
				timestamp: timestamp.toString(),
				timestampDate: new Date(Number(timestamp) * 1000).toISOString(),
				previousBlockHash: blockHashResult,
			},
			pairedItem: { item: index },
		}];
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
}
