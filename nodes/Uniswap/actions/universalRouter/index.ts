/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { UniswapClient } from '../../transport';

// Universal Router command codes
const COMMANDS = {
  V3_SWAP_EXACT_IN: 0x00,
  V3_SWAP_EXACT_OUT: 0x01,
  PERMIT2_TRANSFER_FROM: 0x02,
  PERMIT2_PERMIT_BATCH: 0x03,
  SWEEP: 0x04,
  TRANSFER: 0x05,
  PAY_PORTION: 0x06,
  V2_SWAP_EXACT_IN: 0x08,
  V2_SWAP_EXACT_OUT: 0x09,
  PERMIT2_PERMIT: 0x0a,
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
  PERMIT2_TRANSFER_FROM_BATCH: 0x0d,
};

export const description: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['universalRouter'] } },
    options: [
      { name: 'Build Commands', value: 'buildCommands', description: 'Build a Universal Router command sequence' },
      { name: 'Execute', value: 'execute', description: 'Execute Universal Router commands' },
      { name: 'Get Commands', value: 'getCommands', description: 'Get available command codes' },
    ],
    default: 'buildCommands',
  },
  {
    displayName: 'Commands (JSON)',
    name: 'commands',
    type: 'json',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['execute'] } },
    default: '[]',
    description: 'Array of command objects with type and params',
  },
  {
    displayName: 'Command Type',
    name: 'commandType',
    type: 'options',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['buildCommands'] } },
    options: [
      { name: 'V3 Swap Exact In', value: 'V3_SWAP_EXACT_IN' },
      { name: 'V3 Swap Exact Out', value: 'V3_SWAP_EXACT_OUT' },
      { name: 'V2 Swap Exact In', value: 'V2_SWAP_EXACT_IN' },
      { name: 'V2 Swap Exact Out', value: 'V2_SWAP_EXACT_OUT' },
      { name: 'Wrap ETH', value: 'WRAP_ETH' },
      { name: 'Unwrap WETH', value: 'UNWRAP_WETH' },
      { name: 'Sweep', value: 'SWEEP' },
      { name: 'Transfer', value: 'TRANSFER' },
    ],
    default: 'V3_SWAP_EXACT_IN',
  },
  {
    displayName: 'Recipient',
    name: 'recipient',
    type: 'string',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['buildCommands'] } },
    default: '',
    placeholder: 'Leave empty for msg.sender',
  },
  {
    displayName: 'Amount In',
    name: 'amountIn',
    type: 'string',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['buildCommands'] } },
    default: '',
  },
  {
    displayName: 'Amount Out Min',
    name: 'amountOutMin',
    type: 'string',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['buildCommands'] } },
    default: '',
  },
  {
    displayName: 'Path',
    name: 'path',
    type: 'string',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['buildCommands'] } },
    default: '',
    placeholder: 'Encoded path for V3 or token addresses for V2',
  },
  {
    displayName: 'Deadline (seconds)',
    name: 'deadline',
    type: 'number',
    displayOptions: { show: { resource: ['universalRouter'], operation: ['execute'] } },
    default: 1200,
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

  const universalRouterAbi = [
    'function execute(bytes,bytes[],uint256) payable',
    'function execute(bytes,bytes[]) payable',
  ];

  switch (operation) {
    case 'buildCommands': {
      const commandType = this.getNodeParameter('commandType', index) as string;
      const recipient = this.getNodeParameter('recipient', index, '') as string;
      const amountIn = this.getNodeParameter('amountIn', index) as string;
      const amountOutMin = this.getNodeParameter('amountOutMin', index) as string;
      const path = this.getNodeParameter('path', index) as string;

      const commandCode = COMMANDS[commandType as keyof typeof COMMANDS];
      const recipientAddress = recipient || '0x0000000000000000000000000000000000000001'; // MSG_SENDER

      let encodedInput: string;

      switch (commandType) {
        case 'V3_SWAP_EXACT_IN':
        case 'V3_SWAP_EXACT_OUT':
          // (address recipient, uint256 amountIn, uint256 amountOutMin, bytes path, bool payerIsUser)
          encodedInput = `Encoded: recipient=${recipientAddress}, amountIn=${amountIn}, amountOutMin=${amountOutMin}, path=${path}`;
          break;
        case 'V2_SWAP_EXACT_IN':
        case 'V2_SWAP_EXACT_OUT':
          // (address recipient, uint256 amountIn, uint256 amountOutMin, address[] path, bool payerIsUser)
          encodedInput = `Encoded: recipient=${recipientAddress}, amountIn=${amountIn}, amountOutMin=${amountOutMin}, path=${path}`;
          break;
        case 'WRAP_ETH':
          encodedInput = `Encoded: recipient=${recipientAddress}, amount=${amountIn}`;
          break;
        case 'UNWRAP_WETH':
          encodedInput = `Encoded: recipient=${recipientAddress}, minAmount=${amountOutMin}`;
          break;
        default:
          encodedInput = 'Unknown command';
      }

      result = {
        commandType,
        commandCode: `0x${commandCode.toString(16).padStart(2, '0')}`,
        recipient: recipientAddress,
        amountIn,
        amountOutMin,
        path,
        encodedInput,
      };
      break;
    }

    case 'execute': {
      const commandsJson = this.getNodeParameter('commands', index) as string;
      const deadline = this.getNodeParameter('deadline', index) as number;
      
      const commands = JSON.parse(commandsJson);
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;

      // Build commands byte string
      let commandsBytes = '0x';
      const inputs: string[] = [];

      for (const cmd of commands) {
        const cmdCode = COMMANDS[cmd.type as keyof typeof COMMANDS];
        commandsBytes += cmdCode.toString(16).padStart(2, '0');
        inputs.push(cmd.input || '0x');
      }

      const tx = await client.execute(
        contracts.universalRouter,
        universalRouterAbi,
        'execute',
        [commandsBytes, inputs, deadlineTimestamp],
      );

      result = {
        transactionHash: tx.hash,
        commands: commandsBytes,
        inputsCount: inputs.length,
        deadline: deadlineTimestamp,
      };
      break;
    }

    case 'getCommands': {
      result = {
        commands: Object.entries(COMMANDS).map(([name, code]) => ({
          name,
          code: `0x${code.toString(16).padStart(2, '0')}`,
          decimal: code,
        })),
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: index });
  }

  return [{ json: result, pairedItem: { item: index } }];
}
