/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import JSBI from 'jsbi';
import {
  MIN_TICK,
  MAX_TICK,
  tickToPrice,
  priceToTick,
  nearestUsableTick,
} from '../constants/tickMath';
import { getTickSpacing } from '../constants/feeTiers';

/**
 * Tick manipulation utilities for Uniswap V3 positions
 */

/**
 * Calculate tick range for a position around current price
 * @param currentTick Current pool tick
 * @param percentRange Desired range as percentage (e.g., 10 for ±10%)
 * @param feeTier Pool fee tier
 */
export function calculateTickRange(
  currentTick: number,
  percentRange: number,
  feeTier: number,
): { tickLower: number; tickUpper: number } {
  const currentPrice = tickToPrice(currentTick);
  const tickSpacing = getTickSpacing(feeTier);

  const priceLower = currentPrice * (1 - percentRange / 100);
  const priceUpper = currentPrice * (1 + percentRange / 100);

  const tickLower = nearestUsableTick(priceToTick(priceLower), tickSpacing);
  const tickUpper = nearestUsableTick(priceToTick(priceUpper), tickSpacing);

  return { tickLower, tickUpper };
}

/**
 * Calculate tick range for a full range position
 */
export function getFullRangeTicks(feeTier: number): { tickLower: number; tickUpper: number } {
  const tickSpacing = getTickSpacing(feeTier);
  return {
    tickLower: nearestUsableTick(MIN_TICK, tickSpacing),
    tickUpper: nearestUsableTick(MAX_TICK, tickSpacing),
  };
}

/**
 * Check if a position is in range
 */
export function isPositionInRange(
  tickLower: number,
  tickUpper: number,
  currentTick: number,
): boolean {
  return currentTick >= tickLower && currentTick < tickUpper;
}

/**
 * Calculate position width in ticks
 */
export function getPositionWidth(tickLower: number, tickUpper: number): number {
  return tickUpper - tickLower;
}

/**
 * Get tick bounds for a specific price range
 */
export function getTicksFromPriceRange(
  priceLower: number,
  priceUpper: number,
  feeTier: number,
  decimals0: number,
  decimals1: number,
): { tickLower: number; tickUpper: number } {
  const tickSpacing = getTickSpacing(feeTier);

  // Adjust for decimals
  const decimalAdjustment = Math.pow(10, decimals1 - decimals0);
  const adjustedPriceLower = priceLower * decimalAdjustment;
  const adjustedPriceUpper = priceUpper * decimalAdjustment;

  const tickLower = nearestUsableTick(priceToTick(adjustedPriceLower), tickSpacing);
  const tickUpper = nearestUsableTick(priceToTick(adjustedPriceUpper), tickSpacing);

  return { tickLower, tickUpper };
}

/**
 * Calculate the number of ticks in a position
 */
export function getTickCount(
  tickLower: number,
  tickUpper: number,
  tickSpacing: number,
): number {
  return Math.floor((tickUpper - tickLower) / tickSpacing);
}

/**
 * Get all usable ticks in a range
 */
export function getUsableTicksInRange(
  tickLower: number,
  tickUpper: number,
  tickSpacing: number,
): number[] {
  const ticks: number[] = [];
  const startTick = nearestUsableTick(tickLower, tickSpacing);

  for (let tick = startTick; tick <= tickUpper; tick += tickSpacing) {
    ticks.push(tick);
  }

  return ticks;
}

/**
 * Calculate distance from current tick to position bounds
 */
export function getTickDistance(
  currentTick: number,
  tickLower: number,
  tickUpper: number,
): { toLower: number; toUpper: number; percentInRange: number } {
  const width = tickUpper - tickLower;
  const toLower = currentTick - tickLower;
  const toUpper = tickUpper - currentTick;

  let percentInRange: number;
  if (currentTick < tickLower) {
    percentInRange = 0;
  } else if (currentTick > tickUpper) {
    percentInRange = 100;
  } else {
    percentInRange = (toLower / width) * 100;
  }

  return { toLower, toUpper, percentInRange };
}

/**
 * Validate tick inputs
 */
export function validateTicks(
  tickLower: number,
  tickUpper: number,
  tickSpacing: number,
): { valid: boolean; error?: string } {
  if (tickLower >= tickUpper) {
    return { valid: false, error: 'tickLower must be less than tickUpper' };
  }

  if (tickLower < MIN_TICK || tickUpper > MAX_TICK) {
    return { valid: false, error: 'Ticks out of valid range' };
  }

  if (tickLower % tickSpacing !== 0) {
    return { valid: false, error: 'tickLower not aligned to tick spacing' };
  }

  if (tickUpper % tickSpacing !== 0) {
    return { valid: false, error: 'tickUpper not aligned to tick spacing' };
  }

  return { valid: true };
}

/**
 * Calculate capital efficiency improvement over full range
 * Higher values = more capital efficient
 */
export function capitalEfficiency(tickLower: number, tickUpper: number): number {
  const fullRange = MAX_TICK - MIN_TICK;
  const positionRange = tickUpper - tickLower;
  return fullRange / positionRange;
}

/**
 * Suggest optimal tick range based on volatility
 * @param volatility Daily volatility as decimal (e.g., 0.05 for 5%)
 * @param holdingPeriodDays Expected holding period
 * @param confidenceLevel Statistical confidence (e.g., 0.95 for 95%)
 */
export function suggestTickRange(
  currentTick: number,
  volatility: number,
  holdingPeriodDays: number,
  confidenceLevel: number,
  feeTier: number,
): { tickLower: number; tickUpper: number } {
  // Using normal distribution z-score for confidence level
  const zScores: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const zScore = zScores[confidenceLevel] || 1.96;

  // Calculate expected price movement
  const expectedMove = volatility * Math.sqrt(holdingPeriodDays) * zScore;

  // Convert to ticks
  const tickSpacing = getTickSpacing(feeTier);
  const tickMove = Math.ceil(Math.abs(priceToTick(1 + expectedMove) - priceToTick(1)));

  const tickLower = nearestUsableTick(currentTick - tickMove, tickSpacing);
  const tickUpper = nearestUsableTick(currentTick + tickMove, tickSpacing);

  return { tickLower, tickUpper };
}
