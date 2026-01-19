/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { GraphQLClient, gql } from 'graphql-request';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { getNetwork } from '../constants/networks';

/**
 * Subgraph client for querying Uniswap analytics data
 */
export class SubgraphClient {
  private v2Client: GraphQLClient | null = null;
  private v3Client: GraphQLClient | null = null;

  constructor(v3Url?: string, v2Url?: string) {
    if (v3Url) {
      this.v3Client = new GraphQLClient(v3Url);
    }
    if (v2Url) {
      this.v2Client = new GraphQLClient(v2Url);
    }
  }

  /**
   * Create client from credentials
   */
  static async fromCredentials(
    context: IExecuteFunctions | ILoadOptionsFunctions,
  ): Promise<SubgraphClient> {
    const credentials = await context.getCredentials('uniswapNetwork');
    const network = credentials.network as string;

    let v3Url = credentials.subgraphUrl as string;
    let v2Url = '';

    if (network !== 'custom') {
      const config = getNetwork(network);
      v3Url = v3Url || config.subgraphV3;
      v2Url = config.subgraphV2;
    }

    return new SubgraphClient(v3Url, v2Url);
  }

  /**
   * Query V3 subgraph
   */
  async queryV3<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.v3Client) {
      throw new Error('V3 subgraph not configured');
    }
    return this.v3Client.request<T>(query, variables);
  }

  /**
   * Query V2 subgraph
   */
  async queryV2<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.v2Client) {
      throw new Error('V2 subgraph not configured');
    }
    return this.v2Client.request<T>(query, variables);
  }

  /**
   * Get V3 pool data
   */
  async getPool(poolAddress: string) {
    const query = gql`
      query GetPool($id: ID!) {
        pool(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          feeTier
          liquidity
          sqrtPrice
          tick
          token0Price
          token1Price
          volumeUSD
          txCount
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          poolDayData(first: 7, orderBy: date, orderDirection: desc) {
            date
            volumeUSD
            tvlUSD
            feesUSD
          }
        }
      }
    `;

    return this.queryV3<{ pool: unknown }>(query, { id: poolAddress.toLowerCase() });
  }

  /**
   * Get top pools
   */
  async getTopPools(limit: number = 20) {
    const query = gql`
      query GetTopPools($first: Int!) {
        pools(first: $first, orderBy: totalValueLockedUSD, orderDirection: desc) {
          id
          token0 {
            id
            symbol
            name
          }
          token1 {
            id
            symbol
            name
          }
          feeTier
          liquidity
          token0Price
          token1Price
          volumeUSD
          totalValueLockedUSD
        }
      }
    `;

    return this.queryV3<{ pools: unknown[] }>(query, { first: limit });
  }

  /**
   * Get token data
   */
  async getToken(tokenAddress: string) {
    const query = gql`
      query GetToken($id: ID!) {
        token(id: $id) {
          id
          symbol
          name
          decimals
          volume
          volumeUSD
          totalValueLocked
          totalValueLockedUSD
          txCount
          poolCount
          derivedETH
          tokenDayData(first: 7, orderBy: date, orderDirection: desc) {
            date
            volume
            volumeUSD
            totalValueLockedUSD
            priceUSD
          }
        }
      }
    `;

    return this.queryV3<{ token: unknown }>(query, { id: tokenAddress.toLowerCase() });
  }

  /**
   * Get positions for an owner
   */
  async getPositions(ownerAddress: string) {
    const query = gql`
      query GetPositions($owner: String!) {
        positions(where: { owner: $owner }) {
          id
          owner
          pool {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            feeTier
          }
          tickLower {
            tickIdx
          }
          tickUpper {
            tickIdx
          }
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
        }
      }
    `;

    return this.queryV3<{ positions: unknown[] }>(query, {
      owner: ownerAddress.toLowerCase(),
    });
  }

  /**
   * Get recent swaps for a pool
   */
  async getPoolSwaps(poolAddress: string, limit: number = 100) {
    const query = gql`
      query GetPoolSwaps($pool: String!, $first: Int!) {
        swaps(first: $first, orderBy: timestamp, orderDirection: desc, where: { pool: $pool }) {
          id
          timestamp
          sender
          recipient
          amount0
          amount1
          amountUSD
          sqrtPriceX96
          tick
          logIndex
        }
      }
    `;

    return this.queryV3<{ swaps: unknown[] }>(query, {
      pool: poolAddress.toLowerCase(),
      first: limit,
    });
  }

  /**
   * Get V2 pair data
   */
  async getV2Pair(pairAddress: string) {
    const query = gql`
      query GetPair($id: ID!) {
        pair(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          reserve0
          reserve1
          token0Price
          token1Price
          volumeUSD
          txCount
          reserveUSD
        }
      }
    `;

    return this.queryV2<{ pair: unknown }>(query, { id: pairAddress.toLowerCase() });
  }

  /**
   * Get protocol stats
   */
  async getProtocolStats() {
    const query = gql`
      query GetProtocolStats {
        factories(first: 1) {
          poolCount
          txCount
          totalVolumeUSD
          totalValueLockedUSD
          totalFeesUSD
        }
      }
    `;

    return this.queryV3<{ factories: unknown[] }>(query);
  }

  /**
   * Search pools by token
   */
  async searchPoolsByToken(tokenAddress: string, limit: number = 20) {
    const query = gql`
      query SearchPools($token: String!, $first: Int!) {
        pools(
          first: $first
          orderBy: totalValueLockedUSD
          orderDirection: desc
          where: { or: [{ token0: $token }, { token1: $token }] }
        ) {
          id
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
          feeTier
          totalValueLockedUSD
          volumeUSD
        }
      }
    `;

    return this.queryV3<{ pools: unknown[] }>(query, {
      token: tokenAddress.toLowerCase(),
      first: limit,
    });
  }

  /**
   * Get pool ticks
   */
  async getPoolTicks(poolAddress: string, limit: number = 1000) {
    const query = gql`
      query GetPoolTicks($pool: String!, $first: Int!) {
        ticks(first: $first, where: { pool: $pool }, orderBy: tickIdx) {
          tickIdx
          liquidityGross
          liquidityNet
          price0
          price1
        }
      }
    `;

    return this.queryV3<{ ticks: unknown[] }>(query, {
      pool: poolAddress.toLowerCase(),
      first: limit,
    });
  }

  /**
   * Custom GraphQL query
   */
  async customQuery(query: string, variables?: Record<string, unknown>, version: 'v2' | 'v3' = 'v3') {
    if (version === 'v2') {
      return this.queryV2(query, variables);
    }
    return this.queryV3(query, variables);
  }

  /**
   * Generic query method (defaults to V3)
   */
  async query<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.queryV3<T>(query, variables);
  }
}
