/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';
import JSBI from 'jsbi';
import { Q96, tickToPrice, priceToTick } from '../constants/tickMath';

/**
 * Price calculation utilities for Uniswap V3
 */

/**
 * Calculate the price of token1 in terms of token0 from sqrtPriceX96
 */
export function calculatePrice(
  sqrtPriceX96: string,
  decimals0: number,
  decimals1: number,
): number {
  const sqrtPrice = JSBI.BigInt(sqrtPriceX96);
  const price = JSBI.divide(
    JSBI.multiply(sqrtPrice, sqrtPrice),
    JSBI.multiply(Q96, Q96),
  );
  const decimalAdjustment = Math.pow(10, decimals0 - decimals1);
  return JSBI.toNumber(price) * decimalAdjustment;
}

/**
 * Calculate price impact for a swap
 * @param amountIn Input amount
 * @param amountOut Output amount
 * @param spotPrice Current spot price
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(
  amountIn: string,
  amountOut: string,
  spotPrice: number,
  decimalsIn: number,
  decimalsOut: number,
): number {
  const inAmount = parseFloat(ethers.formatUnits(amountIn, decimalsIn));
  const outAmount = parseFloat(ethers.formatUnits(amountOut, decimalsOut));

  const expectedOut = inAmount * spotPrice;
  const priceImpact = ((expectedOut - outAmount) / expectedOut) * 100;

  return Math.abs(priceImpact);
}

/**
 * Get minimum received amount after slippage
 */
export function getMinimumReceived(
  amountOut: string,
  slippagePercent: number,
): string {
  const amount = BigInt(amountOut);
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  const bpsBase = BigInt(10000);
  const minAmount = (amount * (bpsBase - slippageBps)) / bpsBase;
  return minAmount.toString();
}

/**
 * Get maximum sent amount after slippage
 */
export function getMaximumSent(
  amountIn: string,
  slippagePercent: number,
): string {
  const amount = BigInt(amountIn);
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  const bpsBase = BigInt(10000);
  const maxAmount = (amount * (bpsBase + slippageBps)) / bpsBase;
  return maxAmount.toString();
}

/**
 * Convert human-readable amount to wei
 */
export function toWei(amount: string | number, decimals: number): string {
  return ethers.parseUnits(amount.toString(), decimals).toString();
}

/**
 * Convert wei to human-readable amount
 */
export function fromWei(amount: string, decimals: number): string {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Calculate TWAP from observations
 */
export function calculateTWAP(
  observations: Array<{ tickCumulative: string; timestamp: number }>,
  period: number,
): number {
  if (observations.length < 2) {
    throw new Error('Need at least 2 observations to calculate TWAP');
  }

  const newest = observations[observations.length - 1];
  const oldest = observations[0];

  const tickCumulativeDelta =
    BigInt(newest.tickCumulative) - BigInt(oldest.tickCumulative);
  const timeDelta = BigInt(newest.timestamp - oldest.timestamp);

  if (timeDelta === BigInt(0)) {
    throw new Error('Time delta cannot be zero');
  }

  const averageTick = Number(tickCumulativeDelta / timeDelta);
  return tickToPrice(averageTick);
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculate percentage change
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Sort tokens by address (required for Uniswap pool ordering)
 */
export function sortTokens(
  tokenA: string,
  tokenB: string,
): [string, string] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

/**
 * Check if a token pair is sorted correctly
 */
export function isSorted(tokenA: string, tokenB: string): boolean {
  return tokenA.toLowerCase() < tokenB.toLowerCase();
}

/**
 * Invert price (swap base and quote)
 */
export function invertPrice(price: number): number {
  if (price === 0) return 0;
  return 1 / price;
}
