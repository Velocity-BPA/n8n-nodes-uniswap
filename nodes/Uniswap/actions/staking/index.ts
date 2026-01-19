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
    displayOptions: { show: { resource: ['staking'] } },
    options: [
      { name: 'Get Stakes', value: 'getStakes', description: 'Get staked positions' },
      { name: 'Get Rewards', value: 'getRewards', description: 'Get accumulated rewards' },
      { name: 'Stake Position', value: 'stake', description: 'Stake an NFT position' },
      { name: 'Unstake Position', value: 'unstake', description: 'Unstake an NFT position' },
      { name: 'Claim Rewards', value: 'claimRewards', description: 'Claim staking rewards' },
      { name: 'Get Incentives', value: 'getIncentives', description: 'Get available incentive programs' },
    ],
    default: 'getStakes',
  },
  {
    displayName: 'Token ID',
    name: 'tokenId',
    type: 'string',
    displayOptions: { show: { resource: ['staking'], operation: ['stake', 'unstake', 'getRewards', 'claimRewards'] } },
    default: '',
    description: 'NFT position token ID',
  },
  {
    displayName: 'User Address',
    name: 'userAddress',
    type: 'string',
    displayOptions: { show: { resource: ['staking'], operation: ['getStakes'] } },
    default: '',
    placeholder: 'Leave empty to use wallet address',
  },
  {
    displayName: 'Incentive Key (JSON)',
    name: 'incentiveKey',
    type: 'json',
    displayOptions: { show: { resource: ['staking'], operation: ['stake', 'unstake', 'getRewards', 'claimRewards'] } },
    default: '{}',
    description: 'Incentive key object with rewardToken, pool, startTime, endTime, refundee',
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

  const stakerAbi = [
    'function deposits(uint256) view returns (address,uint48,uint48)',
    'function stakes(uint256,bytes32) view returns (uint160,uint128)',
    'function rewards(address,address) view returns (uint256)',
    'function stakeToken((address,address,uint256,uint256,address),uint256)',
    'function unstakeToken((address,address,uint256,uint256,address),uint256)',
    'function claimReward(address,address,uint256) returns (uint256)',
    'function getRewardInfo((address,address,uint256,uint256,address),uint256) view returns (uint256,uint160)',
  ];

  switch (operation) {
    case 'getStakes': {
      const userAddress = this.getNodeParameter('userAddress', index, '') as string;
      const address = userAddress || await client.getAddress();

      // Get NFT positions owned by user
      const nftAbi = ['function balanceOf(address) view returns (uint256)', 'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)'];
      const balance = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'balanceOf', [address]);

      const stakes: unknown[] = [];
      const balanceNum = parseInt(balance.toString());
      
      for (let i = 0; i < balanceNum && i < 50; i++) {
        const tokenId = await client.call(contracts.nonfungiblePositionManager, nftAbi, 'tokenOfOwnerByIndex', [address, i]);
        
        try {
          const deposit = await client.call(contracts.staker, stakerAbi, 'deposits', [tokenId]);
          if (deposit[0] !== '0x0000000000000000000000000000000000000000') {
            stakes.push({
              tokenId: tokenId.toString(),
              owner: deposit[0],
              numberOfStakes: deposit[1],
              tickLower: deposit[2],
            });
          }
        } catch {
          // Token not staked
        }
      }

      result = {
        owner: address,
        stakes,
      };
      break;
    }

    case 'getRewards': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const incentiveKey = JSON.parse(this.getNodeParameter('incentiveKey', index) as string);

      const rewardInfo = await client.call(
        contracts.staker,
        stakerAbi,
        'getRewardInfo',
        [[incentiveKey.rewardToken, incentiveKey.pool, incentiveKey.startTime, incentiveKey.endTime, incentiveKey.refundee], tokenId],
      );

      result = {
        tokenId,
        reward: rewardInfo[0].toString(),
        secondsInsideX128: rewardInfo[1].toString(),
      };
      break;
    }

    case 'stake': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const incentiveKey = JSON.parse(this.getNodeParameter('incentiveKey', index) as string);

      const tx = await client.execute(
        contracts.staker,
        stakerAbi,
        'stakeToken',
        [[incentiveKey.rewardToken, incentiveKey.pool, incentiveKey.startTime, incentiveKey.endTime, incentiveKey.refundee], tokenId],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        staked: true,
      };
      break;
    }

    case 'unstake': {
      const tokenId = this.getNodeParameter('tokenId', index) as string;
      const incentiveKey = JSON.parse(this.getNodeParameter('incentiveKey', index) as string);

      const tx = await client.execute(
        contracts.staker,
        stakerAbi,
        'unstakeToken',
        [[incentiveKey.rewardToken, incentiveKey.pool, incentiveKey.startTime, incentiveKey.endTime, incentiveKey.refundee], tokenId],
      );

      result = {
        transactionHash: tx.hash,
        tokenId,
        unstaked: true,
      };
      break;
    }

    case 'claimRewards': {
      const incentiveKey = JSON.parse(this.getNodeParameter('incentiveKey', index) as string);
      const recipient = await client.getAddress();

      const tx = await client.execute(
        contracts.staker,
        stakerAbi,
        'claimReward',
        [incentiveKey.rewardToken, recipient, '0'],
      );

      result = {
        transactionHash: tx.hash,
        rewardToken: incentiveKey.rewardToken,
        recipient,
      };
      break;
    }

    case 'getIncentives': {
      result = {
        note: 'Incentive programs vary by chain and time. Check Uniswap governance for current programs.',
        stakerContract: contracts.staker,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
