import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'
import { disableHoodi } from './lib/disableHoodi'
import { restoreToInitialState } from './setup'

describe('EthereumStaker.getVault', () => {
  let validatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    staker = setup.staker
  })
  afterEach(async () => {
    // Restore to clean state after each test
    await restoreToInitialState()
  })

  it('returns vault details', async function () {
    disableHoodi.bind(this)()

    const { vault } = await staker.getVault({
      validatorAddress
    })

    assert.equal(vault.name, 'Chorus One Max Vault')
    assert.isTrue(Number(vault.tvl) > 1000 * 10 ** 18)
    assert.isTrue(
      vault.description ===
        'Chorus One’s ground-breaking MEV research ensures the highest yields with top-tier security and enterprise-level infrastructure. Start staking ETH today.'
    )
    assert.isTrue(/^https?:\/\/.*.png$/.test(vault.logoUrl))
  })
})
