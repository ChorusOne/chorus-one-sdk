import { TonPoolStaker } from '@chorus-one/ton'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('TonPoolStaker', () => {
  it('should prioritize the pool that has not reached minStake', () => {
      const result = TonPoolStaker.selectPool(200n, 1000n, [100n, 300n]);
      expect(result).to.equal(0); // Pool 1 needs to reach minStake
  })

  it('should prioritize the pool with a smaller balance if both are below minStake', () => {
      const result = TonPoolStaker.selectPool(200n, 1000n, [100n, 150n]);
      expect(result).to.equal(0); // Pool 1 has a smaller balance
  })

  it('should balance the pools if both have reached minStake but are below maxStake', () => {
      const result = TonPoolStaker.selectPool(200n, 1000n, [400n, 300n]);
      expect(result).to.equal(1); // Pool 2 has a smaller balance
  })

  it('should add to the pool that has not reached maxStake', () => {
      const result = TonPoolStaker.selectPool(200n, 1000n, [1000n, 800n]);
      expect(result).to.equal(1); // Pool 2 has not reached maxStake
  })

  it('should throw an error if both pools have reached maxStake', () => {
      expect(() => TonPoolStaker.selectPool(200n, 1000n, [1000n, 1000n])).to.throw("Both pools have reached their maximum stake limits.");
  })
})
