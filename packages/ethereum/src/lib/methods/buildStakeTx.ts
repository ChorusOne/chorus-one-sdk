import { Hex, encodeFunctionData, zeroAddress } from 'viem'
import { VaultABI } from '../contracts/vaultAbi'
import { StakewiseConnector } from '../connector'
import { keeperABI } from '../contracts/keeperAbi'
import { getHarvestParams } from '../utils/getHarvestParams'
import { Transaction } from '../types/transaction'

export async function buildStakeTx(request: {
  connector: StakewiseConnector
  userAccount: Hex
  vault: Hex
  amount: bigint
  referrer?: Hex
}): Promise<Transaction> {
  const { userAccount, connector, vault, amount, referrer = zeroAddress } = request
  const canHarvest = await connector.eth.readContract({
    abi: keeperABI,
    address: connector.keeper,
    functionName: 'canHarvest',
    args: [vault]
  })

  let tx: Hex

  const harvestParams = await getHarvestParams(connector, vault)

  if (canHarvest) {
    tx = encodeFunctionData({
      abi: VaultABI,
      functionName: 'updateStateAndDeposit',
      args: [
        userAccount,
        referrer,
        {
          proof: harvestParams.proof,
          rewardsRoot: harvestParams.rewardsRoot,
          reward: harvestParams.reward,
          unlockedMevReward: harvestParams.unlockedMevReward
        }
      ]
    })
  } else {
    tx = encodeFunctionData({
      abi: VaultABI,
      functionName: 'deposit',
      args: [userAccount, referrer]
    })
  }

  return {
    to: vault,
    data: tx,
    value: amount
  }
}
