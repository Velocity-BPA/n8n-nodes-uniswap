/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Common token addresses across supported networks
 */

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Native wrapped tokens per chain
 */
export const WRAPPED_NATIVE: Record<number, TokenInfo> = {
  1: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  42161: {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  10: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  137: {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    symbol: 'WMATIC',
    name: 'Wrapped Matic',
    decimals: 18,
  },
  8453: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  56: {
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    decimals: 18,
  },
  43114: {
    address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    symbol: 'WAVAX',
    name: 'Wrapped AVAX',
    decimals: 18,
  },
  42220: {
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    symbol: 'WCELO',
    name: 'Wrapped Celo',
    decimals: 18,
  },
  81457: {
    address: '0x4300000000000000000000000000000000000004',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  324: {
    address: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
};

/**
 * Common stablecoins on Ethereum Mainnet
 */
export const STABLECOINS_ETH: Record<string, TokenInfo> = {
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  DAI: {
    address: '0x6B175474E89094C44Da98b954EescdeCB5fC1d92',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  FRAX: {
    address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
    symbol: 'FRAX',
    name: 'Frax',
    decimals: 18,
  },
  LUSD: {
    address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
    symbol: 'LUSD',
    name: 'Liquity USD',
    decimals: 18,
  },
};

/**
 * Popular DeFi tokens on Ethereum
 */
export const DEFI_TOKENS_ETH: Record<string, TokenInfo> = {
  UNI: {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
  AAVE: {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    symbol: 'AAVE',
    name: 'Aave Token',
    decimals: 18,
  },
  COMP: {
    address: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    symbol: 'COMP',
    name: 'Compound',
    decimals: 18,
  },
  CRV: {
    address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    symbol: 'CRV',
    name: 'Curve DAO Token',
    decimals: 18,
  },
  LDO: {
    address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    symbol: 'LDO',
    name: 'Lido DAO Token',
    decimals: 18,
  },
  MKR: {
    address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    symbol: 'MKR',
    name: 'Maker',
    decimals: 18,
  },
  SNX: {
    address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
    symbol: 'SNX',
    name: 'Synthetix',
    decimals: 18,
  },
};

/**
 * Liquid staking tokens
 */
export const LST_TOKENS_ETH: Record<string, TokenInfo> = {
  stETH: {
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    symbol: 'stETH',
    name: 'Lido Staked Ether',
    decimals: 18,
  },
  wstETH: {
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    symbol: 'wstETH',
    name: 'Wrapped Staked Ether',
    decimals: 18,
  },
  rETH: {
    address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    symbol: 'rETH',
    name: 'Rocket Pool ETH',
    decimals: 18,
  },
  cbETH: {
    address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    decimals: 18,
  },
};

/**
 * Get wrapped native token for a chain
 */
export function getWrappedNative(chainId: number): TokenInfo {
  const token = WRAPPED_NATIVE[chainId];
  if (!token) {
    throw new Error(`No wrapped native token for chain ${chainId}`);
  }
  return token;
}

/**
 * Check if an address is the wrapped native token
 */
export function isWrappedNative(address: string, chainId: number): boolean {
  const wrapped = WRAPPED_NATIVE[chainId];
  return wrapped?.address.toLowerCase() === address.toLowerCase();
}

/**
 * Native currency symbol per chain
 */
export const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  42161: 'ETH',
  10: 'ETH',
  137: 'MATIC',
  8453: 'ETH',
  56: 'BNB',
  43114: 'AVAX',
  42220: 'CELO',
  81457: 'ETH',
  324: 'ETH',
};
