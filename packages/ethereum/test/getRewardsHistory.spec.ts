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
    // Use Stakewise Pool for testing, it has more interesting data on rewards
    validatorAddress = '0x472D1A6342E007A5F5E6C674c9D514ae5A3a2fC4'
    // Use one of the first delegators to the Stakewise Pool
    delegatorAddress = '0xd676090f860227009156D5A9E541bb9f72B1e356'
    staker = setup.staker
  })

  it('returns correct rewards history for given period of time', async () => {
    const rewards = await staker.getRewardsHistory({
      startTime: 1735689600000, // 2025-01-01
      endTime: 1738368000000, // 2025-02-01
      validatorAddress,
      delegatorAddress
    })

    assert.deepEqual(rewards, [
      {
        timestamp: 1735689600000,
        amount: '3.208018739074895893',
        totalRewards: '3.208018739074895893',
        dailyRewards: '-0.000177297500710675'
      },
      {
        timestamp: 1735776000000,
        amount: '3.207897231782333641',
        totalRewards: '3.207897231782333641',
        dailyRewards: '-0.000123973176610331'
      },
      {
        timestamp: 1735862400000,
        amount: '3.207776262132658833',
        totalRewards: '3.207776262132658833',
        dailyRewards: '-0.000123424622731523'
      },
      {
        timestamp: 1735948800000,
        amount: '3.207654217197209138',
        totalRewards: '3.207654217197209138',
        dailyRewards: '-0.000124521730489137'
      },
      {
        timestamp: 1736035200000,
        amount: '3.207532709904646886',
        totalRewards: '3.207532709904646886',
        dailyRewards: '-0.00012397317661033'
      },
      {
        timestamp: 1736121600000,
        amount: '3.207411202612084635',
        totalRewards: '3.207411202612084635',
        dailyRewards: '-0.00012397317661033'
      },
      {
        timestamp: 1736208000000,
        amount: '3.207290246410884504',
        totalRewards: '3.207290246410884504',
        dailyRewards: '-0.000123410901331835'
      },
      {
        timestamp: 1736294400000,
        amount: '3.207168219224293829',
        totalRewards: '3.207168219224293829',
        dailyRewards: '-0.000124503621432573'
      },
      {
        timestamp: 1736380800000,
        amount: '3.207046729602401792',
        totalRewards: '3.207046729602401792',
        dailyRewards: '-0.000123955147329345'
      },
      {
        timestamp: 1736467200000,
        amount: '3.206925777545208393',
        totalRewards: '3.206925777545208393',
        dailyRewards: '-0.000123406673226117'
      },
      {
        timestamp: 1736553600000,
        amount: '3.206803750358617719',
        totalRewards: '3.206803750358617719',
        dailyRewards: '-0.000124503621432572'
      },
      {
        timestamp: 1736640000000,
        amount: '3.206672638852300013',
        totalRewards: '3.206672638852300013',
        dailyRewards: '-0.000133772299469548'
      },
      {
        timestamp: 1736726400000,
        amount: '3.206460167701871754',
        totalRewards: '3.206460167701871754',
        dailyRewards: '-0.000216783066276844'
      },
      {
        timestamp: 1736812800000,
        amount: '3.206336314042347775',
        totalRewards: '3.206336314042347775',
        dailyRewards: '-0.000126367161033857'
      },
      {
        timestamp: 1736899200000,
        amount: '3.206214842091125952',
        totalRewards: '3.206214842091125952',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1736985600000,
        amount: '3.20609337013990413',
        totalRewards: '3.20609337013990413',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1737158400000,
        amount: '3.205850426237460485',
        totalRewards: '3.205850426237460485',
        dailyRewards: '-0.000247874236096721'
      },
      {
        timestamp: 1737244800000,
        amount: '3.205728954286238663',
        totalRewards: '3.205728954286238663',
        dailyRewards: '-0.000123937118048359'
      },
      {
        timestamp: 1737331200000,
        amount: '3.205607482335016841',
        totalRewards: '3.205607482335016841',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1737504000000,
        amount: '3.205364538432573196',
        totalRewards: '3.205364538432573196',
        dailyRewards: '-0.00024787423609672'
      },
      {
        timestamp: 1737590400000,
        amount: '3.205243066481351374',
        totalRewards: '3.205243066481351374',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1737676800000,
        amount: '3.205121594530129552',
        totalRewards: '3.205121594530129552',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1737763200000,
        amount: '3.205000122578907729',
        totalRewards: '3.205000122578907729',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1737849600000,
        amount: '3.204878650627685907',
        totalRewards: '3.204878650627685907',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1737936000000,
        amount: '3.204757178676464085',
        totalRewards: '3.204757178676464085',
        dailyRewards: '-0.000123937118048359'
      },
      {
        timestamp: 1738022400000,
        amount: '3.204635706725242263',
        totalRewards: '3.204635706725242263',
        dailyRewards: '-0.00012393711804836'
      },
      {
        timestamp: 1738108800000,
        amount: '3.204514254751491767',
        totalRewards: '3.204514254751491767',
        dailyRewards: '-0.000123916735151756'
      },
      {
        timestamp: 1738195200000,
        amount: '3.204393234291121938',
        totalRewards: '3.204393234291121938',
        dailyRewards: '-0.000123476464585084'
      },
      {
        timestamp: 1738281600000,
        amount: '3.204272213830752108',
        totalRewards: '3.204272213830752108',
        dailyRewards: '-0.000123476464585084'
      },
      {
        timestamp: 1738368000000,
        amount: '3.204151193370382279',
        totalRewards: '3.204151193370382279',
        dailyRewards: '-0.000123476464585083'
      }
    ])
  })
})
