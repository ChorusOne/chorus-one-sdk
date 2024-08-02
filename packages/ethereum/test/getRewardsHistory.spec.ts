import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'

describe('EthereumStaker.getRewards', () => {
  let validatorAddress: Hex
  let delegatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    validatorAddress = setup.validatorAddress
    delegatorAddress = '0x2dF83a340D5067751e8045cCe90764B19D9e7A4D'
    staker = setup.staker
  })

  it('returns correct rewards history for given period of time for Chorus mainnet stakers', async () => {
    const rewards = await staker.getRewardsHistory({
      startTime: new Date('2024-02-01').getTime(),
      endTime: new Date('2024-03-01').getTime(),
      validatorAddress,
      delegatorAddress
    })

    assert.deepEqual(rewards, [
      { timestamp: 1706745600000, amount: '0.000024786824502065' },
      { timestamp: 1706832000000, amount: '0.000044119038630881' },
      { timestamp: 1706918400000, amount: '0.000062876329371494' },
      { timestamp: 1707004800000, amount: '0.00008190429845996' },
      { timestamp: 1707091200000, amount: '0.0001097109140602' },
      { timestamp: 1707177600000, amount: '0.000153434503075382' },
      { timestamp: 1707264000000, amount: '0.000146997696335134' },
      { timestamp: 1707350400000, amount: '0.000146832073871066' },
      { timestamp: 1707436800000, amount: '0.000146482684232609' },
      { timestamp: 1707523200000, amount: '0.000146408328074781' },
      { timestamp: 1707609600000, amount: '0.000146334140031532' },
      { timestamp: 1707696000000, amount: '0.000146312956091355' },
      { timestamp: 1707782400000, amount: '0.00014640161118171' },
      { timestamp: 1707868800000, amount: '0.000146491769380892' },
      { timestamp: 1707955200000, amount: '0.000146580473685824' },
      { timestamp: 1708041600000, amount: '0.000146669140376886' },
      { timestamp: 1708128000000, amount: '0.000146755869058696' },
      { timestamp: 1708214400000, amount: '0.000146842138530308' },
      { timestamp: 1708300800000, amount: '0.000146883811424052' },
      { timestamp: 1708387200000, amount: '0.000146968064066342' },
      { timestamp: 1708473600000, amount: '0.000147054516896928' },
      { timestamp: 1708560000000, amount: '0.000147133777127185' },
      { timestamp: 1708646400000, amount: '0.000147208399117727' },
      { timestamp: 1708732800000, amount: '0.000147289422275367' },
      { timestamp: 1708819200000, amount: '0.000147352436930246' },
      { timestamp: 1708905600000, amount: '0.000147420173096827' },
      { timestamp: 1708992000000, amount: '0.000147500180062545' },
      { timestamp: 1709078400000, amount: '0.000147585418073838' },
      { timestamp: 1709164800000, amount: '0.000147671364763405' },
      { timestamp: 1709251200000, amount: '0.000148768196229641' }
    ])
  })
})
