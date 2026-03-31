import { Hex } from 'viem'
import { assert } from 'chai'
import { EthereumStaker } from '@chorus-one/ethereum'
import { prepareTests } from './lib/utils'
import { disableHoodi } from './lib/disableHoodi'
import { restoreToInitialState } from './setup'

describe('EthereumStaker.buildWithdrawTx', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    // Use stale delegator address which unstaked 10 ETH and has a withdrawable position.
    delegatorAddress = '0x4eaffedbf424cf2f9a23573300a2771d356b4115'
    validatorAddress = setup.validatorAddress
    staker = setup.staker
  })
  afterEach(async () => {
    await restoreToInitialState()
  })

  it('builds a withdraw tx using isClaimed filter internally', async function () {
    disableHoodi.bind(this)()

    // buildWithdrawTx calls getUnstakeQueue with isClaimed: false internally,
    // ensuring it only fetches unclaimed exit requests from the subgraph.
    const { tx } = await staker.buildWithdrawTx({
      delegatorAddress,
      validatorAddress
    })

    assert.isNotEmpty(tx.data)
    assert.equal(tx.to.toLowerCase(), validatorAddress.toLowerCase())
  })

  it('builds a withdraw tx for a specific position ticket', async function () {
    disableHoodi.bind(this)()

    const { tx } = await staker.buildWithdrawTx({
      delegatorAddress,
      validatorAddress,
      positionTickets: ['98633389235894282013']
    })

    assert.isNotEmpty(tx.data)
    assert.equal(tx.to.toLowerCase(), validatorAddress.toLowerCase())
  })
})
