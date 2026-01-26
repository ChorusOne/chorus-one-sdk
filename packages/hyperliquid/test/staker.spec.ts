import { HyperliquidStaker, RequestQueue } from '../src/staker'
import { describe, it, beforeEach } from 'mocha'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('HyperliquidStaker', () => {
  let staker: HyperliquidStaker
  const delegatorAddress = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'

  beforeEach(async () => {
    staker = new HyperliquidStaker({
      chain: 'Testnet'
    })
  })

  describe('Read methods - info endpoint', () => {
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

  describe('Nonce management', () => {
    const validatorAddress = '0x172054cfc01b32effe0bf6af7a15b36e1ad730b3'
    const amount = '0.00001' // Amount in HYPE

    it('should generate unique nonces for rapid sequential buildStakeTx calls', async () => {
      const nonces: number[] = []

      for (let i = 0; i < 100; i++) {
        const { tx } = await staker.buildStakeTx({ validatorAddress, amount })
        nonces.push(tx.action.nonce)
      }

      const uniqueNonces = new Set(nonces)
      expect(uniqueNonces.size).to.equal(100, 'All nonces should be unique')

      for (let i = 1; i < nonces.length; i++) {
        expect(nonces[i]).to.be.greaterThan(nonces[i - 1], `Nonce at index ${i} should be greater than previous`)
      }
    })

    it('should generate unique nonces across different transaction types', async () => {
      const nonces: number[] = []

      for (let i = 0; i < 30; i++) {
        const stakeTx = await staker.buildStakeTx({ validatorAddress, amount })
        nonces.push(stakeTx.tx.action.nonce)

        const unstakeTx = await staker.buildUnstakeTx({ validatorAddress, amount })
        nonces.push(unstakeTx.tx.action.nonce)

        const spotToStakingTx = await staker.buildSpotToStakingTx({ amount })
        nonces.push(spotToStakingTx.tx.action.nonce)

        const withdrawTx = await staker.buildWithdrawFromStakingTx({ amount })
        nonces.push(withdrawTx.tx.action.nonce)
      }

      expect(new Set(nonces).size).to.equal(120)
      for (let i = 1; i < nonces.length; i++) {
        expect(nonces[i]).to.be.greaterThan(nonces[i - 1])
      }
    })
  })

  describe('RequestQueue', () => {
    it('should execute functions in FIFO order', async () => {
      const queue = new RequestQueue()
      const order: number[] = []

      const promises = [
        queue.enqueue(async () => {
          await delay(30)
          order.push(1)
          return 1
        }),
        queue.enqueue(async () => {
          await delay(10)
          order.push(2)
          return 2
        }),
        queue.enqueue(async () => {
          await delay(20)
          order.push(3)
          return 3
        })
      ]

      await Promise.all(promises)
      expect(order).to.deep.equal([1, 2, 3])
    })

    it('should not block subsequent operations when an error occurs', async () => {
      const queue = new RequestQueue()
      const results: string[] = []

      const p1 = queue.enqueue(async () => {
        results.push('success1')
        return 'ok'
      })
      const p2 = queue.enqueue(async () => {
        throw new Error('fail')
      })
      const p3 = queue.enqueue(async () => {
        results.push('success2')
        return 'ok'
      })

      await expect(p2).to.be.rejectedWith('fail')
      await p1
      await p3

      expect(results).to.deep.equal(['success1', 'success2'])
    })
  })
})
