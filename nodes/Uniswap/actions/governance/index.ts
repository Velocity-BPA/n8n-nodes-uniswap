/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';

// UNI token address (same on mainnet)
const UNI_TOKEN = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
// Governor Bravo address
const GOVERNOR = '0x408ED6354d4973f66138C91495F2f2FCbd8724C3';

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['governance'] } },
    options: [
      { name: 'Get UNI Balance', value: 'getBalance', description: 'Get UNI token balance' },
      { name: 'Get Voting Power', value: 'getVotingPower', description: 'Get current voting power' },
      { name: 'Get Delegates', value: 'getDelegates', description: 'Get current delegate' },
      { name: 'Delegate', value: 'delegate', description: 'Delegate voting power' },
      { name: 'Get Proposal', value: 'getProposal', description: 'Get proposal details' },
      { name: 'Get Proposal State', value: 'getProposalState', description: 'Get proposal state' },
      { name: 'Cast Vote', value: 'castVote', description: 'Cast vote on proposal' },
    ],
    default: 'getBalance',
  },
  {
    displayName: 'Address',
    name: 'address',
    type: 'string',
    displayOptions: { show: { resource: ['governance'], operation: ['getBalance', 'getVotingPower', 'getDelegates'] } },
    default: '',
    placeholder: 'Leave empty to use wallet address',
  },
  {
    displayName: 'Delegate Address',
    name: 'delegateAddress',
    type: 'string',
    displayOptions: { show: { resource: ['governance'], operation: ['delegate'] } },
    default: '',
    description: 'Address to delegate voting power to',
  },
  {
    displayName: 'Proposal ID',
    name: 'proposalId',
    type: 'string',
    displayOptions: { show: { resource: ['governance'], operation: ['getProposal', 'getProposalState', 'castVote'] } },
    default: '',
    description: 'Governance proposal ID',
  },
  {
    displayName: 'Vote',
    name: 'vote',
    type: 'options',
    displayOptions: { show: { resource: ['governance'], operation: ['castVote'] } },
    options: [
      { name: 'Against', value: 0 },
      { name: 'For', value: 1 },
      { name: 'Abstain', value: 2 },
    ],
    default: 1,
  },
];

const PROPOSAL_STATES = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

export async function execute(
  this: IExecuteFunctions,
  index: number,
  operation: string,
): Promise<INodeExecutionData[]> {
  const client = await UniswapClient.fromCredentials(this);
  let result: Record<string, unknown>;

  const uniAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function getCurrentVotes(address) view returns (uint96)',
    'function delegates(address) view returns (address)',
    'function delegate(address)',
  ];

  const governorAbi = [
    'function proposals(uint256) view returns (uint256,address,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool)',
    'function state(uint256) view returns (uint8)',
    'function castVote(uint256,uint8)',
    'function getReceipt(uint256,address) view returns (bool,uint8,uint96)',
  ];

  switch (operation) {
    case 'getBalance': {
      const address = this.getNodeParameter('address', index, '') as string;
      const userAddress = address || await client.getAddress();
      
      const balance = await client.call(UNI_TOKEN, uniAbi, 'balanceOf', [userAddress]);

      result = {
        address: userAddress,
        balance: balance.toString(),
        balanceFormatted: Number(balance) / 1e18,
        token: 'UNI',
        tokenAddress: UNI_TOKEN,
      };
      break;
    }

    case 'getVotingPower': {
      const address = this.getNodeParameter('address', index, '') as string;
      const userAddress = address || await client.getAddress();
      
      const votes = await client.call(UNI_TOKEN, uniAbi, 'getCurrentVotes', [userAddress]);

      result = {
        address: userAddress,
        votingPower: votes.toString(),
        votingPowerFormatted: Number(votes) / 1e18,
      };
      break;
    }

    case 'getDelegates': {
      const address = this.getNodeParameter('address', index, '') as string;
      const userAddress = address || await client.getAddress();
      
      const delegate = await client.call(UNI_TOKEN, uniAbi, 'delegates', [userAddress]);
      const selfDelegated = delegate.toLowerCase() === userAddress.toLowerCase();

      result = {
        address: userAddress,
        delegate,
        selfDelegated,
      };
      break;
    }

    case 'delegate': {
      const delegateAddress = this.getNodeParameter('delegateAddress', index) as string;
      
      const tx = await client.execute(UNI_TOKEN, uniAbi, 'delegate', [delegateAddress]);

      result = {
        transactionHash: tx.hash,
        delegatedTo: delegateAddress,
      };
      break;
    }

    case 'getProposal': {
      const proposalId = this.getNodeParameter('proposalId', index) as string;
      
      const proposal = await client.call(GOVERNOR, governorAbi, 'proposals', [proposalId]);
      const state = await client.call(GOVERNOR, governorAbi, 'state', [proposalId]);

      result = {
        proposalId,
        id: proposal[0].toString(),
        proposer: proposal[1],
        eta: proposal[2].toString(),
        startBlock: proposal[3].toString(),
        endBlock: proposal[4].toString(),
        forVotes: proposal[5].toString(),
        againstVotes: proposal[6].toString(),
        abstainVotes: proposal[7].toString(),
        canceled: proposal[8],
        executed: proposal[9],
        state: PROPOSAL_STATES[state],
        stateCode: state,
      };
      break;
    }

    case 'getProposalState': {
      const proposalId = this.getNodeParameter('proposalId', index) as string;
      
      const state = await client.call(GOVERNOR, governorAbi, 'state', [proposalId]);

      result = {
        proposalId,
        state: PROPOSAL_STATES[state],
        stateCode: state,
      };
      break;
    }

    case 'castVote': {
      const proposalId = this.getNodeParameter('proposalId', index) as string;
      const vote = this.getNodeParameter('vote', index) as number;
      
      const tx = await client.execute(GOVERNOR, governorAbi, 'castVote', [proposalId, vote]);

      const voteLabels = ['Against', 'For', 'Abstain'];
      
      result = {
        transactionHash: tx.hash,
        proposalId,
        vote: voteLabels[vote],
        voteCode: vote,
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
