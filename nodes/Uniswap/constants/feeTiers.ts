/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Uniswap V3 fee tier configurations
 *
 * Fee tiers determine the cost of swapping in a pool and the tick spacing
 * for concentrated liquidity positions.
 *
 * - Lower fees = better for stable pairs, smaller tick spacing
 * - Higher fees = better for volatile pairs, larger tick spacing
 */

export interface FeeTier {
  fee: number;
  tickSpacing: number;
  label: string;
  description: string;
}

/**
 * Standard fee tiers supported by Uniswap V3
 */
export const FEE_TIERS: Record<number, FeeTier> = {
  100: {
    fee: 100,
    tickSpacing: 1,
    label: '0.01%',
    description: 'Best for very stable pairs like stablecoins',
  },
  500: {
    fee: 500,
    tickSpacing: 10,
    label: '0.05%',
    description: 'Best for stable pairs',
  },
  3000: {
    fee: 3000,
    tickSpacing: 60,
    label: '0.3%',
    description: 'Best for most pairs',
  },
  10000: {
    fee: 10000,
    tickSpacing: 200,
    label: '1%',
    description: 'Best for exotic pairs',
  },
};

/**
 * Fee amounts as basis points
 */
export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

/**
 * Tick spacing for each fee tier
 */
export const TICK_SPACINGS: Record<FeeAmount, number> = {
  [FeeAmount.LOWEST]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

/**
 * Get tick spacing for a fee amount
 */
export function getTickSpacing(fee: number): number {
  const tier = FEE_TIERS[fee];
  if (!tier) {
    throw new Error(`Invalid fee tier: ${fee}`);
  }
  return tier.tickSpacing;
}

/**
 * Get fee tier info
 */
export function getFeeTier(fee: number): FeeTier {
  const tier = FEE_TIERS[fee];
  if (!tier) {
    throw new Error(`Invalid fee tier: ${fee}`);
  }
  return tier;
}

/**
 * Convert fee amount to percentage
 */
export function feeToPercent(fee: number): number {
  return fee / 10000;
}

/**
 * Get all available fee tiers
 */
export function getAllFeeTiers(): FeeTier[] {
  return Object.values(FEE_TIERS);
}

/**
 * Validate if a fee tier is valid
 */
export function isValidFeeTier(fee: number): boolean {
  return fee in FEE_TIERS;
}

/**
 * Get recommended fee tier for a pair type
 */
export function getRecommendedFeeTier(
  isStablePair: boolean,
  isExoticPair: boolean = false,
): FeeAmount {
  if (isStablePair) {
    return FeeAmount.LOWEST;
  }
  if (isExoticPair) {
    return FeeAmount.HIGH;
  }
  return FeeAmount.MEDIUM;
}
