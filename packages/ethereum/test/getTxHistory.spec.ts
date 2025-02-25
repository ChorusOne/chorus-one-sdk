import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'

describe('EthereumStaker.getTxHistory', () => {
  let validatorAddress: Hex
  let delegatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    delegatorAddress = '0x2dF83a340D5067751e8045cCe90764B19D9e7A4D'
    staker = setup.staker
  })

  it('returns correct transaction history for given period of time', async () => {
    const txHistory = await staker.getTxHistory({
      validatorAddress,
      delegatorAddress
    })

    const expectedTx = {
      timestamp: 1705042416000,
      type: 'Deposited',
      amount: '0.01',
      txHash: '0xd2d3c10b5e4dde53afe9cede8d10a961c357f574324599e9d78467f6c811afcf'
    }

    const tx = txHistory.find((tx) => tx.txHash === expectedTx.txHash)

    assert.deepEqual(tx, expectedTx)
  })
})
