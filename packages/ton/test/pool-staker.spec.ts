import { TonPoolStaker } from '@chorus-one/ton'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('TonPoolStaker_selectPool', () => {
  it('should prioritize the pool that has not reached minStake', () => {
    const result = TonPoolStaker.selectPool(200n, [100n, 300n])
    expect(result).to.equal(0) // Pool 1 needs to reach minStake
  })

  it('should prioritize the pool with a higher balance if both are below minStake', () => {
    const result = TonPoolStaker.selectPool(200n, [100n, 150n])
    expect(result).to.equal(1) // Pool 2 has a higher balance
  })

  it('should balance the pools if both have reached minStake', () => {
    const result = TonPoolStaker.selectPool(200n, [400n, 300n])
    expect(result).to.equal(1) // Pool 2 has a smaller balance
  })
})

describe('TonPoolStaker_calculateUnstakePoolAmount', () => {
  const minStake = 10n

  it('should withdraw from the highest balance pool first', () => {
    const result = TonPoolStaker.calculateUnstakePoolAmount(5n, minStake, [15n, 20n], [10n, 10n])
    expect(result).to.deep.equal([0n, 5n])
  })

  it('should not split withdraw to two pools if not required', () => {
    const result = TonPoolStaker.calculateUnstakePoolAmount(10n, minStake, [20n, 20n], [10n, 10n])
    expect(result).to.deep.equal([10n, 0n])
  })

  it('should split withdraw to avoid pool deactivation', () => {
    const result = TonPoolStaker.calculateUnstakePoolAmount(10n, minStake, [15n, 15n], [10n, 10n])
    expect(result).to.deep.equal([5n, 5n])
  })

  it('should withdraw from multiple pools if needed', () => {
    const result = TonPoolStaker.calculateUnstakePoolAmount(15n, minStake, [20n, 20n], [10n, 10n])
    expect(result).to.deep.equal([10n, 5n])
  })

  it('should not withdraw if user stake is zero', () => {
    const result = TonPoolStaker.calculateUnstakePoolAmount(5n, minStake, [15n, 20n], [0n, 10n])
    expect(result).to.deep.equal([0n, 5n])
  })

  it('should handle exact balance matches', () => {
    const result = TonPoolStaker.calculateUnstakePoolAmount(10n, minStake, [20n, 20n], [10n, 5n])
    expect(result).to.deep.equal([10n, 0n])
  })

  it('should withdraw if one pool is empty', () => {
    let result = TonPoolStaker.calculateUnstakePoolAmount(5n, minStake, [0n, 20n], [0n, 5n])
    expect(result).to.deep.equal([0n, 5n])

    result = TonPoolStaker.calculateUnstakePoolAmount(5n, minStake, [20n, 10n], [5n, 0n])
    expect(result).to.deep.equal([5n, 0n])
  })

  it('should throw error if user wants to withdraw more than available', () => {
    expect(() => TonPoolStaker.calculateUnstakePoolAmount(21n, 10n, [20n, 20n], [10n, 10n])).to.throw(
      'requested withdrawal amount exceeds available user stakes'
    )
  })
})
