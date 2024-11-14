import { Address, toNano, fromNano, TupleReader, TupleItem } from '@ton/ton'
import { defaultValidUntil, TonBaseStaker } from './TonBaseStaker'
import { NominatorInfo, UnsignedTx } from './types'

export class TonNominatorPoolStaker extends TonBaseStaker {
  /**
   * Builds a staking (delegation) transaction for Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address to stake from
   * @param params.validatorAddress - The validator address to stake to
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildStakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, amount, validUntil } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    // ensure the validator address is bounceable.
    // NOTE: TEP-002 specifies that the address bounceable flag should match both the internal message and the address.
    // This has no effect as we force the bounce flag anyway. However it is a good practice to be consistent
    if (!Address.parseFriendly(validatorAddress).isBounceable) {
      throw new Error(
        'validator address is not bounceable! It is required for nominator pool contract operations to use bounceable addresses'
      )
    }

    // this is also a somewhat okay way to check the contract is indeed a staking pool contract
    const data = await this.getNominatorContractPoolData(validatorAddress)
    if (data.nominators_count >= data.max_nominators_count) {
      throw new Error('validator has reached the maximum number of nominators')
    }

    // ensure we stake at least the minimum required amount
    const nominators = (await this.getPoolContractNominators({ validatorAddress })).nominators
    const ourNominator = nominators.find((n) => Address.parseRaw(n.address).equals(Address.parse(delegatorAddress)))
    const amountStaked = ourNominator ? toNano(ourNominator.amount) : BigInt(0)
    const amountToStake = toNano(amount)

    if (amountToStake + amountStaked < data.min_nominator_stake) {
      throw new Error(
        `amount to stake (${fromNano(amountToStake)}) is less than the minimum stake required (${fromNano(data.min_nominator_stake)})`
      )
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        // to stake tokens we need to send a large amount of tokens
        // it is critical that the transaction is bounceable
        // otherwise in the case of contract failure we may loose tokens!
        bounceable: true,
        amount: toNano(amount),
        payload: 'd' // 'd' for deposit / delegation
      }
    }

    return { tx }
  }

  /**
   * Builds an unstaking (withdraw nominator) transaction for Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool unstaking transaction.
   */
  async buildUnstakeTx (params: {
    delegatorAddress: string
    validatorAddress: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, validUntil } = params

    // "In order for the nominator to make a withdrawal, he needs to send message to nominator-pool smart contract with text comment "w"
    // and some Toncoins for network fee (1 TON is enough). Unspent TONs attached to message will be returned except in very rare cases."
    //
    // source: https://github.com/ton-blockchain/nominator-pool?tab=readme-ov-file#nominators-withdrawal
    const amount = '1' // 1 TON

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    // ensure the validator address is bounceable.
    // NOTE: TEP-002 specifies that the address bounceable flag should match both the internal message and the address.
    // This has no effect as we force the bounce flag anyway. However it is a good practice to be consistent
    if (!Address.parseFriendly(validatorAddress).isBounceable) {
      throw new Error(
        'validator address is not bounceable! It is required for nominator pool contract operations to use bounceable addresses'
      )
    }

    // this is also a somewhat okay way to check the contract is indeed a staking pool contract
    const data = await this.getNominatorContractPoolData(validatorAddress)
    if (data.nominators_count === 0) {
      throw new Error('there is no nominators currently staking to the nominator pool contract')
    }

    // ensure that the delegator has staked to the validator
    const nominators = (await this.getPoolContractNominators({ validatorAddress })).nominators
    const ourNominator = nominators.find((n) => Address.parseRaw(n.address).equals(Address.parse(delegatorAddress)))
    if (!ourNominator) {
      throw new Error('delegator is not staking to the nominator pool contract')
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        // to unstake tokens we need to send a some tokens that should
        // be returned to us in case of error
        bounceable: true,
        amount: toNano(amount),
        payload: 'w' // 'w' for withdraw
      }
    }

    return { tx }
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - The validator address to gather rewards data from
   * @param params.contractType - The validator contract type (single-nominator-pool or nominator-pool)
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: { delegatorAddress: string; validatorAddress: string }): Promise<{ balance: string }> {
    const { delegatorAddress, validatorAddress } = params
    const { nominators } = await this.getPoolContractNominators({ validatorAddress })
    if (nominators.length === 0) {
      return { balance: '0' }
    }

    const nominator = nominators.find((n) => Address.parse(n.address).equals(Address.parse(delegatorAddress)))
    if (nominator === undefined) {
      return { balance: '0' }
    }

    return { balance: nominator.amount }
  }

  /**
   * Retrieves the active nominators for a Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for the request
   * @param params.validatorAddress - The validator address to gather rewards data from
   *
   * @returns Returns a promise that resolves to the nominator data for the validator address.
   */
  async getPoolContractNominators (params: { validatorAddress: string }): Promise<{ nominators: NominatorInfo[] }> {
    const client = this.getClient()
    const { validatorAddress } = params

    // ensure the address is for the right network
    this.checkIfAddressTestnetFlagMatches(validatorAddress)

    const response = await client.runMethod(Address.parse(validatorAddress), 'list_nominators', [])

    // @ts-expect-error the library does not handle 'list' type well. This is a workaround to get the data out of the 'list' type
    const reader = new TupleReader(response.stack.pop().items as TupleItem[])

    // extract nominators from contract response
    const nominators: NominatorInfo[] = []

    if (reader.remaining > 0) {
      do {
        const x = reader.readTuple()
        nominators.push({
          // The nominator pool contract allows only the basechain addresses (`0:`)
          // https://github.com/ton-blockchain/nominator-pool/blob/main/func/pool.fc#L618
          address: `0:${BigInt(x.readBigNumber()).toString(16)}`,
          amount: fromNano(x.readBigNumber()),
          pending_deposit_amount: fromNano(x.readBigNumber()),
          withdraw_requested: fromNano(x.readBigNumber())
        })
      } while (reader.remaining)
    }

    return { nominators }
  }
}
