import { Hex } from 'viem'
import { assert } from 'chai'
import { EthereumStaker } from '../dist/mjs'
import { prepareTests } from './lib/utils'
import { disableHoodi } from './lib/disableHoodi'
import { restoreToInitialState } from './setup'

describe('EthereumStaker.getUnstakeQueue', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    // Use stale delegator address which unstaked 10(!) ETH, but didn't withdraw in 1.5 years.
    delegatorAddress = '0x4eaffedbf424cf2f9a23573300a2771d356b4115'
    validatorAddress = setup.validatorAddress
    staker = setup.staker
  })
  afterEach(async () => {
    // Restore to clean state after each test
    await restoreToInitialState()
  })

  it('returns the unstake queue', async function () {
    disableHoodi.bind(this)()

    const unstakeQueue = await staker.getUnstakeQueue({
      validatorAddress,
      delegatorAddress
    })

    assert.deepInclude(unstakeQueue, {
      positionTicket: '98633389235894282013',
      exitQueueIndex: '28',
      timestamp: 1716397043000,
      isWithdrawable: true,
      totalAmount: '10.028571579276028356',
      withdrawableAmount: '10.028571579276028356',
      withdrawalTimestamp: 0
    })
  })
})
