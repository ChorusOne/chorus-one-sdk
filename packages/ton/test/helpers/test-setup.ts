import { TonPoolStaker } from '../../src/TonPoolStaker'
import { Address } from '@ton/ton'
import { TupleItem, TupleReader } from '@ton/core'
import { toNano } from '@ton/ton'
// @ts-expect-error: spy it's exported from chai
import { spy } from 'chai'

/**
 * Sets up a staker instance with mocked responses for testing
 */
export const setupStaker = ({
  poolStatusResponse,
  memberResponse,
  paramsResponse,
  electionMinStake = toNano('10000')
}: {
  poolStatusResponse: TupleItem[] | TupleReader
  memberResponse: TupleItem[] | TupleReader
  paramsResponse: TupleItem[] | TupleReader
  electionMinStake?: bigint
}) => {
  const staker = new TonPoolStaker({
    rpcUrl: 'https://ton.fake.website',
    addressDerivationConfig: {
      walletContractVersion: 4,
      workchain: 0,
      bounceable: false,
      testOnly: true,
      urlSafe: true,
      isBIP39: false
    }
  })

  spy.on(staker, ['getClient'], () => {
    return {
      provider: () => ({
        get: async (methodName: string): Promise<{ stack: TupleReader }> => {
          let stackMock: TupleItem[] | TupleReader

          switch (methodName) {
            case 'get_pool_status':
              stackMock = poolStatusResponse
              break
            default:
              throw new Error(`Unknown method: ${methodName}`)
          }

          return {
            stack: stackMock instanceof TupleReader ? stackMock : new TupleReader(stackMock)
          }
        }
      }),

      runMethod: async (_address: Address, methodName: string): Promise<{ stack: TupleReader }> => {
        let stackMock: TupleItem[] | TupleReader

        switch (methodName) {
          case 'get_member':
            stackMock = memberResponse
            break
          case 'get_params':
            stackMock = paramsResponse
            break
          default:
            throw new Error(`Unknown method: ${methodName}`)
        }

        return {
          stack: stackMock instanceof TupleReader ? stackMock : new TupleReader(stackMock)
        }
      }
    }
  })

  spy.on(staker, ['checkIfAddressTestnetFlagMatches'], () => {})
  spy.on(staker, ['getElectionMinStake'], async () => electionMinStake)

  return staker
}

/**
 * Extracts the payload data from transaction messages
 */
export const extractMessagePayload = (messages: any[]) => {
  return messages
    .filter((msg) => msg.payload instanceof Object)
    .map((msg) => {
      const slice = msg.payload.beginParse()
      return {
        methodId: slice.loadUint(32),
        queryId: slice.loadUint(64),
        gas: slice.loadCoins(),
        amount: slice.loadCoins()
      }
    })
}
