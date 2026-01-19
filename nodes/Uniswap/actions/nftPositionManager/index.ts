/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['nftPositionManager'] } },
    options: [
      { name: 'Get NFT', value: 'getNFT', description: 'Get NFT position details' },
      { name: 'Get Token URI', value: 'getTokenURI', description: 'Get NFT token URI/metadata' },
      { name: 'Get Owner', value: 'getOwner', description: 'Get NFT owner' },
      { name: 'Get Balance', value: 'getBalance', description: 'Get NFT balance for address' },
      { name: 'Transfer', value: 'transfer', description: 'Transfer NFT position' },
      { name: 'Approve', value: 'approve', description: 'Approve NFT for transfer' },
    ],
    default: 'getNFT',
  },
  {
    displayName: 'Token ID',
    name: 'tokenId',
    type: 'string',
    displayOptions: { show: { resource: ['nftPositionManager'], operation: ['getNFT', 'getTokenURI', 'getOwner', 'transfer', 'approve'] } },
    default: '',
    description: 'NFT position token ID',
  },
  {
    displayName: 'Address',
    name: 'address',
    type: 'string',
    displayOptions: { show: { resource: ['nftPositionManager'], operation: ['getBalance'] } },
    default: '',
    placeholder: 'Leave empty to use wallet address',
  },
  {
    displayName: 'To Address',
    name: 'toAddress',
    type: 'string',
    displayOptions: { show: { resource: ['nftPositionManager'], operation: ['transfer', 'approve'] } },
    default: '',
    description: 'Recipient or approved address',
  },
];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  const contracts = client.getContracts();
  let result: Record<string, unknown>;

  const nftAbi = [
    'function positions(uint256) view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
    'function tokenURI(uint256) view returns (string)',
    'function ownerOf(uint256) view returns (address)',
    'function balanceOf(address) view returns (uint256)',
    'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)',
    'function safeTransferFrom(address,address,uint256)',
    'function approve(address,uint256)',
    'function getApproved(uint256) view returns (address)',
  ];

  switch (operation) {
    case 'getNFT': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const position = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'positions', [tokenId]);
      const owner = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'ownerOf', [tokenId]);

      result = {
        tokenId,
        owner,
        nonce: position[0].toString(),
        operator: position[1],
        token0: position[2],
        token1: position[3],
        fee: position[4],
        tickLower: position[5],
        tickUpper: position[6],
        liquidity: position[7].toString(),
        feeGrowthInside0LastX128: position[8].toString(),
        feeGrowthInside1LastX128: position[9].toString(),
        tokensOwed0: position[10].toString(),
        tokensOwed1: position[11].toString(),
      };
      break;
    }

    case 'getTokenURI': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const tokenURI = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'tokenURI', [tokenId]);

      // Token URI is typically a data URI with base64 encoded JSON
      let metadata = null;
      if (tokenURI.startsWith('data:application/json;base64,')) {
        const base64Data = tokenURI.replace('data:application/json;base64,', '');
        metadata = JSON.parse(Buffer.from(base64Data, 'base64').toString());
      }

      result = {
        tokenId,
        tokenURI,
        metadata,
      };
      break;
    }

    case 'getOwner': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      
      const owner = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'ownerOf', [tokenId]);
      const approved = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'getApproved', [tokenId]);

      result = {
        tokenId,
        owner,
        approvedAddress: approved,
      };
      break;
    }

    case 'getBalance': {
      const address = this.getNodeParameter('address', index, '') as string;
      const ownerAddress = address || await client.getAddress();
      
      const balance = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'balanceOf', [ownerAddress]);
      
      // Get all token IDs owned
      const tokenIds: string[] = [];
      const balanceNum = parseInt(balance.toString());
      for (let i = 0; i < balanceNum && i < 100; i++) {
        const tokenId = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'tokenOfOwnerByIndex', [ownerAddress, i]);
        tokenIds.push(tokenId.toString());
      }

      result = {
        owner: ownerAddress,
        balance: balance.toString(),
        tokenIds,
      };
      break;
    }

    case 'transfer': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const toAddress = this.getNodeParameter('toAddress', index) as string;
      
      const fromAddress = await client.getAddress();
      
      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'safeTransferFrom',
        [fromAddress, toAddress, tokenId],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        from: fromAddress,
        to: toAddress,
      };
      break;
    }

    case 'approve': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const toAddress = this.getNodeParameter('toAddress', index) as string;
      
      const tx = await client.execute(
        contracts.nonfungiblePositionManager,
        nftAbi,
        'approve',
        [toAddress, tokenId],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        approved: toAddress,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
