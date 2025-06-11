import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'
import { disableHoodi } from './lib/disableHoodi'

describe('EthereumStaker.getRewards', () => {
  let validatorAddress: Hex
  let delegatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    // Use one of the first delegators to the MevMax Vault
    delegatorAddress = '0xA3FBae7A9834862A5853D39d850aBcBCE5a1AFdA'
    staker = setup.staker
  })

  it('returns correct rewards history for given period of time', async function () {
    disableHoodi.bind(this)()

    const rewards = await staker.getRewardsHistory({
      startTime: 1735689600000, // 2025-01-01
      endTime: 1736294400000, // 2025-01-08 - one week
      validatorAddress,
      delegatorAddress
    })

    // 7 days, end day is not included: [from, to)
    assert.equal(rewards.length, 7)

    assert.deepEqual(rewards, [
      {
        timestamp: 1735689600000,
        amount: '0.008753377787080096',
        totalRewards: '0.008753377787080096',
        dailyRewards: '0.000022443428921008'
      },
      {
        timestamp: 1735776000000,
        amount: '0.008774544232426604',
        totalRewards: '0.008774544232426604',
        dailyRewards: '0.000021166445346508'
      },
      {
        timestamp: 1735862400000,
        amount: '0.008792737294644708',
        totalRewards: '0.008792737294644708',
        dailyRewards: '0.000018193062218104'
      },
      {
        timestamp: 1735948800000,
        amount: '0.00880915741497382',
        totalRewards: '0.00880915741497382',
        dailyRewards: '0.000016420120329112'
      },
      {
        timestamp: 1736035200000,
        amount: '0.008826192471555911',
        totalRewards: '0.008826192471555911',
        dailyRewards: '0.000017035056582091'
      },
      {
        timestamp: 1736121600000,
        amount: '0.008848166217191916',
        totalRewards: '0.008848166217191916',
        dailyRewards: '0.000021973745636005'
      },
      {
        timestamp: 1736208000000,
        amount: '0.008866858175311622',
        totalRewards: '0.008866858175311622',
        dailyRewards: '0.000018691958119706'
      }
    ])
  })
})
