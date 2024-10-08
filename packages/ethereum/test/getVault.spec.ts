import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'

describe('EthereumStaker.getVault', () => {
  let validatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    staker = setup.staker
  })

  it('returns correct details and stake for Chorus mainnet wallet by default', async () => {
    const { vault } = await staker.getVault({
      validatorAddress
    })

    assert.equal(vault.name, 'Chorus One Test Wallet')
    assert.isTrue(Number(vault.tvl) > 1000 * 10 ** 18)
    assert.isTrue(vault.description === 'Test wallet for Chorus')
    assert.isTrue(/^https?:\/\/.*.png$/.test(vault.logoUrl))
  })
})
