# n8n-nodes-uniswap

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for interacting with the Uniswap decentralized exchange protocol. This node supports Uniswap V2 and V3 across 10 EVM chains, providing complete DeFi automation capabilities.

![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![n8n](https://img.shields.io/badge/n8n-community--node-orange)
![Chains](https://img.shields.io/badge/chains-10+-green)

## Features

- **Multi-Chain Support**: Ethereum, Arbitrum, Optimism, Polygon, Base, BNB Chain, Avalanche, Celo, Blast, zkSync Era
- **Uniswap V3**: Full support for concentrated liquidity, fee tiers, and NFT positions
- **Uniswap V2**: Legacy pool support for V2 pairs
- **22 Resource Categories**: Comprehensive coverage of Uniswap functionality
- **Event Triggers**: Monitor swaps, pools, liquidity, prices, and whale transactions
- **Type-Safe**: Full TypeScript implementation

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-uniswap`
5. Click **Install**

### Manual Installation

```bash
# In your n8n installation directory
npm install n8n-nodes-uniswap
```

### Development Installation

```bash
# 1. Extract the zip file
unzip n8n-nodes-uniswap.zip
cd n8n-nodes-uniswap

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Create symlink to n8n custom nodes directory
# For Linux/macOS:
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-uniswap

# For Windows (run as Administrator):
# mklink /D %USERPROFILE%\.n8n\custom\n8n-nodes-uniswap %CD%

# 5. Restart n8n
n8n start
```

## Credentials Setup

### Uniswap Network (Required)

Configure blockchain RPC access:

| Field | Description |
|-------|-------------|
| Network | Select blockchain network (Ethereum, Arbitrum, etc.) |
| RPC URL | Your RPC endpoint URL |
| Private Key | (Optional) For transaction signing |

Recommended RPC providers: Alchemy, Infura, QuickNode

### Uniswap API (Optional)

For enhanced features like Uniswap X orders:

| Field | Description |
|-------|-------------|
| API Key | Your Uniswap API key |

## Resources & Operations

### Trading Operations

| Resource | Operations |
|----------|------------|
| **Swap** | getQuote, executeSwap, executeSwapV2, getPriceImpact, getMinimumReceived |
| **Quote** | exactInputSingle, exactOutputSingle, exactInput, exactOutput, bestQuote, compareFees |
| **Route** | findBest, getAllRoutes, encodePath, decodePath, findCommonPairs |

### Pool Management

| Resource | Operations |
|----------|------------|
| **Pool V3** | getPool, getPoolByAddress, getTopPools, getLiquidity, getPrice, getTicks, getSwaps, searchPools |
| **Pool V2** | getPair, getReserves, getPrice, calcOutput |
| **Factory** | getPoolV3, getPairV2, getTickSpacing, createPoolV3, createPairV2 |

### Liquidity Provision

| Resource | Operations |
|----------|------------|
| **Liquidity V3** | mint, increase, decrease, collect, burn |
| **Liquidity V2** | addLiquidity, addLiquidityETH, removeLiquidity, removeLiquidityETH, quoteAdd |
| **Position** | getPosition, getUserPositions, checkInRange, calcValue, calcIL, getUnclaimedFees |
| **NFT Position Manager** | getNFT, getTokenURI, getOwner, getBalance, transfer, approve |

### Tokens & Pricing

| Resource | Operations |
|----------|------------|
| **Token** | getInfo, getBalance, getAllowance, approve, getStats |
| **Price** | getPoolPrice, getTokenPrice, convertPrice, getSpotPrice |
| **Oracle** | getTWAP, getObservations, getCardinality, increaseCardinality |

### Advanced Features

| Resource | Operations |
|----------|------------|
| **Permit2** | getAllowance, approve, signPermit, getNonce, revoke |
| **Universal Router** | buildCommands, execute, getCommands |
| **Uniswap X** | getOrderInfo, getOpenOrders, getOrderStatus, getQuote |
| **Staking** | getStakes, getRewards, stake, unstake, claimRewards, getIncentives |
| **Governance** | getBalance, getVotingPower, getDelegates, delegate, getProposal, getProposalState, castVote |

### Analytics & Data

| Resource | Operations |
|----------|------------|
| **Analytics** | getProtocolStats, getTopPools, getTopTokens, getPoolAnalytics, getHistoricalData |
| **Subgraph** | customQuery, getPoolData, getPositionData, getSwapHistory, getTokenData, getUserData, getPoolDayData, getMints, getBurns, getFactoryData |
| **Multicall** | aggregate, tryAggregate, batch, simulate, getBlockInfo |
| **Utility** | getContractAddress, getChainId, encodeCall, decodeResult, estimateGas, parseAmount, formatAmount, getGasPrice, checksum, getDeadline, calculateSlippage, validateAddress |

## Trigger Node

The **Uniswap Trigger** node monitors events and triggers workflows:

| Event Type | Description |
|------------|-------------|
| New Swaps | Monitor swap transactions |
| New Pools | Monitor new pool creations |
| Liquidity Changes | Monitor mint/burn events |
| Price Changes | Monitor significant price movements |
| Position Changes | Monitor position updates for an address |
| Large Transactions | Monitor whale swap transactions |

## Usage Examples

### Get Best Quote for Token Swap

```json
{
  "resource": "quote",
  "operation": "bestQuote",
  "tokenIn": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "amount": "1"
}
```

### Monitor Large Swaps

Configure Uniswap Trigger:
- Event Type: Large Transactions
- Minimum USD Value: 100000
- Token Address: (optional) filter by token

### Get User's LP Positions

```json
{
  "resource": "position",
  "operation": "getUserPositions",
  "address": "0xYourWalletAddress"
}
```

## Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Ethereum | 1 | ✅ Full Support |
| Arbitrum One | 42161 | ✅ Full Support |
| Optimism | 10 | ✅ Full Support |
| Polygon | 137 | ✅ Full Support |
| Base | 8453 | ✅ Full Support |
| BNB Chain | 56 | ✅ Full Support |
| Avalanche | 43114 | ✅ Full Support |
| Celo | 42220 | ✅ Full Support |
| Blast | 81457 | ✅ Full Support |
| zkSync Era | 324 | ✅ Full Support |

## Error Handling

The node provides comprehensive error handling for common DeFi scenarios:
- Insufficient liquidity errors
- Slippage tolerance exceeded
- Invalid token addresses
- Network connectivity issues
- Transaction reverts with decoded reasons

## Security Best Practices

- Never commit private keys to version control
- Use environment variables for sensitive credentials
- Test transactions on testnets before mainnet
- Implement appropriate slippage tolerance
- Monitor gas prices before large transactions

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Fix linting issues
npm run lint:fix
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-uniswap/issues)
- **Documentation**: This README and inline code comments
- **n8n Community**: [n8n Community Forum](https://community.n8n.io/)

## Acknowledgments

- [Uniswap](https://uniswap.org/) for the protocol
- [n8n](https://n8n.io/) for the automation platform
- The DeFi community for continued innovation

## Disclaimer

This software interacts with decentralized finance protocols. Users are responsible for understanding the risks of DeFi transactions, verifying transaction parameters before execution, securing private keys and credentials, and compliance with applicable laws and regulations. The authors are not responsible for any financial losses incurred through use of this software.
