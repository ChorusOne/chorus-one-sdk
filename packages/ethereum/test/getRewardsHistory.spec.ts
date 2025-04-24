import { EthereumStaker } from '@chorus-one/ethereum'
import { assert } from 'chai'
import { Hex } from 'viem'
import { prepareTests } from './lib/utils'
import { itWrapped } from './lib/itWrapped'

describe('EthereumStaker.getRewards', () => {
  let validatorAddress: Hex
  let delegatorAddress: Hex
  let staker: EthereumStaker

  beforeEach(async () => {
    const setup = await prepareTests()
    // Use Stakewise Pool for testing, it has more interesting data on rewards
    validatorAddress = '0xac0f906e433d58fa868f936e8a43230473652885'
    // Use one of the first delegators to the Stakewise Pool
    delegatorAddress = '0x387a4700117D6fe815d71146db984880EC423884'
    staker = setup.staker
  })

  itWrapped({ disableNetworks: ['hoodi'] }, 'returns correct rewards history for given period of time', async () => {
    const rewards = await staker.getRewardsHistory({
      startTime: 1735689600000, // 2025-01-01
      endTime: 1738368000000, // 2025-02-01
      validatorAddress,
      delegatorAddress
    })

    assert.deepEqual(rewards, [
      {
        timestamp: 1735689600000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1735776000000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1735862400000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1735948800000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1736035200000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1736121600000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1736208000000,
        amount: '0.000000000000000001',
        totalRewards: '0.000000000000000001',
        dailyRewards: '0'
      },
      {
        timestamp: 1736294400000,
        amount: '4.500180294719893715',
        totalRewards: '4.500180294719893715',
        dailyRewards: '0.000180294719893714'
      },
      {
        timestamp: 1736380800000,
        amount: '4.500343838739714004',
        totalRewards: '4.500343838739714004',
        dailyRewards: '0.000163544019820289'
      },
      {
        timestamp: 1736467200000,
        amount: '4.500724597414951508',
        totalRewards: '4.500724597414951508',
        dailyRewards: '0.000380758675237504'
      },
      {
        timestamp: 1736553600000,
        amount: '4.501051734402490899',
        totalRewards: '4.501051734402490899',
        dailyRewards: '0.000327136987539391'
      },
      {
        timestamp: 1736640000000,
        amount: '4.501408897854618204',
        totalRewards: '4.501408897854618204',
        dailyRewards: '0.000357163452127305'
      },
      {
        timestamp: 1736726400000,
        amount: '4.501755244384521194',
        totalRewards: '4.501755244384521194',
        dailyRewards: '0.00034634652990299'
      },
      {
        timestamp: 1736812800000,
        amount: '4.502104714425675114',
        totalRewards: '4.502104714425675114',
        dailyRewards: '0.00034947004115392'
      },
      {
        timestamp: 1736899200000,
        amount: '4.502478354511437552',
        totalRewards: '4.502478354511437552',
        dailyRewards: '0.000373640085762438'
      },
      {
        timestamp: 1736985600000,
        amount: '4.502824687684210262',
        totalRewards: '4.502824687684210262',
        dailyRewards: '0.00034633317277271'
      },
      {
        timestamp: 1737072000000,
        amount: '4.503175621268643342',
        totalRewards: '4.503175621268643342',
        dailyRewards: '0.00035093358443308'
      },
      {
        timestamp: 1737158400000,
        amount: '4.503541935799732674',
        totalRewards: '4.503541935799732674',
        dailyRewards: '0.000366314531089332'
      },
      {
        timestamp: 1737244800000,
        amount: '4.503929381136803542',
        totalRewards: '4.503929381136803542',
        dailyRewards: '0.000387445337070868'
      },
      {
        timestamp: 1737331200000,
        amount: '4.504583908315077103',
        totalRewards: '4.504583908315077103',
        dailyRewards: '0.000654527178273561'
      },
      {
        timestamp: 1737417600000,
        amount: '5.505398562004289498',
        totalRewards: '5.505398562004289498',
        dailyRewards: '0.000791296462689308'
      },
      {
        timestamp: 1737504000000,
        amount: '5.508996433773194235',
        totalRewards: '5.508996433773194235',
        dailyRewards: '0.003621231618800895'
      },
      {
        timestamp: 1737590400000,
        amount: '5.509649562709147252',
        totalRewards: '5.509649562709147252',
        dailyRewards: '0.000653137011885009'
      },
      {
        timestamp: 1737676800000,
        amount: '5.511344373510842162',
        totalRewards: '5.511344373510842162',
        dailyRewards: '0.001694825980314944'
      },
      {
        timestamp: 1737763200000,
        amount: '5.511913182049208305',
        totalRewards: '5.511913182049208305',
        dailyRewards: '0.000568804185377588'
      },
      {
        timestamp: 1737849600000,
        amount: '5.512171842756760304',
        totalRewards: '5.512171842756760304',
        dailyRewards: '0.000258661777777363'
      },
      {
        timestamp: 1737936000000,
        amount: '5.512828622519735305',
        totalRewards: '5.512828622519735305',
        dailyRewards: '0.000656787793936647'
      },
      {
        timestamp: 1738022400000,
        amount: '5.513298075564695477',
        totalRewards: '5.513298075564695477',
        dailyRewards: '0.000469462235155532'
      },
      {
        timestamp: 1738108800000,
        amount: '5.513192394302233519',
        totalRewards: '5.513192394302233519',
        dailyRewards: '-0.000105684535506714'
      },
      {
        timestamp: 1738195200000,
        amount: '5.513426225627519923',
        totalRewards: '5.513426225627519923',
        dailyRewards: '0.000233837944457476'
      },
      {
        timestamp: 1738281600000,
        amount: '5.513568486790528493',
        totalRewards: '5.513568486790528493',
        dailyRewards: '0.000142268482502555'
      },
      {
        timestamp: 1738368000000,
        amount: '5.513756274302327208',
        totalRewards: '5.513756274302327208',
        dailyRewards: '0.000187792191345239'
      }
    ])
  })
})
