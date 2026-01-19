/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';
import JSBI from 'jsbi';
import { Q96, tickToSqrtPriceX96 } from '../constants/tickMath';

/**
 * Liquidity calculation utilities for Uniswap V3
 *
 * In V3, liquidity represents the virtual reserves at the current price.
 * The actual token amounts depend on the price range of the position.
 */

/**
 * Calculate liquidity from token amounts
 */
export function calculateLiquidityFromAmounts(
  sqrtPriceX96: string,
  sqrtPriceAX96: string,
  sqrtPriceBX96: string,
  amount0: string,
  amount1: string,
): string {
  const sqrtPrice = JSBI.BigInt(sqrtPriceX96);
  const sqrtPriceA = JSBI.BigInt(sqrtPriceAX96);
  const sqrtPriceB = JSBI.BigInt(sqrtPriceBX96);
  const amt0 = JSBI.BigInt(amount0);
  const amt1 = JSBI.BigInt(amount1);

  let liquidity: JSBI;

  if (JSBI.lessThanOrEqual(sqrtPrice, sqrtPriceA)) {
    // Current price below range - all token0
    liquidity = getLiquidityForAmount0(sqrtPriceA, sqrtPriceB, amt0);
  } else if (JSBI.lessThan(sqrtPrice, sqrtPriceB)) {
    // Current price in range
    const liquidity0 = getLiquidityForAmount0(sqrtPrice, sqrtPriceB, amt0);
    const liquidity1 = getLiquidityForAmount1(sqrtPriceA, sqrtPrice, amt1);
    liquidity = JSBI.lessThan(liquidity0, liquidity1) ? liquidity0 : liquidity1;
  } else {
    // Current price above range - all token1
    liquidity = getLiquidityForAmount1(sqrtPriceA, sqrtPriceB, amt1);
  }

  return liquidity.toString();
}

/**
 * Calculate token amounts from liquidity
 */
export function calculateAmountsFromLiquidity(
  sqrtPriceX96: string,
  sqrtPriceAX96: string,
  sqrtPriceBX96: string,
  liquidity: string,
): { amount0: string; amount1: string } {
  const sqrtPrice = JSBI.BigInt(sqrtPriceX96);
  const sqrtPriceA = JSBI.BigInt(sqrtPriceAX96);
  const sqrtPriceB = JSBI.BigInt(sqrtPriceBX96);
  const liq = JSBI.BigInt(liquidity);

  let amount0: JSBI;
  let amount1: JSBI;

  if (JSBI.lessThanOrEqual(sqrtPrice, sqrtPriceA)) {
    // Below range - all token0
    amount0 = getAmount0ForLiquidity(sqrtPriceA, sqrtPriceB, liq);
    amount1 = JSBI.BigInt(0);
  } else if (JSBI.lessThan(sqrtPrice, sqrtPriceB)) {
    // In range - both tokens
    amount0 = getAmount0ForLiquidity(sqrtPrice, sqrtPriceB, liq);
    amount1 = getAmount1ForLiquidity(sqrtPriceA, sqrtPrice, liq);
  } else {
    // Above range - all token1
    amount0 = JSBI.BigInt(0);
    amount1 = getAmount1ForLiquidity(sqrtPriceA, sqrtPriceB, liq);
  }

  return {
    amount0: amount0.toString(),
    amount1: amount1.toString(),
  };
}

/**
 * Calculate liquidity for amount0
 */
function getLiquidityForAmount0(
  sqrtPriceAX96: JSBI,
  sqrtPriceBX96: JSBI,
  amount0: JSBI,
): JSBI {
  const intermediate = JSBI.divide(
    JSBI.multiply(sqrtPriceAX96, sqrtPriceBX96),
    Q96,
  );
  return JSBI.divide(
    JSBI.multiply(amount0, intermediate),
    JSBI.subtract(sqrtPriceBX96, sqrtPriceAX96),
  );
}

/**
 * Calculate liquidity for amount1
 */
function getLiquidityForAmount1(
  sqrtPriceAX96: JSBI,
  sqrtPriceBX96: JSBI,
  amount1: JSBI,
): JSBI {
  return JSBI.divide(
    JSBI.multiply(amount1, Q96),
    JSBI.subtract(sqrtPriceBX96, sqrtPriceAX96),
  );
}

/**
 * Calculate amount0 for liquidity
 */
function getAmount0ForLiquidity(
  sqrtPriceAX96: JSBI,
  sqrtPriceBX96: JSBI,
  liquidity: JSBI,
): JSBI {
  const diff = JSBI.subtract(sqrtPriceBX96, sqrtPriceAX96);
  return JSBI.divide(
    JSBI.multiply(JSBI.multiply(liquidity, diff), Q96),
    JSBI.multiply(sqrtPriceAX96, sqrtPriceBX96),
  );
}

/**
 * Calculate amount1 for liquidity
 */
function getAmount1ForLiquidity(
  sqrtPriceAX96: JSBI,
  sqrtPriceBX96: JSBI,
  liquidity: JSBI,
): JSBI {
  const diff = JSBI.subtract(sqrtPriceBX96, sqrtPriceAX96);
  return JSBI.divide(JSBI.multiply(liquidity, diff), Q96);
}

/**
 * Calculate optimal token ratio for minting position
 */
export function calculateOptimalRatio(
  sqrtPriceX96: string,
  tickLower: number,
  tickUpper: number,
): { ratio0: number; ratio1: number } {
  const sqrtPrice = JSBI.BigInt(sqrtPriceX96);
  const sqrtPriceA = tickToSqrtPriceX96(tickLower);
  const sqrtPriceB = tickToSqrtPriceX96(tickUpper);

  // Use a unit liquidity to calculate ratio
  const unitLiquidity = JSBI.BigInt('1000000000000000000');

  const { amount0, amount1 } = calculateAmountsFromLiquidity(
    sqrtPriceX96,
    sqrtPriceA.toString(),
    sqrtPriceB.toString(),
    unitLiquidity.toString(),
  );

  const total = BigInt(amount0) + BigInt(amount1);
  if (total === BigInt(0)) {
    return { ratio0: 0.5, ratio1: 0.5 };
  }

  return {
    ratio0: Number(BigInt(amount0)) / Number(total),
    ratio1: Number(BigInt(amount1)) / Number(total),
  };
}

/**
 * Calculate position value in token1 terms
 */
export function calculatePositionValue(
  amount0: string,
  amount1: string,
  price: number,
  decimals0: number,
  decimals1: number,
): number {
  const amt0 = parseFloat(ethers.formatUnits(amount0, decimals0));
  const amt1 = parseFloat(ethers.formatUnits(amount1, decimals1));

  return amt0 * price + amt1;
}

/**
 * Calculate uncollected fees
 */
export function calculateFees(
  feeGrowthInside0X128: string,
  feeGrowthInside1X128: string,
  liquidity: string,
  feeGrowthInside0LastX128: string,
  feeGrowthInside1LastX128: string,
): { fees0: string; fees1: string } {
  const Q128 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128));

  const feeGrowth0 = JSBI.subtract(
    JSBI.BigInt(feeGrowthInside0X128),
    JSBI.BigInt(feeGrowthInside0LastX128),
  );
  const feeGrowth1 = JSBI.subtract(
    JSBI.BigInt(feeGrowthInside1X128),
    JSBI.BigInt(feeGrowthInside1LastX128),
  );

  const liq = JSBI.BigInt(liquidity);

  const fees0 = JSBI.divide(JSBI.multiply(feeGrowth0, liq), Q128);
  const fees1 = JSBI.divide(JSBI.multiply(feeGrowth1, liq), Q128);

  return {
    fees0: fees0.toString(),
    fees1: fees1.toString(),
  };
}

/**
 * Estimate APR from fees and TVL
 */
export function estimateAPR(
  fees24h: number,
  tvl: number,
): number {
  if (tvl === 0) return 0;
  const dailyReturn = fees24h / tvl;
  return dailyReturn * 365 * 100; // Annual percentage
}

/**
 * Calculate impermanent loss
 */
export function calculateImpermanentLoss(
  priceRatio: number, // current price / initial price
): number {
  const sqrtRatio = Math.sqrt(priceRatio);
  const il = (2 * sqrtRatio) / (1 + priceRatio) - 1;
  return Math.abs(il * 100);
}
