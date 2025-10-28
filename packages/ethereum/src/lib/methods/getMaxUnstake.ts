import { Hex, parseEther } from 'viem'
import { MintTokenControllerAbi } from '../contracts/mintCotrollerAbi'
import { StakewiseConnector } from '../connector'
import { getBaseData } from '../utils/getBaseData'
import { getStake } from './getStake'
import { getMint } from './getMint'

export const getMaxUnstake = async (params: {
  connector: StakewiseConnector
  userAccount: Hex
  vault: Hex
}): Promise<bigint> => {
  const { connector, vault, userAccount } = params
  const min = parseEther('0.00001')
  const { ltvPercent } = await getBaseData(connector, vault)
  const { assets } = await getStake({
    connector,
    userAccount,
    vaultAddress: vault
  })

  const { minted } = await getMint({
    connector,
    userAccount,
    vaultAddress: vault
  })
  if (ltvPercent <= 0 || assets < min) {
    return 0n
  }
  const avgRewardPerSecond = (await connector.eth.readContract({
    abi: MintTokenControllerAbi,
    functionName: 'avgRewardPerSecond',
    address: connector.mintTokenController
  })) as bigint
  const secondsInHour = 60n * 60n
  const gap = (avgRewardPerSecond * secondsInHour * minted.assets) / 1000000000000000000n
  const lockedAssets = ((minted.assets + gap) * 1000000000000000000n) / ltvPercent

  // Adjust for 0.01% margin, due to rounding errors blocking withdrawals
  const adjustedLockedAssets = (lockedAssets * 10001n) / 10000n

  const maxWithdrawAssets = assets - adjustedLockedAssets

  return maxWithdrawAssets > min ? maxWithdrawAssets : 0n
}
