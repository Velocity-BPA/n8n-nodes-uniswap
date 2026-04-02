# n8n-nodes-uniswap

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for interacting with Uniswap Protocol. This node provides access to 8 core resources, enabling automated DeFi operations including liquidity management, token swaps, pool monitoring, and position tracking across the Uniswap ecosystem.

![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![DeFi](https://img.shields.io/badge/DeFi-Uniswap-ff007a)
![Web3](https://img.shields.io/badge/Web3-Enabled-green)
![Ethereum](https://img.shields.io/badge/Ethereum-Compatible-627eea)

## Features

- **Pool Management** - Query pool data, statistics, and liquidity information across all Uniswap versions
- **Token Operations** - Retrieve token metadata, prices, and trading volumes with real-time data
- **Position Tracking** - Monitor and manage liquidity positions with detailed analytics
- **Swap Execution** - Execute token swaps with slippage protection and route optimization
- **Liquidity Actions** - Add liquidity through mint operations with position management
- **Burn Operations** - Remove liquidity positions and claim fees efficiently
- **Factory Queries** - Access factory contract data and pool creation information
- **Tick Data** - Retrieve granular tick-level data for concentrated liquidity analysis

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-uniswap`
5. Click **Install**

### Manual Installation

```bash
cd ~/.n8n
npm install n8n-nodes-uniswap
```

### Development Installation

```bash
git clone https://github.com/Velocity-BPA/n8n-nodes-uniswap.git
cd n8n-nodes-uniswap
npm install
npm run build
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-uniswap
n8n start
```

## Credentials Setup

| Field | Description | Required |
|-------|-------------|----------|
| API Key | Your Uniswap API key for accessing premium endpoints | Yes |
| Network | Ethereum network (mainnet, goerli, sepolia) | Yes |
| RPC Endpoint | Custom RPC endpoint URL (optional) | No |

## Resources & Operations

### 1. Pool

| Operation | Description |
|-----------|-------------|
| Get Pool Info | Retrieve detailed information about a specific liquidity pool |
| List Pools | Get a list of pools with filtering and pagination options |
| Get Pool Statistics | Fetch trading volume, fees, and liquidity statistics |
| Get Pool Tokens | Retrieve token pair information for a pool |

### 2. Token

| Operation | Description |
|-----------|-------------|
| Get Token Info | Fetch token metadata including symbol, decimals, and name |
| Get Token Price | Retrieve current token price and market data |
| List Tokens | Get a list of tokens with search and filter capabilities |
| Get Token Volume | Fetch trading volume data for a specific token |

### 3. Position

| Operation | Description |
|-----------|-------------|
| Get Position | Retrieve detailed information about a liquidity position |
| List Positions | Get positions for a specific wallet address |
| Get Position Value | Calculate current value and fees earned |
| Track Position | Monitor position changes over time |

### 4. Swap

| Operation | Description |
|-----------|-------------|
| Execute Swap | Perform a token swap with slippage protection |
| Quote Swap | Get swap quotes and routing information |
| Get Swap History | Retrieve historical swap transactions |
| Estimate Gas | Calculate gas costs for swap operations |

### 5. Mint

| Operation | Description |
|-----------|-------------|
| Mint Position | Add liquidity to create a new position |
| Estimate Mint | Calculate tokens needed for minting |
| Get Mint Quote | Get quotes for liquidity provision |
| Validate Mint | Validate mint parameters before execution |

### 6. Burn

| Operation | Description |
|-----------|-------------|
| Burn Position | Remove liquidity from an existing position |
| Estimate Burn | Calculate tokens received from burning |
| Get Burn Quote | Get quotes for liquidity removal |
| Collect Fees | Claim accumulated fees from positions |

### 7. Factory

| Operation | Description |
|-----------|-------------|
| Get Factory Info | Retrieve factory contract information |
| Get Pool Count | Get total number of pools created |
| Get Fee Info | Fetch fee tier information and settings |
| List Pool Creation | Get historical pool creation events |

### 8. Tick

| Operation | Description |
|-----------|-------------|
| Get Tick Data | Retrieve tick-level liquidity data |
| List Ticks | Get tick information for a specific pool |
| Get Tick Spacing | Fetch tick spacing for different fee tiers |
| Monitor Ticks | Track tick changes and liquidity movements |

## Usage Examples

```javascript
// Get pool information for USDC/ETH pair
{
  "pool_address": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
  "include_statistics": true,
  "include_tokens": true
}
```

```javascript
// Execute a token swap with slippage protection
{
  "token_in": "0xA0b86a33E6441e2d0B29EbE63c0E2e8A5CBc0cCe",
  "token_out": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "amount_in": "1000000000000000000",
  "slippage_tolerance": "0.5",
  "recipient": "0x742d35Cc6634C0532925a3b8D22AdBb17e79C5b4"
}
```

```javascript
// Monitor liquidity positions for a wallet
{
  "wallet_address": "0x742d35Cc6634C0532925a3b8D22AdBb17e79C5b4",
  "include_fees": true,
  "include_value": true,
  "status": "active"
}
```

```javascript
// Add liquidity to a pool
{
  "pool_address": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
  "amount0_desired": "1000000000",
  "amount1_desired": "1000000000000000000",
  "tick_lower": "-887220",
  "tick_upper": "887220",
  "deadline": "1700000000"
}
```

## Error Handling

| Error | Description | Solution |
|-------|-------------|----------|
| Invalid API Key | The provided API key is invalid or expired | Verify API key in credentials and ensure it's active |
| Insufficient Liquidity | Not enough liquidity available for the operation | Reduce trade size or try a different route |
| Slippage Exceeded | Price moved beyond acceptable slippage tolerance | Increase slippage tolerance or retry the transaction |
| Gas Limit Exceeded | Transaction requires more gas than the limit | Increase gas limit or optimize transaction parameters |
| Invalid Pool Address | The specified pool address does not exist | Verify the pool address is correct and deployed |
| Position Not Found | The requested position ID does not exist | Check position ID and ensure it belongs to the wallet |

## Development

```bash
npm install
npm run build
npm test
npm run lint
npm run dev
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
Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries: **licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please ensure:

1. Code follows existing style conventions
2. All tests pass (`npm test`)
3. Linting passes (`npm run lint`)
4. Documentation is updated for new features
5. Commit messages are descriptive

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-uniswap/issues)
- **Uniswap Docs**: [Uniswap Protocol Documentation](https://docs.uniswap.org/)
- **DeFi Community**: [Uniswap Discord](https://discord.gg/FCfyBSbCU5)