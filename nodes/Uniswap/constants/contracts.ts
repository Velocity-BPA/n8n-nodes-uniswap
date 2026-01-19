/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Uniswap contract addresses for all supported chains
 */

export interface ContractAddresses {
  // V3 Core
  factoryV3: string;
  poolDeployer?: string;

  // V3 Periphery
  swapRouter: string;
  swapRouter02: string;
  quoterV2: string;
  nonfungiblePositionManager: string;
  tickLens: string;
  nftDescriptor?: string;

  // V2
  factoryV2: string;
  routerV2: string;

  // Universal Router
  universalRouter: string;

  // Permit2
  permit2: string;

  // WETH
  weth: string;

  // Multicall
  multicall: string;

  // Staker
  staker?: string;

  // Governance
  governor?: string;
  timelock?: string;
  uni?: string;
}

export const CONTRACTS: Record<number, ContractAddresses> = {
  // Ethereum Mainnet
  1: {
    factoryV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    nonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    tickLens: '0xbfd8137f7d1516D3ea5cA83523914859ec47F573',
    factoryV2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    routerV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    universalRouter: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    multicall: '0x1F98415757620B543A52E61c46B32eB19261F984',
    staker: '0x1f98407aaB862CdDeF78Ed252D6f557aA5b0f00d',
    governor: '0x408ED6354d4973f66138C91495F2f2FCbd8724C3',
    timelock: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
    uni: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },

  // Arbitrum One
  42161: {
    factoryV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    nonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    tickLens: '0xbfd8137f7d1516D3ea5cA83523914859ec47F573',
    factoryV2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    routerV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    universalRouter: '0x5E325eDA8064b456f4781070C0738d849c824258',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    multicall: '0x1F98415757620B543A52E61c46B32eB19261F984',
  },

  // Optimism
  10: {
    factoryV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    nonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    tickLens: '0xbfd8137f7d1516D3ea5cA83523914859ec47F573',
    factoryV2: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',
    routerV2: '0x4A7b5Da61326A6379179b40d00F57E5bbDC962c2',
    universalRouter: '0xb555edF5dcF85f42cEeF1f3630a52A108E55A654',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0x4200000000000000000000000000000000000006',
    multicall: '0x1F98415757620B543A52E61c46B32eB19261F984',
  },

  // Polygon
  137: {
    factoryV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    nonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    tickLens: '0xbfd8137f7d1516D3ea5cA83523914859ec47F573',
    factoryV2: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    routerV2: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    universalRouter: '0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    multicall: '0x1F98415757620B543A52E61c46B32eB19261F984',
  },

  // Base
  8453: {
    factoryV3: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    swapRouter02: '0x2626664c2603336E57B271c5C0b26F421741e481',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    nonfungiblePositionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    tickLens: '0x0CdeE061c75D43c82520eD998C23ac2991c9ac6d',
    factoryV2: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    routerV2: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    universalRouter: '0x198EF79F1F515F02dFE9e3115eD9fC07183f02fC',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0x4200000000000000000000000000000000000006',
    multicall: '0x091e99cb1C49331a94dD62755D168E941AbD0693',
  },

  // BNB Chain
  56: {
    factoryV3: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
    swapRouter: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
    swapRouter02: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
    quoterV2: '0x78D78E420Da98ad378D7799bE8f4AF69033EB077',
    nonfungiblePositionManager: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613',
    tickLens: '0xD9270014D396281579760619CCf4c3af0501A47C',
    factoryV2: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    routerV2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    universalRouter: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    multicall: '0x963Df249eD09c358A4819E39d9Cd5736c3087184',
  },

  // Avalanche
  43114: {
    factoryV3: '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD',
    swapRouter: '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',
    swapRouter02: '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',
    quoterV2: '0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F',
    nonfungiblePositionManager: '0x655C406EBFa14EE2006250925e54ec43AD184f8B',
    tickLens: '0xEB9fFC8bf81b4fFd11fb6A63a6B0f098c6e21950',
    factoryV2: '0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C',
    routerV2: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    universalRouter: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    multicall: '0x0139141Cd4Ee88dF3Cdb65881D411bAE271Ef0D2',
  },

  // Celo
  42220: {
    factoryV3: '0xAfE208a311B21f13EF87E33A90049fC17A7acDEc',
    swapRouter: '0x5615CDAb10dc425a742d643d949a7F474C01abc4',
    swapRouter02: '0x5615CDAb10dc425a742d643d949a7F474C01abc4',
    quoterV2: '0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8',
    nonfungiblePositionManager: '0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A',
    tickLens: '0x5f115D9113F88e0a0Db1b5033D90D4a9690AcD3D',
    factoryV2: '0x62d5b84bE28a183aBB507E125B384122D2C25fAE',
    routerV2: '0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121',
    universalRouter: '0x4Dae2f939ACf50408e13d58534Ff8c2776d45265',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    multicall: '0x633987602DE5C4F337e3DbF265303A1080324204',
  },

  // Blast
  81457: {
    factoryV3: '0x792edAdE80af5fC680d96a2eD80A44247D2Cf6Fd',
    swapRouter: '0x549FEB8c9bd4c12Ad2AB27022dA12492aC452B66',
    swapRouter02: '0x549FEB8c9bd4c12Ad2AB27022dA12492aC452B66',
    quoterV2: '0x6Cdcd65e03c1CEc3730AeeCd45bc140D57A25C77',
    nonfungiblePositionManager: '0xB218e4f7cF0533d4696fDfC419A0023D33345F28',
    tickLens: '0x2E95185bCdD928a3e984B7e2D6560Ab1b17d7274',
    factoryV2: '0x5C346464d33F90bABaf70dB6388507CC889C1070',
    routerV2: '0xBB66Eb1c5e875933D44DAe661dbD80e5D9B03035',
    universalRouter: '0x643770E279d5D0733F21d6DC03A8efbABf3255B4',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    weth: '0x4300000000000000000000000000000000000004',
    multicall: '0xdC7f370de7631cE9e2c2e1DCDA6B3B5744Cf4705',
  },

  // zkSync Era
  324: {
    factoryV3: '0x8FdA5a7a8dCA67BBcDd10F02Fa0649A937215422',
    swapRouter: '0x99c56385daBCE3E81d8499d0b8d0257aBC07E8A3',
    swapRouter02: '0x99c56385daBCE3E81d8499d0b8d0257aBC07E8A3',
    quoterV2: '0x8Cb537fc92E26d8EBBb760E632c95484b6Ea3e28',
    nonfungiblePositionManager: '0x0616e5762c1E7Dc3723c50663dF10a162D690a86',
    tickLens: '0xe10FF11b809f8EE07b058F2566D6B3C9771E6c9C',
    factoryV2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    routerV2: '0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb',
    universalRouter: '0x28731BCC616B5f51Dd52CF2e4dF0E78dD1136C06',
    permit2: '0x0000000000225e31D15943971F47aD3022F714Fa',
    weth: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
    multicall: '0xF9cda624FBC7e059355ce98a31693d299FACd963',
  },
};

/**
 * Get contract addresses for a chain
 */
export function getContracts(chainId: number): ContractAddresses {
  const contracts = CONTRACTS[chainId];
  if (!contracts) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return contracts;
}

/**
 * Permit2 address (same across most chains)
 */
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

/**
 * Zero address constant
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Max uint256 for approvals
 */
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
