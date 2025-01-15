import { TonPoolStaker } from '@chorus-one/ton'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('TonPoolStaker', () => {
  it('should prioritize the pool that has not reached minStake', () => {
      const result = TonPoolStaker.selectPool(200n, [100n, 300n]);
      expect(result).to.equal(0); // Pool 1 needs to reach minStake
  })

  it('should prioritize the pool with a higher balance if both are below minStake', () => {
      const result = TonPoolStaker.selectPool(200n, [100n, 150n]);
      expect(result).to.equal(1); // Pool 2 has a higher balance
  })

  it('should balance the pools if both have reached minStake', () => {
      const result = TonPoolStaker.selectPool(200n, [400n, 300n]);
      expect(result).to.equal(1); // Pool 2 has a smaller balance
  })
})
