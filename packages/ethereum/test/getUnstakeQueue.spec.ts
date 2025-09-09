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
    // Use stale delegator address which never unstaked
    delegatorAddress = '0x9685b00aa0db8eccc1684c1155b826169ce48d3d'
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

    assert.deepEqual(unstakeQueue, [
      {
        exitQueueIndex: '25',
        positionTicket: '98310168873892613271',
        timestamp: 1712647703000,
        isWithdrawable: true,
        totalAmount: '0.100003157585081498',
        withdrawableAmount: '0.100003157585081498',
        withdrawalTimestamp: 0
      }
    ])
  })
})
