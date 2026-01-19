/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Network configuration for all supported chains
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  subgraphV2: string;
  subgraphV3: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'eth',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    subgraphV2: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'arb1',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    subgraphV2: '',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'oeth',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    subgraphV2: '',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    shortName: 'matic',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    subgraphV2: '',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  base: {
    chainId: 8453,
    name: 'Base',
    shortName: 'base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    subgraphV2: '',
    subgraphV3: 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    shortName: 'bnb',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    subgraphV2: '',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-bsc',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'avax',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    subgraphV2: '',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/lynnshaoyu/uniswap-v3-avax',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  },
  celo: {
    chainId: 42220,
    name: 'Celo',
    shortName: 'celo',
    rpcUrl: 'https://forno.celo.org',
    explorerUrl: 'https://celoscan.io',
    subgraphV2: '',
    subgraphV3: 'https://api.thegraph.com/subgraphs/name/jesse-sawa/uniswap-celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  },
  blast: {
    chainId: 81457,
    name: 'Blast',
    shortName: 'blast',
    rpcUrl: 'https://rpc.blast.io',
    explorerUrl: 'https://blastscan.io',
    subgraphV2: '',
    subgraphV3: '',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  zksync: {
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'zksync',
    rpcUrl: 'https://mainnet.era.zksync.io',
    explorerUrl: 'https://explorer.zksync.io',
    subgraphV2: '',
    subgraphV3: '',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
};

/**
 * Get network configuration by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find((network) => network.chainId === chainId);
}

/**
 * Get network configuration by name
 */
export function getNetwork(name: string): NetworkConfig {
  const network = NETWORKS[name];
  if (!network) {
    throw new Error(`Unknown network: ${name}`);
  }
  return network;
}

/**
 * Check if network supports V2
 */
export function supportsV2(network: string): boolean {
  const config = NETWORKS[network];
  return config?.subgraphV2 !== '';
}

/**
 * Check if network supports V3
 */
export function supportsV3(network: string): boolean {
  const config = NETWORKS[network];
  return config?.subgraphV3 !== '';
}
