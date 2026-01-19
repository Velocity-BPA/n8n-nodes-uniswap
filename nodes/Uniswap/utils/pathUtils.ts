/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';

/**
 * Path encoding utilities for Uniswap V3 multi-hop swaps
 *
 * V3 paths are encoded as: token0 + fee + token1 + fee + token2 ...
 * Each token is 20 bytes and each fee is 3 bytes
 */

export interface PathHop {
  tokenIn: string;
  tokenOut: string;
  fee: number;
}

/**
 * Encode a swap path for V3
 * @param path Array of hops with tokenIn, tokenOut, and fee
 * @returns Encoded path as hex string
 */
export function encodePath(path: PathHop[]): string {
  if (path.length === 0) {
    throw new Error('Path cannot be empty');
  }

  let encoded = path[0].tokenIn.toLowerCase();

  for (const hop of path) {
    // Encode fee as 3 bytes
    const feeHex = hop.fee.toString(16).padStart(6, '0');
    encoded += feeHex + hop.tokenOut.slice(2).toLowerCase();
  }

  return encoded;
}

/**
 * Encode path for exact output swaps (reversed)
 */
export function encodePathExactOutput(path: PathHop[]): string {
  // Reverse the path for exact output
  const reversedPath = [...path].reverse().map((hop) => ({
    tokenIn: hop.tokenOut,
    tokenOut: hop.tokenIn,
    fee: hop.fee,
  }));

  return encodePath(reversedPath);
}

/**
 * Decode a V3 swap path
 */
export function decodePath(encodedPath: string): PathHop[] {
  const path: PathHop[] = [];
  let data = encodedPath.startsWith('0x') ? encodedPath.slice(2) : encodedPath;

  // First token (20 bytes = 40 hex chars)
  let tokenIn = '0x' + data.slice(0, 40);
  data = data.slice(40);

  while (data.length >= 46) {
    // 3 bytes fee + 20 bytes token
    // Fee (3 bytes = 6 hex chars)
    const fee = parseInt(data.slice(0, 6), 16);
    data = data.slice(6);

    // Token (20 bytes = 40 hex chars)
    const tokenOut = '0x' + data.slice(0, 40);
    data = data.slice(40);

    path.push({ tokenIn, tokenOut, fee });
    tokenIn = tokenOut;
  }

  return path;
}

/**
 * Get tokens from path
 */
export function getPathTokens(path: PathHop[]): string[] {
  const tokens = [path[0].tokenIn];
  for (const hop of path) {
    tokens.push(hop.tokenOut);
  }
  return tokens;
}

/**
 * Get total fees in path
 */
export function getPathTotalFees(path: PathHop[]): number {
  return path.reduce((sum, hop) => sum + hop.fee, 0);
}

/**
 * Validate path
 */
export function validatePath(path: PathHop[]): { valid: boolean; error?: string } {
  if (path.length === 0) {
    return { valid: false, error: 'Path cannot be empty' };
  }

  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].tokenOut.toLowerCase() !== path[i + 1].tokenIn.toLowerCase()) {
      return {
        valid: false,
        error: `Path discontinuity at hop ${i}: ${path[i].tokenOut} !== ${path[i + 1].tokenIn}`,
      };
    }
  }

  const validFees = [100, 500, 3000, 10000];
  for (const hop of path) {
    if (!validFees.includes(hop.fee)) {
      return { valid: false, error: `Invalid fee tier: ${hop.fee}` };
    }
  }

  return { valid: true };
}

/**
 * Create single hop path
 */
export function createSingleHopPath(
  tokenIn: string,
  tokenOut: string,
  fee: number,
): PathHop[] {
  return [{ tokenIn, tokenOut, fee }];
}

/**
 * Create multi-hop path
 */
export function createMultiHopPath(
  tokens: string[],
  fees: number[],
): PathHop[] {
  if (tokens.length < 2) {
    throw new Error('Need at least 2 tokens for a path');
  }

  if (fees.length !== tokens.length - 1) {
    throw new Error('Number of fees must equal number of tokens minus 1');
  }

  const path: PathHop[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    path.push({
      tokenIn: tokens[i],
      tokenOut: tokens[i + 1],
      fee: fees[i],
    });
  }

  return path;
}

/**
 * Calculate path length in bytes
 */
export function getPathLength(path: PathHop[]): number {
  // 20 bytes for first token + (3 bytes fee + 20 bytes token) per hop
  return 20 + path.length * 23;
}

/**
 * V2 path encoding (just addresses)
 */
export function encodeV2Path(tokens: string[]): string[] {
  return tokens.map((t) => ethers.getAddress(t));
}
