import { SolanaStaker, denomToMacroAmount, macroToDenomAmount } from '@chorus-one/solana'
import { StakeProgram, PublicKey, Authorized, Lockup, Keypair } from '@solana/web3.js'
import { describe, it, before } from 'mocha'
import { use, assert, expect, spy } from 'chai'
import { chaiAsPromised } from 'chai-promised'
import spies from 'chai-spies'
import { SolanaTestStaker } from './testStaker'

// Use chai-as-promised plugin for async tests
use(chaiAsPromised)
use(spies)

describe('SolanaStaker', () => {
  const ownerAddress = '3Ps2hwsgGMSuqxAwjcGJHiEpMsSTZcxrCGprHgxWkfma'
  const validatorAddress = '1DadCBpbH3ihBTkehCvWRZB9nzN5BciaSS6TcFp4o8p'
  const staker = new SolanaStaker({
    rpcUrl: 'https://solana.fake.website'
  })

  it('should generate correct unsigned delegate tx', async () => {
    spy.on(staker, ['getConnection'], () => {
      return {
        getMinimumBalanceForRentExemption: () => Promise.resolve(0)
      }
    })

    // generate a stake transaction
    const { tx } = await staker.buildStakeTx({
      ownerAddress,
      validatorAddress,
      amount: '0.5'
    })

    // generate the expected stake transaction
    const stakeAccount = Keypair.generate()
    const ownerPublicKey = new PublicKey(ownerAddress)
    const expectedTx = StakeProgram.createAccount({
      fromPubkey: ownerPublicKey,
      stakePubkey: stakeAccount.publicKey,
      authorized: new Authorized(ownerPublicKey, ownerPublicKey),
      lockup: new Lockup(0, 0, ownerPublicKey),

      lamports: 0.5 * 1e9 // this is what we want to test
    })

    ;[0, 1].forEach((i) => {
      const data = tx.tx.instructions[i].data.toString('base64')
      const expectedData = expectedTx.instructions[i].data.toString('base64')

      assert.equal(data, expectedData)
    })
  })

  it('should handle amount fuzzing correctly', () => {
    ;[
      ['0', '0'], // zero handlung
      ['1', '1000000000'], // 1 * denomMultiplier = denomMultiplier
      ['1.2', '1200000000'], // most common case
      ['0.123456789', '123456789'], // max precision
      ['0.000000000000000000000', '0'], // over max precision but zero
      ['1000000000', '1000000000000000000'], // unlikely edge case to send 1 000 000 000 macro tokens
      ['0.1234567891', '', 'exceeded maximum denominator precision, amount: 123456789.1, precision: .10'], // over max precision
      ['', '', 'invalid amount:  failed to parse to number'], // empty string is not a valid number
      ['abc', '', 'invalid amount: abc failed to parse to number'], // text is not a valid number
      ['-1', '', 'amount cannot be negative'] // negive amounts are not allowed
    ].map((testData) => {
      const [amount, expectedAmount, expectedError] = testData

      const runTest = (amount: string): number => {
        return macroToDenomAmount(amount, '1000000000')
      }

      if (expectedError) {
        expect(() => {
          runTest(amount)
        }).to.throw(expectedError)
      } else {
        const result = runTest(amount)

        // check if we have the expected amount
        assert.equal(result, Number(expectedAmount))

        // check if the reverse conversion is correct (0.000000000000 is a special case, that returns just 0)
        const expectedMacroDenom = amount === '0.000000000000000000000' ? '0' : amount
        assert.equal(denomToMacroAmount(result.toString(), '1000000000'), Number(expectedMacroDenom))
      }
    })
  })

  it('should generate correct stake states', async () => {
    await Promise.all(
      [
        // case 0: stake account is not delegated (ever)
        {
          type: 'initialized',
          delegation: null,
          expected: 'undelegated'
        },
        // case 1: stake account was never delegated. This is the response after first stake transaction
        {
          type: 'delegated',
          delegation: {
            activationEpoch: '670',
            deactivationEpoch: '18446744073709551615',
            stake: '2097717120',
            voter: '1DadCBpbH3ihBTkehCvWRZB9nzN5BciaSS6TcFp4o8p',
            warmupCooldownRate: 0.25
          },
          expected: 'delegated'
        },
        // case 2: response after immediate undelegation (deactivation)
        {
          type: 'delegated',
          delegation: {
            activationEpoch: '670',
            deactivationEpoch: '670',
            stake: '2097717120',
            voter: '1DadCBpbH3ihBTkehCvWRZB9nzN5BciaSS6TcFp4o8p',
            warmupCooldownRate: 0.25
          },
          expected: 'deactivating'
        },
        // case 4: the stake is about to deactivate in a few epochs
        {
          type: 'delegated',
          delegation: {
            activationEpoch: '670',
            deactivationEpoch: '678',
            stake: '2097717120',
            voter: '1DadCBpbH3ihBTkehCvWRZB9nzN5BciaSS6TcFp4o8p',
            warmupCooldownRate: 0.25
          },
          expected: 'deactivating'
        },
        // case 5: the stake is about to deactivate in a few epochs, but the
        // current epoch is higher. Thus the stake is deactivated
        {
          type: 'delegated',
          delegation: {
            activationEpoch: '660',
            deactivationEpoch: '668',
            stake: '2097717120',
            voter: '1DadCBpbH3ihBTkehCvWRZB9nzN5BciaSS6TcFp4o8p',
            warmupCooldownRate: 0.25
          },
          expected: 'undelegated'
        }
      ].map(async (testData) => {
        const staker = new SolanaStaker({
          rpcUrl: 'https://solana.fake.website'
        })

        spy.on(staker, ['getConnection'], () => {
          return {
            getEpochInfo: () =>
              Promise.resolve({
                epoch: '670'
              }),
            getParsedProgramAccounts: () =>
              Promise.resolve([
                {
                  pubkey: new PublicKey(ownerAddress),
                  account: {
                    data: {
                      parsed: {
                        type: testData['type'],
                        info: {
                          stake: {
                            delegation: testData['delegation']
                          }
                        }
                      }
                    }
                  }
                }
              ])
          }
        })

        const { accounts } = await staker.getStakeAccounts({
          ownerAddress,
          validatorAddress,
          withStates: true
        })

        assert.equal(accounts[0].state, testData['expected'])
      })
    )
  })
})

describe('SolanaStake - with real connection', () => {
  let testStaker: SolanaTestStaker

  before(async function () {
    this.timeout(10000)
    const mnemonic = process.env.TEST_SOLANA_MNEMONIC
    if (!mnemonic) {
      throw new Error('TEST_SOLANA_MNEMONIC environment variable is not set')
    }

    testStaker = new SolanaTestStaker({
      mnemonic,
      rpcUrl: 'https://api.devnet.solana.com'
    })

    await testStaker.init()

    await testStaker.requestAirdropIfNeeded(new PublicKey(testStaker.ownerAddress), 0.1, 2)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })

  it('should create and delegate a stake account, unstake and withdraw', async () => {
    // Check stake accounts before creating a new one
    const allStakeAccountsBefore = await testStaker.getStakeAccounts(null)
    const allStakeAccountsBeforeCount = allStakeAccountsBefore.accounts.length

    // create and delegate a stake account
    const stakeAccountAddress = await testStaker.createAndDelegateStake('0.003')
    const stakeAccountsAfterCreation = await testStaker.getStakeAccounts(null)
    const stakeAccountsAfterCreationCount = stakeAccountsAfterCreation.accounts.length
    expect(stakeAccountsAfterCreationCount).to.equal(allStakeAccountsBeforeCount + 1)
    const stakeAccount = stakeAccountsAfterCreation.accounts.find((account) => account.address === stakeAccountAddress)
    expect(stakeAccount).to.exist
    expect(stakeAccount!.state).to.equal('delegated')

    // unstake
    const statusUnstake = await testStaker.undelegateStake(stakeAccountAddress)
    expect(statusUnstake).to.equal('success')

    // withdraw
    const statusWithdraw = await testStaker.withdrawStake(stakeAccountAddress)
    expect(statusWithdraw).to.equal('success')
    const stakeAccountsAfterWithdraw = await testStaker.getStakeAccounts(null)
    const stakeAccountsAfterWithdrawCount = stakeAccountsAfterWithdraw.accounts.length
    expect(stakeAccountsAfterWithdrawCount).to.equal(allStakeAccountsBeforeCount)
  }).timeout(60000)
  it('should stake and split the stake account', async () => {
    const stakeAmount = 0.3
    const stakeAccountAddress = await testStaker.createAndDelegateStake(stakeAmount.toString())

    // split the stake account
    const { status, newStakeAccountAddress } = await testStaker.splitStake(stakeAccountAddress, '0.1')
    expect(status).to.equal('success')
    const {
      accounts: [oldStakeAccount]
    } = await testStaker.getStakeAccounts(stakeAccountAddress)
    expect(oldStakeAccount.state).to.equal('delegated')
    expect(oldStakeAccount.amount).to.be.equal(200000000)

    // check the new stake account balance
    const {
      accounts: [newStakeAccount]
    } = await testStaker.getStakeAccounts(newStakeAccountAddress)
    expect(newStakeAccount.state).to.equal('delegated')
    expect(newStakeAccount.amount).to.be.greaterThan(100000000) // we need to account for the rent exemption
  }).timeout(60000)
})
