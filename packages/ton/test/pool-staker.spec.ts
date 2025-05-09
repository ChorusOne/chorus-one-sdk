import { toNano } from '@ton/ton'
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
  const fn = TonPoolStaker.calculateUnstakePoolAmount
  const minStake = 10n

  it('should withdraw from the highest balance pool first', () => {
    const result = fn(5n, minStake, [15n, 20n], [10n, 10n], [0n, 0n])
    expect(result).to.deep.equal([0n, 5n])
  })

  it('should not split withdraw to two pools if not required', () => {
    const result = fn(10n, minStake, [20n, 20n], [10n, 10n], [0n, 0n])
    expect(result).to.deep.equal([10n, 0n])
  })

  it('should split withdraw to avoid pool deactivation', () => {
    const result = fn(10n, minStake, [15n, 15n], [10n, 10n], [0n, 0n])
    expect(result).to.deep.equal([5n, 5n])
  })

  it('should withdraw from multiple pools if needed', () => {
    const result = fn(15n, minStake, [20n, 20n], [10n, 10n], [0n, 0n])
    expect(result).to.deep.equal([10n, 5n])
  })

  it('should not withdraw if user stake is zero', () => {
    const result = fn(5n, minStake, [15n, 20n], [0n, 10n], [0n, 0n])
    expect(result).to.deep.equal([0n, 5n])
  })

  it('should handle exact balance matches', () => {
    const result = fn(10n, minStake, [20n, 20n], [10n, 5n], [0n, 0n])
    expect(result).to.deep.equal([10n, 0n])
  })

  it('should withdraw if one pool is empty', () => {
    let result = fn(5n, minStake, [0n, 20n], [0n, 5n], [0n, 0n])
    expect(result).to.deep.equal([0n, 5n])

    result = fn(5n, minStake, [20n, 10n], [5n, 0n], [0n, 0n])
    expect(result).to.deep.equal([5n, 0n])
  })

  it('should throw error if user wants to withdraw more than available', () => {
    expect(() => fn(21n, 10n, [20n, 20n], [10n, 10n], [0n, 0n])).to.throw(
      'requested withdrawal amount exceeds available user stakes'
    )
  })
})

describe('TonPoolStaker_calculateStakeAmount', () => {
  const fn = TonPoolStaker.calculateStakePoolAmount
  const minPoolStakes = [1n, 1n] as [bigint, bigint]

  it('should equalize the pool stake if both pools are above min', () => {
    // strategy: both pools are above minStake, so our goal is to optimize the
    // balance for the pool stake
    const result = fn(1000n, 200n, [250n, 200n], minPoolStakes)
    expect(result).to.eql([475n, 525n])

    // if pool balances are equal, split the stake evenly
    // the lower balance
    const result_tw = fn(
      toNano(5), // to stake
      toNano(5), // minmum for election
      [toNano(10), toNano(10)], // current pool balances
      [toNano(1), toNano(1)] // minPoolStakes
    )
    expect(result_tw).to.eql([toNano(2.5), toNano(2.5)])

    // if there is no chance to equalize the stakes, stake to the pool with
    // the lower balance
    const result_two = fn(
      toNano(3), // to stake
      toNano(5), // minmum for election
      [toNano(5), toNano(10)], // current pool balances
      [toNano(1), toNano(1)] // minPoolStakes
    )
    expect(result_two).to.eql([toNano(3), toNano(0)])

    // if the amount is enough to balance the stakes do it
    const result_three = fn(
      toNano(5), // to stake
      toNano(5), // minmum for election
      [toNano(5), toNano(10)], // current pool balances
      [toNano(1), toNano(1)] // minPoolStakes
    )
    expect(result_three).to.eql([toNano(5), toNano(0)])

    // if the remainder ( 6 - (6 - 1) = 1 ) divided evenlty (0.5) is not meeting
    // the minimum stake, try to fill up the pool with the lower balance and
    // push the whole remainder to the other pool
    const result_four = fn(
      toNano(6), // to stake
      toNano(5), // minmum for election
      [toNano(5), toNano(10)], // current pool balances
      [toNano(1), toNano(1)] // minPoolStakes
    )
    expect(result_four).to.eql([toNano(5), toNano(1)])

    // it's not possible to blance the stakes and keep the minimum stake
    // so resign from blancing the pool stake and simply split the
    // amount between the pools
    const result_five = fn(
      toNano(2.4), // to stake
      toNano(1.2), // minmum for election
      [toNano(1.871), toNano(1.7348)], // current pool balances
      [toNano(1.2), toNano(1.2)] // minPoolStakes
    )
    expect(result_five).to.eql([toNano(1.2), toNano(1.2)])

    // if the remainder as a whole is not meeting the minimum stake, stake it
    // with the lowest stake pool
    const result_six = fn(
      toNano(5.5), // to stake
      toNano(5), // minmum for election
      [toNano(5), toNano(10)], // current pool balances
      [toNano(1), toNano(1)] // minPoolStakes
    )
    expect(result_six).to.eql([toNano(5.5), toNano(0)])
  })

  it('should distribute stake if only one pool is below minimum', () => {
    // activate pool two with 500 and the remainer (500) split between two pools
    const result = fn(1000n, 1000n, [1500n, 500n], minPoolStakes)
    expect(result).to.eql([250n, 750n])

    const result_two = fn(1000n, 1000n, [500n, 1500n], minPoolStakes)
    expect(result_two).to.eql([750n, 250n])

    // ^^ at edge
    const result_three = fn(500n, 1000n, [500n, 1500n], minPoolStakes)
    expect(result_three).to.eql([500n, 0n])

    // if there is not enough to activate pool two, split stakes between
    // active/inactive pool
    //
    // strategy: user stake can't activae the pool two, so staking all to pool
    // two doesn't earn any rewards. Instead, split the stake between two pools
    // so that the other staker has a chance to bring pool one in the next
    // staking action but at the same time user can still earn reawards from the
    // active pool (half of his stake)
    const result_four = fn(300n, 1000n, [500n, 1500n], minPoolStakes)
    expect(result_four).to.eql([150n, 150n])

    const result_five = fn(300n, 1000n, [1500n, 500n], minPoolStakes)
    expect(result_five).to.eql([150n, 150n])
  })

  it('should distribute stake if both pools are below minimum', () => {
    // there is no chance to make both pools active, fill the one with
    // highest stake
    const result = fn(150n, 1000n, [300n, 400n], minPoolStakes)
    expect(result).to.eql([0n, 150n])

    // ^^ same case as but reversed pool stakes
    const result_reverse = fn(150n, 1000n, [400n, 300n], minPoolStakes)
    expect(result_reverse).to.eql([150n, 0n])

    // there is a chance to make second pool active
    //
    // strategy: user stake was used to activate one pool, the remainder can
    // either be staked with the second pool or split in between activa/inactive
    // pool. In the first case user doesn't earn anything on inactive pool so in
    // below case that would 4150 (our of 10150) earning no rewards. In the
    // second case only 2075 doesn't earn rewards, but at least the portion of
    // it contributes to the inactive pool being elected with next staker
    const result_two = fn(10150n, 10000n, [3000n, 4000n], minPoolStakes)
    expect(result_two).to.eql([2075n, 8075n])

    // there is a chance to make second pool active
    // strategy: as above ^^ but reversed the pools
    const result_three = fn(650n, 1000n, [400n, 300n], minPoolStakes)
    expect(result_three).to.eql([625n, 25n])

    // there is a chance to make both pools active, split the stake
    // strategy: fill both pools to the minStake and split the rest. This way
    // user stake will benefit from both pools (as both pools have been just
    // activated with his stake)
    const result_four = fn(13150n, 10000n, [3000n, 4000n], minPoolStakes)
    expect(result_four).to.eql([7075n, 6075n])
  })
})
