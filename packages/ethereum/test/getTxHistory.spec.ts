import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'
import { disableHoodi } from './lib/disableHoodi'
import { restoreToInitialState } from './setup'

describe('EthereumStaker.getTxHistory', () => {
  let validatorAddress: Hex
  let delegatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    delegatorAddress = '0x25B8ed65839b411Ce1afA8D75925958bD27cD5d0'
    staker = setup.staker
  })
  afterEach(async () => {
    // Restore to clean state after each test
    await restoreToInitialState()
  })

  it('returns correct transaction history for given period of time', async function () {
    disableHoodi.bind(this)()

    const txHistory = await staker.getTxHistory({
      validatorAddress,
      delegatorAddress
    })

    const expectedTx = {
      timestamp: 1741662167000,
      type: 'Deposited',
      amount: '0.457878161232164171',
      txHash: '0x6f2d4c8499367d417616368988fff37c064d6adb15857076f2519eff55ad3e44'
    }

    const tx = txHistory.find((tx) => tx.txHash === expectedTx.txHash)

    assert.deepEqual(tx, expectedTx)
  })
})
