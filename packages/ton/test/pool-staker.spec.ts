import { TonPoolStaker } from '@chorus-one/ton'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('TonPoolStaker_calculateUnstakePoolAmount', () => {
  const fn = TonPoolStaker.calculateUnstakePoolAmount;
  const minStake = 10n

  it('should withdraw from the highest balance pool first', () => {
    const result = fn(5n, minStake, [15n, 20n], [10n, 10n])
    expect(result).to.deep.equal([0n, 5n])
  })

  it('should not split withdraw to two pools if not required', () => {
    const result = fn(10n, minStake, [20n, 20n], [10n, 10n])
    expect(result).to.deep.equal([10n, 0n])
  })

  it('should split withdraw to avoid pool deactivation', () => {
    const result = fn(10n, minStake, [15n, 15n], [10n, 10n])
    expect(result).to.deep.equal([5n, 5n])
  })

  it('should withdraw from multiple pools if needed', () => {
    const result = fn(15n, minStake, [20n, 20n], [10n, 10n])
    expect(result).to.deep.equal([10n, 5n])
  })

  it('should not withdraw if user stake is zero', () => {
    const result = fn(5n, minStake, [15n, 20n], [0n, 10n])
    expect(result).to.deep.equal([0n, 5n])
  })

  it('should handle exact balance matches', () => {
    const result = fn(10n, minStake, [20n, 20n], [10n, 5n])
    expect(result).to.deep.equal([10n, 0n])
  })

  it('should withdraw if one pool is empty', () => {
    let result = fn(5n, minStake, [0n, 20n], [0n, 5n])
    expect(result).to.deep.equal([0n, 5n])

    result = fn(5n, minStake, [20n, 10n], [5n, 0n])
    expect(result).to.deep.equal([5n, 0n])
  })

  it('should throw error if user wants to withdraw more than available', () => {
    expect(() => fn(21n, 10n, [20n, 20n], [10n, 10n])).to.throw(
      'requested withdrawal amount exceeds available user stakes'
    )
  })
});

describe('TonPoolStaker_calculateStakeAmount', () => {
    const fn = TonPoolStaker.calculateStakePoolAmount;

    it('should split equally when both pools are above minStake and user stake is balanced', () => {
      const result = fn(1000n, 500n, [1000n, 1000n], [500n, 500n]);
      expect(result).to.eql([500n, 500n]);
    });

    it('should top up pool1 to minStake and split remainder', () => {
      const result = fn(1000n, 1000n, [500n, 1500n], [0n, 0n]);
      // 500 to pool1, remaining 500 split -> 250 to each
      expect(result).to.eql([750n, 250n]);
    });

    it('should top up pool2 to minStake and split remainder', () => {
      const result = fn(1000n, 1000n, [1500n, 500n], [0n, 0n]);
      expect(result).to.eql([250n, 750n]);
    });

    it('should fill pool1 to minStake and send rest to pool2 if both below minStake', () => {
      const result = fn(1500n, 1000n, [400n, 400n], [0n, 0n]);
      // 600 to pool1 to hit minStake, 900 to pool2
      expect(result).to.eql([600n, 900n]);
    });

    it('should assign all to pool1 if both pools below minStake and amount is too small', () => {
      const result = fn(300n, 1000n, [500n, 500n], [0n, 0n]);
      expect(result).to.eql([300n, 0n]);
    });

    it('should fallback to even split when unsure (e.g., both pools at min and no user balance)', () => {
      const result = fn(1000n, 1000n, [1000n, 1000n], [0n, 0n]);
      expect(result).to.eql([500n, 500n]);
    });

    it('should balance based on the user stake when both pools are above minStake', () => {
      const result = fn(500n, 1000n, [1000n, 1000n], [200n, 300n]);
      expect(result).to.eql([300n, 200n]);
    });
})
