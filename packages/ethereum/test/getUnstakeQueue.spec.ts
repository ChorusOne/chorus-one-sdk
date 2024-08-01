import { Hex, PublicClient, WalletClient, decodeEventLog, formatEther, parseEther } from 'viem'
import { assert } from 'chai'
import { EthereumStaker } from '../dist/mjs'
import { prepareTests, stake } from './lib/utils'
import { VaultABI } from '../src/lib/contracts/vaultAbi'
const amountToStake = parseEther('5')
const amountToUnstake = parseEther('1')

const originalFetch = global.fetch

// https://github.com/tc39/proposal-promise-with-resolvers/blob/main/polyfills.js
const withResolvers = <V = unknown, Err = unknown>() => {
  const out: {
    resolve: (value: V) => void
    reject: (reason: Err) => void
    promise: Promise<V>
  } = {
    resolve: () => {},
    reject: () => {},
    promise: Promise.resolve() as Promise<V>
  }

  out.promise = new Promise<V>((resolve, reject) => {
    out.resolve = resolve
    out.reject = reject
  })

  return out
}

type VaultEvent = ReturnType<typeof decodeEventLog<typeof VaultABI, 'ExitQueueEntered'>>

describe('EthereumStaker.getUnstakeQueue', () => {
  let delegatorAddress: Hex
  let validatorAddress: Hex
  let walletClient: WalletClient
  let publicClient: PublicClient
  let staker: EthereumStaker
  let unwatch: () => void = () => {}

  const unstake = async (amount: string) => {
    const { tx } = await staker.buildUnstakeTx({
      delegatorAddress,
      validatorAddress,
      amount
    })

    const request = await walletClient.prepareTransactionRequest({
      ...tx,
      chain: undefined
    })
    const hash = await walletClient.sendTransaction({
      ...request,
      account: delegatorAddress
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    assert.equal(receipt.status, 'success')
  }

  beforeEach(async () => {
    const setup = await prepareTests()

    delegatorAddress = setup.walletClient.account.address
    validatorAddress = setup.validatorAddress
    publicClient = setup.publicClient
    walletClient = setup.walletClient
    staker = setup.staker

    await stake({
      delegatorAddress,
      validatorAddress,
      amountToStake,
      publicClient,
      walletClient,
      staker
    })
  })

  afterEach(() => {
    unwatch()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = originalFetch
  })

  it('should return the unstake queue', async () => {
    // Subscribe to the ExitQueueEntered events
    const { resolve: eventsResolve, promise: eventsPromise } = withResolvers<VaultEvent[]>()
    const passedEvents: VaultEvent[] = []

    unwatch = publicClient.watchEvent({
      onLogs: (logs) => {
        const nextEvents = logs
          .map((l) =>
            decodeEventLog({
              abi: VaultABI,
              data: l.data,
              topics: l.topics
            })
          )
          .filter((e): e is VaultEvent => e.eventName === 'ExitQueueEntered')
        passedEvents.push(...nextEvents)
        if (passedEvents.length === 2) {
          eventsResolve(passedEvents.sort((a, b) => Number(a.args.shares) - Number(b.args.shares)))
        }
      }
    })

    // Unstake

    await unstake(formatEther(amountToUnstake))
    await unstake('2')

    // Wait for the events to be processed

    const events = await eventsPromise

    assert.strictEqual(events.length, 2)
    // The shares are not exactly the same as the amount to unstake
    assert.closeTo(Number(events[0].args.shares), Number(parseEther('1')), Number(parseEther('0.1')))
    assert.isTrue(typeof events[0].args.positionTicket === 'bigint')

    // mock the request to Stakewise with positionTicket and totalShares from the events

    const day = 24 * 60 * 60
    const mockExitRequests = [
      {
        positionTicket: events[0].args.positionTicket.toString(),
        totalShares: events[0].args.shares.toString(),
        // earlier
        timestamp: Math.round((new Date().getTime() - 60000) / 1000 - day * 2).toString()
      },
      {
        positionTicket: events[1].args.positionTicket.toString(),
        totalShares: events[1].args.shares.toString(),
        // later
        timestamp: Math.round(new Date().getTime() / 1000 - day * 2).toString()
      }
    ]

    const mockFetch = (input, init) => {
      if (input === 'https://holesky-graph.stakewise.io/subgraphs/name/stakewise/stakewise?opName=exitQueue') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                exitRequests: mockExitRequests
              }
            })
        })
      } else {
        return originalFetch(input, init) // Fallback to the original fetch for other URLs
      }
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = mockFetch

    const unstakeQueue = await staker.getUnstakeQueue({
      validatorAddress,
      delegatorAddress
    })

    assert.strictEqual(unstakeQueue.length, 2)
    // The queue is sorted by the timestamp from latest to earliest
    const earlierItem = unstakeQueue[1]
    const earlierMock = mockExitRequests[0]

    assert.equal(earlierItem.timestamp, new Date(Number(earlierMock.timestamp) * 1000).getTime())
    // Take into account 1 wei assets conversion issues on the contract
    assert.closeTo(Number(parseEther(earlierItem.totalAmount)), Number(amountToUnstake), 1)

    assert.isFalse(earlierItem.isWithdrawable)
  })
})
