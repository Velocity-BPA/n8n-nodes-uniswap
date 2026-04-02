/**
 * Copyright (c) 2026 Velocity BPA
 * Licensed under the Business Source License 1.1
 */

import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Uniswap } from '../nodes/Uniswap/Uniswap.node';

// Mock n8n-workflow
jest.mock('n8n-workflow', () => ({
  ...jest.requireActual('n8n-workflow'),
  NodeApiError: class NodeApiError extends Error {
    constructor(node: any, error: any) { super(error.message || 'API Error'); }
  },
  NodeOperationError: class NodeOperationError extends Error {
    constructor(node: any, message: string) { super(message); }
  },
}));

describe('Uniswap Node', () => {
  let node: Uniswap;

  beforeAll(() => {
    node = new Uniswap();
  });

  describe('Node Definition', () => {
    it('should have correct basic properties', () => {
      expect(node.description.displayName).toBe('Uniswap');
      expect(node.description.name).toBe('uniswap');
      expect(node.description.version).toBe(1);
      expect(node.description.inputs).toContain('main');
      expect(node.description.outputs).toContain('main');
    });

    it('should define 8 resources', () => {
      const resourceProp = node.description.properties.find(
        (p: any) => p.name === 'resource'
      );
      expect(resourceProp).toBeDefined();
      expect(resourceProp!.type).toBe('options');
      expect(resourceProp!.options).toHaveLength(8);
    });

    it('should have operation dropdowns for each resource', () => {
      const operations = node.description.properties.filter(
        (p: any) => p.name === 'operation'
      );
      expect(operations.length).toBe(8);
    });

    it('should require credentials', () => {
      expect(node.description.credentials).toBeDefined();
      expect(node.description.credentials!.length).toBeGreaterThan(0);
      expect(node.description.credentials![0].required).toBe(true);
    });

    it('should have parameters with proper displayOptions', () => {
      const params = node.description.properties.filter(
        (p: any) => p.displayOptions?.show?.resource
      );
      for (const param of params) {
        expect(param.displayOptions.show.resource).toBeDefined();
        expect(Array.isArray(param.displayOptions.show.resource)).toBe(true);
      }
    });
  });

  // Resource-specific tests
describe('Pool Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn(),
				requestWithAuthentication: jest.fn(),
			},
		};
	});

	it('should get pool information successfully', async () => {
		const mockPoolData = {
			data: {
				pool: {
					id: '0x123',
					token0: { symbol: 'USDC', name: 'USD Coin' },
					token1: { symbol: 'ETH', name: 'Ethereum' },
					feeTier: '3000',
					liquidity: '1000000',
					volumeUSD: '50000',
				},
			},
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getPool')
			.mockReturnValueOnce('0x123');
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce(mockPoolData);

		const result = await executePoolOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result[0].json).toEqual(mockPoolData.data.pool);
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'POST',
			url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
			headers: { 'Content-Type': 'application/json' },
			body: expect.stringContaining('"query"'),
			json: true,
		});
	});

	it('should get all pools successfully', async () => {
		const mockPoolsData = {
			data: {
				pools: [
					{ id: '0x123', token0: { symbol: 'USDC' }, token1: { symbol: 'ETH' } },
					{ id: '0x456', token0: { symbol: 'DAI' }, token1: { symbol: 'USDC' } },
				],
			},
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getAllPools')
			.mockReturnValueOnce(10)
			.mockReturnValueOnce(0)
			.mockReturnValueOnce('')
			.mockReturnValueOnce('totalValueLockedUSD');
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce(mockPoolsData);

		const result = await executePoolOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result[0].json).toEqual(mockPoolsData.data.pools);
	});

	it('should get pool day data successfully', async () => {
		const mockDayData = {
			data: {
				poolDayDatas: [
					{
						id: '0x123-18900',
						date: 1640995200,
						volumeUSD: '25000',
						tvlUSD: '1000000',
					},
				],
			},
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getPoolDayData')
			.mockReturnValueOnce('0x123')
			.mockReturnValueOnce('2021-12-31');
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce(mockDayData);

		const result = await executePoolOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result[0].json).toEqual(mockDayData.data.poolDayDatas);
	});

	it('should get pool hour data successfully', async () => {
		const mockHourData = {
			data: {
				poolHourDatas: [
					{
						id: '0x123-454320',
						periodStartUnix: 1640995200,
						volumeUSD: '5000',
						tvlUSD: '1000000',
					},
				],
			},
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getPoolHourData')
			.mockReturnValueOnce('0x123')
			.mockReturnValueOnce(1640995200);
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce(mockHourData);

		const result = await executePoolOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result[0].json).toEqual(mockHourData.data.poolHourDatas);
	});

	it('should handle API errors gracefully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getPool')
			.mockReturnValueOnce('0x123');
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValueOnce(
			new Error('API request failed'),
		);
		mockExecuteFunctions.continueOnFail.mockReturnValueOnce(true);

		const result = await executePoolOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result[0].json.error).toBe('API request failed');
	});

	it('should throw error for unknown operation', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('unknownOperation');

		await expect(
			executePoolOperations.call(mockExecuteFunctions, [{ json: {} }]),
		).rejects.toThrow('Unknown operation: unknownOperation');
	});
});

describe('Token Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn(),
				requestWithAuthentication: jest.fn()
			},
		};
	});

	it('should get token details successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getToken')
			.mockReturnValueOnce('0xA0b86a33E6441CAE78A7680D4B7D1c71688E4A8B');

		const mockResponse = {
			data: {
				token: {
					id: '0xa0b86a33e6441cae78a7680d4b7d1c71688e4a8b',
					symbol: 'UNI',
					name: 'Uniswap',
					decimals: '18',
					totalSupply: '1000000000',
					volumeUSD: '1000000',
					totalValueLockedUSD: '500000'
				}
			}
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeTokenOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockResponse);
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'POST',
			url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
			headers: { 'Content-Type': 'application/json' },
			body: expect.stringContaining('GetToken'),
			json: true,
		});
	});

	it('should get all tokens successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getAllTokens')
			.mockReturnValueOnce(10)
			.mockReturnValueOnce(0)
			.mockReturnValueOnce('')
			.mockReturnValueOnce('volumeUSD');

		const mockResponse = {
			data: {
				tokens: [
					{
						id: '0xa0b86a33e6441cae78a7680d4b7d1c71688e4a8b',
						symbol: 'UNI',
						name: 'Uniswap',
						volumeUSD: '1000000'
					}
				]
			}
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeTokenOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockResponse);
	});

	it('should get token day data successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTokenDayData')
			.mockReturnValueOnce('0xA0b86a33E6441CAE78A7680D4B7D1c71688E4A8B')
			.mockReturnValueOnce('2023-01-01T00:00:00.000Z');

		const mockResponse = {
			data: {
				tokenDayDatas: [{
					id: '0xa0b86a33e6441cae78a7680d4b7d1c71688e4a8b-1672531200',
					date: 1672531200,
					volumeUSD: '100000',
					totalValueLockedUSD: '500000'
				}]
			}
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeTokenOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockResponse);
	});

	it('should get token hour data successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTokenHourData')
			.mockReturnValueOnce('0xA0b86a33E6441CAE78A7680D4B7D1c71688E4A8B')
			.mockReturnValueOnce(1672531200);

		const mockResponse = {
			data: {
				tokenHourDatas: [{
					id: '0xa0b86a33e6441cae78a7680d4b7d1c71688e4a8b-1672531200',
					periodStartUnix: 1672531200,
					volumeUSD: '10000',
					totalValueLockedUSD: '500000'
				}]
			}
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeTokenOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockResponse);
	});

	it('should handle API errors gracefully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getToken')
			.mockReturnValueOnce('invalid-address');

		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Invalid token address'));
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		const result = await executeTokenOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json.error).toBe('Invalid token address');
	});

	it('should throw error for unknown operation', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('unknownOperation');

		await expect(
			executeTokenOperations.call(mockExecuteFunctions, [{ json: {} }])
		).rejects.toThrow('Unknown operation: unknownOperation');
	});
});

describe('Position Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        apiKey: 'test-key', 
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn() 
      },
    };
  });

  describe('getPosition operation', () => {
    it('should get position details successfully', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getPosition')
        .mockReturnValueOnce('123456');

      const mockResponse = {
        data: {
          position: {
            id: '123456',
            owner: '0x123...',
            liquidity: '1000000',
            depositedToken0: '100.5',
            depositedToken1: '200.8'
          }
        }
      };

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: mockResponse.data,
        pairedItem: { item: 0 }
      }]);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"variables":{"id":"123456"}'),
        json: true
      });
    });

    it('should handle GraphQL errors', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getPosition')
        .mockReturnValueOnce('invalid-id');

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        errors: [{ message: 'Position not found' }]
      });

      await expect(executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]))
        .rejects.toThrow('GraphQL Error: [{"message":"Position not found"}]');
    });
  });

  describe('getAllPositions operation', () => {
    it('should get all positions successfully', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getAllPositions')
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce('{}')
        .mockReturnValueOnce('id');

      const mockResponse = {
        data: {
          positions: [
            { id: '1', owner: '0x123...', liquidity: '1000' },
            { id: '2', owner: '0x456...', liquidity: '2000' }
          ]
        }
      };

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: mockResponse.data,
        pairedItem: { item: 0 }
      }]);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"variables":{"first":100,"skip":0,"orderBy":"id"}'),
        json: true
      });
    });

    it('should handle invalid where parameter', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getAllPositions')
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce('invalid-json')
        .mockReturnValueOnce('id');

      await expect(executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]))
        .rejects.toThrow('Invalid JSON in where parameter');
    });
  });

  describe('getPositionSnapshots operation', () => {
    it('should get position snapshots successfully', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getPositionSnapshots')
        .mockReturnValueOnce('123456')
        .mockReturnValueOnce(1640995200);

      const mockResponse = {
        data: {
          positionSnapshots: [
            { id: '1', timestamp: '1640995200', liquidity: '1000' },
            { id: '2', timestamp: '1640995300', liquidity: '1100' }
          ]
        }
      };

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: mockResponse.data,
        pairedItem: { item: 0 }
      }]);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"variables":{"positionId":"123456"}'),
        json: true
      });
    });

    it('should handle network errors', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getPositionSnapshots')
        .mockReturnValueOnce('123456')
        .mockReturnValueOnce('');

      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));

      await expect(executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]))
        .rejects.toThrow('Network error');
    });

    it('should continue on fail when enabled', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getPositionSnapshots')
        .mockReturnValueOnce('123456')
        .mockReturnValueOnce('');

      mockExecuteFunctions.continueOnFail.mockReturnValue(true);
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));

      const result = await executePositionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: { error: 'Network error' },
        pairedItem: { item: 0 }
      }]);
    });
  });
});

describe('Swap Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn() 
      },
    };
  });

  it('should get a specific swap successfully', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getSwap')
      .mockReturnValueOnce('0x123456789');

    const mockSwapData = {
      data: {
        swap: {
          id: '0x123456789',
          timestamp: '1699123456',
          pool: { id: '0xpool123', token0: { symbol: 'USDC' }, token1: { symbol: 'WETH' } },
          amount0: '1000',
          amount1: '-0.5',
          amountUSD: '1000'
        }
      }
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockSwapData);

    const result = await executeSwapOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toEqual([{ json: mockSwapData, pairedItem: { item: 0 } }]);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('swap(id: "0x123456789")'),
      json: true,
    });
  });

  it('should get all swaps with filtering', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getAllSwaps')
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('timestamp')
      .mockReturnValueOnce('0xpool123');

    const mockSwapsData = {
      data: {
        swaps: [
          { id: '0x1', timestamp: '1699123456', amountUSD: '1000' },
          { id: '0x2', timestamp: '1699123457', amountUSD: '2000' }
        ]
      }
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockSwapsData);

    const result = await executeSwapOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toEqual([{ json: mockSwapsData, pairedItem: { item: 0 } }]);
  });

  it('should get swaps by pool', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getSwapsByPool')
      .mockReturnValueOnce('0xpool123')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(0);

    const mockPoolSwapsData = {
      data: {
        swaps: [
          { id: '0x1', pool: { id: '0xpool123' }, amountUSD: '1000' }
        ]
      }
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPoolSwapsData);

    const result = await executeSwapOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toEqual([{ json: mockPoolSwapsData, pairedItem: { item: 0 } }]);
  });

  it('should get swaps by token', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getSwapsByToken')
      .mockReturnValueOnce('0xtoken123')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(0);

    const mockTokenSwapsData = {
      data: {
        swaps: [
          { id: '0x1', pool: { token0: { id: '0xtoken123', symbol: 'USDC' } }, amountUSD: '1000' }
        ]
      }
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockTokenSwapsData);

    const result = await executeSwapOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toEqual([{ json: mockTokenSwapsData, pairedItem: { item: 0 } }]);
  });

  it('should handle errors when continueOnFail is true', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getSwap');
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

    const result = await executeSwapOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toEqual([{ json: { error: 'API Error' }, pairedItem: { item: 0 } }]);
  });

  it('should throw error when continueOnFail is false', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getSwap');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

    await expect(executeSwapOperations.call(mockExecuteFunctions, [{ json: {} }]))
      .rejects.toThrow('API Error');
  });
});

describe('Mint Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
      },
    };
  });

  it('should get mint transaction successfully', async () => {
    const mockResponse = {
      data: {
        mint: {
          id: '0x123',
          owner: '0xabc',
          amount0: '1000',
          amount1: '2000',
          amountUSD: '3000',
        },
      },
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getMint')
      .mockReturnValueOnce('0x123');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeMintOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse.data);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('GetMint'),
      json: true,
    });
  });

  it('should get all mints successfully', async () => {
    const mockResponse = {
      data: {
        mints: [
          { id: '0x123', owner: '0xabc', amountUSD: '1000' },
          { id: '0x456', owner: '0xdef', amountUSD: '2000' },
        ],
      },
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getAllMints')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('timestamp');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeMintOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse.data);
  });

  it('should get mints by pool successfully', async () => {
    const mockResponse = {
      data: {
        mints: [
          { id: '0x123', pool: { id: '0xpool1' }, amountUSD: '1000' },
        ],
      },
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getMintsByPool')
      .mockReturnValueOnce('0xpool1')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(0);
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeMintOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse.data);
  });

  it('should get mints by owner successfully', async () => {
    const mockResponse = {
      data: {
        mints: [
          { id: '0x123', owner: '0xowner1', amountUSD: '1000' },
        ],
      },
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getMintsByOwner')
      .mockReturnValueOnce('0xowner1')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(0);
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeMintOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse.data);
  });

  it('should handle GraphQL errors', async () => {
    const mockResponse = {
      errors: [{ message: 'Invalid mint ID' }],
    };

    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getMint')
      .mockReturnValueOnce('invalid');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    await expect(
      executeMintOperations.call(mockExecuteFunctions, [{ json: {} }])
    ).rejects.toThrow('GraphQL Error');
  });

  it('should handle network errors with continueOnFail', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getMint')
      .mockReturnValueOnce('0x123');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);

    const result = await executeMintOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json.error).toBe('Network error');
  });
});

describe('Burn Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        apiKey: 'test-key', 
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn() 
      },
    };
  });

  it('should get specific burn transaction', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getBurn')
      .mockReturnValueOnce('0x123');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { 
        burn: { 
          id: '0x123', 
          amount0: '1000', 
          amount1: '2000',
          owner: '0xabc'
        } 
      }
    });

    const result = await executeBurnOperations.call(
      mockExecuteFunctions,
      [{ json: {} }]
    );

    expect(result).toHaveLength(1);
    expect(result[0].json.burn.id).toBe('0x123');
  });

  it('should get all burns with filtering', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getAllBurns')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce('amount_gt: "1000"')
      .mockReturnValueOnce('timestamp');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { 
        burns: [
          { id: '0x123', amount0: '1500' },
          { id: '0x456', amount0: '2000' }
        ] 
      }
    });

    const result = await executeBurnOperations.call(
      mockExecuteFunctions,
      [{ json: {} }]
    );

    expect(result).toHaveLength(1);
    expect(result[0].json.burns).toHaveLength(2);
  });

  it('should get burns by pool', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getBurnsByPool')
      .mockReturnValueOnce('0xpool123')
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(0);

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { 
        burns: [
          { id: '0x123', pool: { id: '0xpool123' } }
        ] 
      }
    });

    const result = await executeBurnOperations.call(
      mockExecuteFunctions,
      [{ json: {} }]
    );

    expect(result).toHaveLength(1);
    expect(result[0].json.burns[0].pool.id).toBe('0xpool123');
  });

  it('should get burns by owner', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getBurnsByOwner')
      .mockReturnValueOnce('0xowner123')
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(0);

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { 
        burns: [
          { id: '0x123', owner: '0xowner123' }
        ] 
      }
    });

    const result = await executeBurnOperations.call(
      mockExecuteFunctions,
      [{ json: {} }]
    );

    expect(result).toHaveLength(1);
    expect(result[0].json.burns[0].owner).toBe('0xowner123');
  });

  it('should handle GraphQL errors', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getBurn')
      .mockReturnValueOnce('invalid-id');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      errors: [{ message: 'Invalid burn ID' }]
    });

    await expect(
      executeBurnOperations.call(mockExecuteFunctions, [{ json: {} }])
    ).rejects.toThrow();
  });

  it('should handle network errors gracefully when continue on fail is enabled', async () => {
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getBurn')
      .mockReturnValueOnce('0x123');

    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
      new Error('Network error')
    );

    const result = await executeBurnOperations.call(
      mockExecuteFunctions,
      [{ json: {} }]
    );

    expect(result).toHaveLength(1);
    expect(result[0].json.error).toBe('Network error');
  });
});

describe('Factory Resource', () => {
  let mockExecuteFunctions: any;
  
  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { httpRequest: jest.fn(), requestWithAuthentication: jest.fn() },
    };
  });
  
  it('should get factory information successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('getFactory');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { factory: { id: '1', poolCount: '100', totalVolumeUSD: '1000000' } }
    });
    
    const result = await executeFactoryOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.data.factory.id).toBe('1');
  });
  
  it('should handle getFactory errors', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('getFactory');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    
    const result = await executeFactoryOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result[0].json.error).toBe('API Error');
  });
  
  it('should get factory day data successfully', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getFactoryDayData')
      .mockReturnValueOnce('2023-01-01');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { uniswapDayDatas: [{ date: 1672531200, volumeUSD: '500000' }] }
    });
    
    const result = await executeFactoryOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.data.uniswapDayDatas[0].volumeUSD).toBe('500000');
  });
  
  it('should handle getFactoryDayData errors', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getFactoryDayData')
      .mockReturnValueOnce('2023-01-01');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Date Error'));
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    
    const result = await executeFactoryOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result[0].json.error).toBe('Date Error');
  });
  
  it('should get protocol stats successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('getProtocolStats');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
      data: { 
        factory: { poolCount: '100', totalVolumeUSD: '1000000' },
        uniswapDayDatas: [{ volumeUSD: '50000', tvlUSD: '2000000' }]
      }
    });
    
    const result = await executeFactoryOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.data.factory.poolCount).toBe('100');
    expect(result[0].json.data.uniswapDayDatas[0].volumeUSD).toBe('50000');
  });
  
  it('should handle getProtocolStats errors', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('getProtocolStats');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Stats Error'));
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    
    const result = await executeFactoryOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result[0].json.error).toBe('Stats Error');
  });
});

describe('Tick Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({ 
				apiKey: 'test-key', 
				baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3' 
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: { httpRequest: jest.fn(), requestWithAuthentication: jest.fn() },
		};
	});

	test('should get specific tick information', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTick')
			.mockReturnValueOnce('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640')
			.mockReturnValueOnce(276324);

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			data: {
				ticks: [{
					id: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640#276324',
					tickIdx: '276324',
					liquidityGross: '12345678',
					liquidityNet: '87654321'
				}]
			}
		});

		const result = await executeTickOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json.ticks).toBeDefined();
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
				body: expect.objectContaining({
					query: expect.stringContaining('ticks')
				})
			})
		);
	});

	test('should get all ticks for a pool', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getAllTicks')
			.mockReturnValueOnce('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640')
			.mockReturnValueOnce(10)
			.mockReturnValueOnce(0)
			.mockReturnValueOnce('{}');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			data: {
				ticks: [
					{ id: '1', tickIdx: '276324', liquidityGross: '12345' },
					{ id: '2', tickIdx: '276325', liquidityGross: '67890' }
				]
			}
		});

		const result = await executeTickOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json.ticks).toHaveLength(2);
	});

	test('should get tick day data', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTickDayData')
			.mockReturnValueOnce('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640')
			.mockReturnValueOnce(276324)
			.mockReturnValueOnce('2023-10-01');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			data: {
				tickDayDatas: [{
					id: 'test-id',
					date: 1696118400,
					liquidityGross: '12345678',
					volumeUSD: '1000.50'
				}]
			}
		});

		const result = await executeTickOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json.tickDayDatas).toBeDefined();
	});

	test('should handle GraphQL errors', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTick')
			.mockReturnValueOnce('invalid-address')
			.mockReturnValueOnce(276324);

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			errors: [{ message: 'Invalid pool address' }]
		});

		await expect(executeTickOperations.call(mockExecuteFunctions, [{ json: {} }])).rejects.toThrow('GraphQL error');
	});

	test('should handle network errors', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTick')
			.mockReturnValueOnce('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640')
			.mockReturnValueOnce(276324);

		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));

		await expect(executeTickOperations.call(mockExecuteFunctions, [{ json: {} }])).rejects.toThrow('Network error');
	});

	test('should continue on fail when enabled', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTick')
			.mockReturnValueOnce('invalid-address')
			.mockReturnValueOnce(276324);

		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

		const result = await executeTickOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toHaveLength(1);
		expect(result[0].json.error).toBe('API Error');
	});
});
});
