/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { ethers } from 'ethers';
import { PERMIT2_ADDRESS } from '../constants/contracts';

/**
 * Permit2 utilities for gasless token approvals
 *
 * Permit2 allows users to approve tokens once and then sign off-chain
 * permits for each swap, avoiding repeated on-chain approval transactions.
 */

export interface PermitSingle {
  details: {
    token: string;
    amount: string;
    expiration: number;
    nonce: number;
  };
  spender: string;
  sigDeadline: number;
}

export interface PermitBatch {
  details: Array<{
    token: string;
    amount: string;
    expiration: number;
    nonce: number;
  }>;
  spender: string;
  sigDeadline: number;
}

export interface SignedPermit {
  permit: PermitSingle | PermitBatch;
  signature: string;
}

/**
 * Create permit message for signing
 */
export function createPermitSingle(
  token: string,
  amount: string,
  spender: string,
  nonce: number,
  deadline: number,
  expiration?: number,
): PermitSingle {
  const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  return {
    details: {
      token,
      amount,
      expiration: expiration || thirtyDaysFromNow,
      nonce,
    },
    spender,
    sigDeadline: deadline,
  };
}

/**
 * Create batch permit message
 */
export function createPermitBatch(
  tokens: Array<{ token: string; amount: string }>,
  spender: string,
  nonce: number,
  deadline: number,
  expiration?: number,
): PermitBatch {
  const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  return {
    details: tokens.map((t, i) => ({
      token: t.token,
      amount: t.amount,
      expiration: expiration || thirtyDaysFromNow,
      nonce: nonce + i,
    })),
    spender,
    sigDeadline: deadline,
  };
}

/**
 * Get Permit2 domain for signing
 */
export function getPermit2Domain(chainId: number): ethers.TypedDataDomain {
  return {
    name: 'Permit2',
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };
}

/**
 * Permit2 types for EIP-712 signing
 */
export const PERMIT2_TYPES = {
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
  PermitBatch: [
    { name: 'details', type: 'PermitDetails[]' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
};

/**
 * Sign permit using ethers wallet
 */
export async function signPermit(
  wallet: ethers.Wallet,
  permit: PermitSingle,
  chainId: number,
): Promise<string> {
  const domain = getPermit2Domain(chainId);
  const signature = await wallet.signTypedData(domain, PERMIT2_TYPES, permit);
  return signature;
}

/**
 * Sign batch permit
 */
export async function signPermitBatch(
  wallet: ethers.Wallet,
  permit: PermitBatch,
  chainId: number,
): Promise<string> {
  const domain = getPermit2Domain(chainId);
  const types = {
    PermitBatch: PERMIT2_TYPES.PermitBatch,
    PermitDetails: PERMIT2_TYPES.PermitDetails,
  };
  const signature = await wallet.signTypedData(domain, types, permit);
  return signature;
}

/**
 * Calculate deadline from minutes
 */
export function getDeadline(minutes: number): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

/**
 * Check if permit is expired
 */
export function isPermitExpired(deadline: number): boolean {
  return Math.floor(Date.now() / 1000) > deadline;
}

/**
 * Encode permit for Universal Router
 */
export function encodePermit2Permit(
  permit: PermitSingle,
  signature: string,
): string {
  const abiCoder = new ethers.AbiCoder();

  return abiCoder.encode(
    [
      'tuple(tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline)',
      'bytes',
    ],
    [permit, signature],
  );
}

/**
 * Get max uint160 for unlimited permit
 */
export function getMaxPermitAmount(): string {
  return ((BigInt(2) ** BigInt(160)) - BigInt(1)).toString();
}

/**
 * Check if token needs Permit2 approval
 */
export async function needsPermit2Approval(
  provider: ethers.Provider,
  token: string,
  owner: string,
  amount: string,
): Promise<boolean> {
  const erc20Abi = ['function allowance(address,address) view returns (uint256)'];
  const contract = new ethers.Contract(token, erc20Abi, provider);

  const allowance = await contract.allowance(owner, PERMIT2_ADDRESS);
  return BigInt(allowance) < BigInt(amount);
}
