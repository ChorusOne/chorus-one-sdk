import { Hex } from 'viem'
import { assert } from 'chai'
import { EthereumStaker } from '../dist/mjs'
import { prepareTests } from './lib/utils'

describe('EthereumStaker.getUnstakeQueue', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    // Use stale delegator address which never unstaked
    delegatorAddress = '0x15e4287B086f0a8556A5B578a8d8284F19F2c9aC'
    validatorAddress = setup.validatorAddress
    staker = setup.staker
  })

  it('should return the unstake queue', async () => {
    const unstakeQueue = await staker.getUnstakeQueue({
      validatorAddress,
      delegatorAddress
    })

    assert.deepEqual(unstakeQueue, [
      {
        exitQueueIndex: '47',
        positionTicket: '112811942030831899448',
        timestamp: 1711727436000,
        isWithdrawable: true,
        totalAmount: '0.500019229644855834',
        withdrawableAmount: '0'
      }
    ])
  })
})
