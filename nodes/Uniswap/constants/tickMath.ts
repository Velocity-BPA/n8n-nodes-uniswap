/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Uniswap V3 Tick Math Constants and Utilities
 *
 * In Uniswap V3, prices are represented as sqrt(price) * 2^96 (sqrtPriceX96)
 * Ticks represent discrete price points where liquidity can be placed.
 *
 * Key formulas:
 * - price = 1.0001^tick
 * - tick = log(price) / log(1.0001)
 * - sqrtPriceX96 = sqrt(price) * 2^96
 */

import JSBI from 'jsbi';

/**
 * Q96 constant for fixed-point math (2^96)
 */
export const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
export const Q192 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(192));

/**
 * Minimum and maximum tick values
 */
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

/**
 * Minimum and maximum sqrt price
 */
export const MIN_SQRT_RATIO = JSBI.BigInt('4295128739');
export const MAX_SQRT_RATIO = JSBI.BigInt('1461446703485210103287273052203988822378723970342');

/**
 * Base for tick calculations (1.0001)
 */
export const TICK_BASE = 1.0001;

/**
 * Price precision for display
 */
export const PRICE_PRECISION = 18;

/**
 * Calculate price from tick
 * price = 1.0001^tick
 */
export function tickToPrice(tick: number): number {
  return Math.pow(TICK_BASE, tick);
}

/**
 * Calculate tick from price
 * tick = floor(log(price) / log(1.0001))
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(TICK_BASE));
}

/**
 * Calculate sqrtPriceX96 from tick
 */
export function tickToSqrtPriceX96(tick: number): JSBI {
  const price = tickToPrice(tick);
  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = sqrtPrice * Math.pow(2, 96);
  return JSBI.BigInt(Math.floor(sqrtPriceX96).toString());
}

/**
 * Calculate tick from sqrtPriceX96
 */
export function sqrtPriceX96ToTick(sqrtPriceX96: JSBI): number {
  const sqrtPrice = JSBI.toNumber(sqrtPriceX96) / Math.pow(2, 96);
  const price = sqrtPrice * sqrtPrice;
  return priceToTick(price);
}

/**
 * Calculate price from sqrtPriceX96
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: JSBI,
  decimals0: number,
  decimals1: number,
): number {
  const sqrtPrice = JSBI.toNumber(sqrtPriceX96) / Math.pow(2, 96);
  const price = sqrtPrice * sqrtPrice;
  const decimalAdjustment = Math.pow(10, decimals0 - decimals1);
  return price * decimalAdjustment;
}

/**
 * Get the nearest usable tick for a given tick spacing
 */
export function nearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  if (rounded < MIN_TICK) return MIN_TICK + tickSpacing;
  if (rounded > MAX_TICK) return MAX_TICK - tickSpacing;
  return rounded;
}

/**
 * Calculate the price range for a position given tick bounds
 */
export function ticksToPrice(
  tickLower: number,
  tickUpper: number,
  decimals0: number,
  decimals1: number,
): { priceLower: number; priceUpper: number } {
  const decimalAdjustment = Math.pow(10, decimals0 - decimals1);
  return {
    priceLower: tickToPrice(tickLower) * decimalAdjustment,
    priceUpper: tickToPrice(tickUpper) * decimalAdjustment,
  };
}

/**
 * Check if a tick is within valid range
 */
export function isValidTick(tick: number): boolean {
  return tick >= MIN_TICK && tick <= MAX_TICK;
}

/**
 * Check if tick is usable with given tick spacing
 */
export function isUsableTick(tick: number, tickSpacing: number): boolean {
  return tick % tickSpacing === 0;
}

/**
 * Calculate the number of ticks between two prices
 */
export function ticksBetween(priceLower: number, priceUpper: number): number {
  const tickLower = priceToTick(priceLower);
  const tickUpper = priceToTick(priceUpper);
  return Math.abs(tickUpper - tickLower);
}

/**
 * Format price for display with appropriate decimals
 */
export function formatPrice(price: number, significantDigits: number = 6): string {
  if (price === 0) return '0';
  if (price < 0.0001) {
    return price.toExponential(significantDigits - 1);
  }
  if (price < 1) {
    return price.toPrecision(significantDigits);
  }
  return price.toLocaleString(undefined, {
    maximumSignificantDigits: significantDigits,
  });
}

/**
 * Calculate concentrated liquidity bonus
 * Higher concentration = more fees per unit of capital
 */
export function concentrationFactor(
  tickLower: number,
  tickUpper: number,
  currentTick: number,
): number {
  if (currentTick < tickLower || currentTick > tickUpper) {
    return 0; // Out of range
  }
  const fullRange = MAX_TICK - MIN_TICK;
  const positionRange = tickUpper - tickLower;
  return fullRange / positionRange;
}
