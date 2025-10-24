import { HyperliquidStaker } from '../src/staker'
import { describe, it, beforeEach } from 'mocha'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe.only('HyperliquidStaker', () => {
  let staker: HyperliquidStaker
  const delegatorAddress = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'

  beforeEach(async () => {
    staker = new HyperliquidStaker({
      chain: 'Testnet'
    })

    await staker.init()
  })

  describe('Hyperliquid - read methods', () => {
    it('should return the delegator info', async () => {
      const summary = await staker.getStakingSummary({ delegatorAddress })
      expect(summary).to.have.property('delegated')
      expect(summary).to.have.property('undelegated')
      expect(summary).to.have.property('totalPendingWithdrawal')
      expect(summary).to.have.property('nPendingWithdrawals')
    })

    it('should fetch all delegations for a delegator', async () => {
      const delegations = await staker.getDelegations({ delegatorAddress })
      expect(delegations).to.be.an('array')
      delegations.forEach((delegation) => {
        expect(delegation).to.have.property('validator')
        expect(delegation).to.have.property('amount')
        expect(delegation).to.have.property('lockedUntilTimestamp')
      })
    })

    it('should fetch all rewards for a delegator', async () => {
      const rewards = await staker.getDelegatorRewards({ delegatorAddress })
      expect(rewards).to.be.an('array')
    })

    it('should fetch the delegator history', async () => {
      const history = await staker.getDelegatorHistory({ delegatorAddress })
      expect(history).to.be.an('array')
      history.forEach((event) => {
        expect(event).to.have.property('time')
        expect(event).to.have.property('hash')
        expect(event).to.have.property('delta')
      })
    })
  })
})
