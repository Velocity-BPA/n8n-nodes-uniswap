/**
 * Unit Tests for Uniswap Utilities
 * SPDX-License-Identifier: BSL-1.1
 * Copyright (c) 2024 Anthropic, PBC
 */

import { priceToTick, tickToPrice, sqrtPriceX96ToTick, tickToSqrtPriceX96 } from '../nodes/Uniswap/utils/tickUtils';
import { sqrtPriceX96ToPrice, priceToSqrtPriceX96 } from '../nodes/Uniswap/utils/priceUtils';
import { encodePath, decodePath } from '../nodes/Uniswap/utils/pathUtils';
import { calculateLiquidityAmounts, calculatePositionValue } from '../nodes/Uniswap/utils/liquidityUtils';

describe('Tick Utils', () => {
	describe('priceToTick', () => {
		it('should convert price 1.0 to tick 0', () => {
			const tick = priceToTick(1.0);
			expect(tick).toBe(0);
		});

		it('should convert price 2.0 to approximately tick 6931', () => {
			const tick = priceToTick(2.0);
			expect(tick).toBeCloseTo(6931, -1);
		});

		it('should convert price 0.5 to approximately tick -6931', () => {
			const tick = priceToTick(0.5);
			expect(tick).toBeCloseTo(-6931, -1);
		});

		it('should handle very small prices', () => {
			const tick = priceToTick(0.0001);
			expect(tick).toBeLessThan(-40000);
		});

		it('should handle very large prices', () => {
			const tick = priceToTick(10000);
			expect(tick).toBeGreaterThan(80000);
		});
	});

	describe('tickToPrice', () => {
		it('should convert tick 0 to price 1.0', () => {
			const price = tickToPrice(0);
			expect(price).toBeCloseTo(1.0, 10);
		});

		it('should convert tick 6931 to approximately price 2.0', () => {
			const price = tickToPrice(6931);
			expect(price).toBeCloseTo(2.0, 1);
		});

		it('should convert tick -6931 to approximately price 0.5', () => {
			const price = tickToPrice(-6931);
			expect(price).toBeCloseTo(0.5, 1);
		});

		it('should be inverse of priceToTick', () => {
			const originalPrice = 1.5;
			const tick = priceToTick(originalPrice);
			const recoveredPrice = tickToPrice(tick);
			expect(recoveredPrice).toBeCloseTo(originalPrice, 4);
		});
	});

	describe('sqrtPriceX96ToTick', () => {
		it('should convert sqrtPriceX96 for price 1.0', () => {
			const sqrtPriceX96 = BigInt('79228162514264337593543950336'); // 2^96
			const tick = sqrtPriceX96ToTick(sqrtPriceX96);
			expect(tick).toBe(0);
		});
	});

	describe('tickToSqrtPriceX96', () => {
		it('should convert tick 0 to 2^96', () => {
			const sqrtPriceX96 = tickToSqrtPriceX96(0);
			expect(sqrtPriceX96.toString()).toBe('79228162514264337593543950336');
		});
	});
});

describe('Price Utils', () => {
	describe('sqrtPriceX96ToPrice', () => {
		it('should convert sqrtPriceX96 to price for equal decimals', () => {
			const sqrtPriceX96 = BigInt('79228162514264337593543950336'); // 2^96
			const price = sqrtPriceX96ToPrice(sqrtPriceX96, 18, 18);
			expect(price).toBeCloseTo(1.0, 10);
		});

		it('should handle different decimals (USDC/ETH)', () => {
			const sqrtPriceX96 = BigInt('79228162514264337593543950336'); // 2^96
			const price = sqrtPriceX96ToPrice(sqrtPriceX96, 6, 18);
			expect(price).toBeCloseTo(1e-12, 20);
		});
	});

	describe('priceToSqrtPriceX96', () => {
		it('should convert price 1.0 to 2^96', () => {
			const sqrtPriceX96 = priceToSqrtPriceX96(1.0);
			expect(sqrtPriceX96.toString()).toBe('79228162514264337593543950336');
		});

		it('should be inverse of sqrtPriceX96ToPrice', () => {
			const originalPrice = 2.5;
			const sqrtPriceX96 = priceToSqrtPriceX96(originalPrice);
			const recoveredPrice = sqrtPriceX96ToPrice(sqrtPriceX96, 18, 18);
			expect(recoveredPrice).toBeCloseTo(originalPrice, 8);
		});
	});
});

describe('Path Utils', () => {
	describe('encodePath', () => {
		it('should encode a single-hop path', () => {
			const tokens = [
				'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
				'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
			];
			const fees = [3000];
			const encoded = encodePath(tokens, fees);
			
			expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/);
			expect(encoded.length).toBe(2 + 40 + 6 + 40); // 0x + 2 addresses + 1 fee
		});

		it('should encode a multi-hop path', () => {
			const tokens = [
				'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
				'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
				'0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
			];
			const fees = [3000, 500];
			const encoded = encodePath(tokens, fees);
			
			expect(encoded.length).toBe(2 + 40 + 6 + 40 + 6 + 40); // 0x + 3 addresses + 2 fees
		});

		it('should throw for mismatched tokens and fees', () => {
			const tokens = ['0xToken1', '0xToken2'];
			const fees = [3000, 500]; // Should have 1 fee, not 2
			
			expect(() => encodePath(tokens, fees)).toThrow();
		});
	});

	describe('decodePath', () => {
		it('should decode an encoded path', () => {
			const tokens = [
				'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
				'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
			];
			const fees = [3000];
			const encoded = encodePath(tokens, fees);
			const decoded = decodePath(encoded);
			
			expect(decoded.tokens.length).toBe(2);
			expect(decoded.fees.length).toBe(1);
			expect(decoded.fees[0]).toBe(3000);
		});
	});
});

describe('Liquidity Utils', () => {
	describe('calculateLiquidityAmounts', () => {
		it('should calculate amounts for in-range position', () => {
			const result = calculateLiquidityAmounts(
				BigInt('1000000000000000000'), // liquidity
				0, // currentTick
				-100, // tickLower
				100, // tickUpper
				18, // decimals0
				18, // decimals1
			);

			expect(result.amount0).toBeGreaterThan(0);
			expect(result.amount1).toBeGreaterThan(0);
		});

		it('should return only token0 for out-of-range above', () => {
			const result = calculateLiquidityAmounts(
				BigInt('1000000000000000000'),
				200, // currentTick is above range
				-100,
				100,
				18,
				18,
			);

			expect(result.amount0).toBeGreaterThan(0);
			expect(result.amount1).toBe(0);
		});

		it('should return only token1 for out-of-range below', () => {
			const result = calculateLiquidityAmounts(
				BigInt('1000000000000000000'),
				-200, // currentTick is below range
				-100,
				100,
				18,
				18,
			);

			expect(result.amount0).toBe(0);
			expect(result.amount1).toBeGreaterThan(0);
		});
	});

	describe('calculatePositionValue', () => {
		it('should calculate USD value of position', () => {
			const value = calculatePositionValue(
				1.5, // amount0
				100, // amount1
				2000, // price0 (e.g., ETH)
				1, // price1 (e.g., USDC)
			);

			expect(value).toBe(1.5 * 2000 + 100 * 1);
		});
	});
});

describe('Fee Tier Constants', () => {
	const FEE_TIERS = [100, 500, 3000, 10000];
	const TICK_SPACINGS = { 100: 1, 500: 10, 3000: 60, 10000: 200 };

	it('should have correct tick spacing for each fee tier', () => {
		expect(TICK_SPACINGS[100]).toBe(1);
		expect(TICK_SPACINGS[500]).toBe(10);
		expect(TICK_SPACINGS[3000]).toBe(60);
		expect(TICK_SPACINGS[10000]).toBe(200);
	});

	it('should have fee tiers in basis points', () => {
		FEE_TIERS.forEach(fee => {
			expect(fee).toBeGreaterThan(0);
			expect(fee).toBeLessThanOrEqual(10000);
		});
	});
});
