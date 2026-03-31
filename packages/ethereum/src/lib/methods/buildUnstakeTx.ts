import { Hex, encodeFunctionData } from 'viem'
import { StakewiseConnector } from '../connector'
import { keeperABI } from '../contracts/keeperAbi'
import { VaultABI } from '../contracts/vaultAbi'
import { Transaction } from '../types/transaction'
import { getHarvestParams } from '../utils/getHarvestParams'

export async function buildUnstakeTx(request: {
  connector: StakewiseConnector
  userAccount: Hex
  vault: Hex
  amount: bigint
}): Promise<Transaction> {
  const { userAccount, connector, vault, amount } = request

  const isCollateralized: boolean = await connector.eth.readContract({
    abi: keeperABI,
    address: connector.keeper,
    functionName: 'isCollateralized',
    args: [vault]
  })

  const shares: bigint = await connector.eth.readContract({
    abi: VaultABI,
    address: vault,
    functionName: 'convertToShares',
    args: [amount]
  })

  let tx: Hex

  if (isCollateralized) {
    // This branch of logic is invoked when the stake locked in vault
    // is collateralized in form of beacon chain validators
    const canHarvest = await connector.eth.readContract({
      abi: keeperABI,
      address: connector.keeper,
      functionName: 'canHarvest',
      args: [vault]
    })

    if (canHarvest) {
      const harvestParams = await getHarvestParams(connector, vault)

      const updateStateTx = encodeFunctionData({
        abi: VaultABI,
        functionName: 'updateState',
        args: [
          {
            proof: harvestParams.proof,
            rewardsRoot: harvestParams.rewardsRoot,
            reward: harvestParams.reward,
            unlockedMevReward: harvestParams.unlockedMevReward
          }
        ]
      })

      const enterExitQueueTx = encodeFunctionData({
        abi: VaultABI,
        functionName: 'enterExitQueue',
        args: [shares, userAccount]
      })

      tx = encodeFunctionData({
        abi: VaultABI,
        functionName: 'multicall',
        args: [[updateStateTx, enterExitQueueTx]]
      })
    } else {
      tx = encodeFunctionData({
        abi: VaultABI,
        functionName: 'enterExitQueue',
        args: [shares, userAccount]
      })
    }
  } else {
    // This branch of logic is invoked when the stake locked in vault
    // does not actually power any validators
    tx = encodeFunctionData({
      abi: VaultABI,
      functionName: 'redeem',
      args: [shares, userAccount]
    })
  }

  return {
    to: vault,
    data: tx
  }
}
