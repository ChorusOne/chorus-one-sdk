import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'
import { disableHoodi } from './lib/disableHoodi'
import { restoreToInitialState } from './setup'

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
  afterEach(async () => {
    // Restore to clean state after each test
    await restoreToInitialState()
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
        amount: '0.008782461427329766',
        totalRewards: '0.008782461427329766',
        dailyRewards: '0.000022505390841316'
      },
      {
        timestamp: 1735776000000,
        amount: '0.008803770251106602',
        totalRewards: '0.008803770251106602',
        dailyRewards: '0.000021308823776836'
      },
      {
        timestamp: 1735862400000,
        amount: '0.008822067114814422',
        totalRewards: '0.008822067114814422',
        dailyRewards: '0.00001829686370782'
      },
      {
        timestamp: 1735948800000,
        amount: '0.008838598634788673',
        totalRewards: '0.008838598634788673',
        dailyRewards: '0.000016531519974251'
      },
      {
        timestamp: 1736035200000,
        amount: '0.008855742609842669',
        totalRewards: '0.008855742609842669',
        dailyRewards: '0.000017143975053996'
      },
      {
        timestamp: 1736121600000,
        amount: '0.008877831302012103',
        totalRewards: '0.008877831302012103',
        dailyRewards: '0.000022088692169434'
      },
      {
        timestamp: 1736208000000,
        amount: '0.008896646668920832',
        totalRewards: '0.008896646668920832',
        dailyRewards: '0.000018815366908729'
      }
    ])
  })

  it('throws error when time range exceeds 1000 days', async function () {
    disableHoodi.bind(this)()

    const startTime = 1640995200000 // 2022-01-01
    const endTime = startTime + 1001 * 24 * 60 * 60 * 1000 // 1001 days later

    try {
      await staker.getRewardsHistory({
        startTime,
        endTime,
        validatorAddress,
        delegatorAddress
      })
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.equal(error.message, 'Time range cannot exceed 1000 days')
    }
  })
})
