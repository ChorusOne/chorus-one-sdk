import { Address, toNano, Cell, beginCell, fromNano, TupleReader } from '@ton/ton'
import { defaultValidUntil, TonBaseStaker } from './TonBaseStaker'
import { NominatorInfo, UnsignedTx } from './types'

export class TonSingleNominatorPoolStaker extends TonBaseStaker {
  /**
   * Builds a staking (delegation) transaction for Single Nominator Pool contract.
   * For more information see: https://github.com/orbs-network/single-nominator/tree/main
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

    // be sure the delegator is the owner of the contract otherwise we can't withdraw the funds back
    const roles = await this.getContractRoles(validatorAddress)
    if (!roles.ownerAddress.equals(Address.parse(delegatorAddress))) {
      throw new Error('delegator is not the owner of the single nominator pool contract')
    }

    // this serves purely as a sanity check
    const data = await this.getNominatorContractPoolData(validatorAddress)
    if (data.nominators_count !== 1) {
      throw new Error('the single nominator pool contract is expected to have exactly one nominator')
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      messages: [{
        address: validatorAddress,
        // to stake tokens we need to send a large amount of tokens
        // it is critical that the transaction is bounceable
        // otherwise in the case of contract failure we may loose tokens!
        bounceable: true,
        amount: toNano(amount),
        payload: Cell.EMPTY
      }]
    }

    return { tx }
  }

  /**
   * Builds a unstaking (withdraw nominator) transaction for Single Nominator Pool contract.
   * For more information see: https://github.com/orbs-network/single-nominator/tree/main
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.amount - The amount to unstake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool unstaking transaction.
   */
  async buildUnstakeTx (params: {
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

    // only onwer can withdraw the funds
    const roles = await this.getContractRoles(validatorAddress)
    if (!roles.ownerAddress.equals(Address.parse(delegatorAddress))) {
      throw new Error('delegator is not the owner of the single nominator pool contract')
    }

    // this serves purely as a sanity check
    const data = await this.getNominatorContractPoolData(validatorAddress)
    if (data.nominators_count !== 1) {
      throw new Error('the single nominator pool contract is expected to have exactly one nominator')
    }

    // source: https://github.com/orbs-network/single-nominator/tree/main?tab=readme-ov-file#1-withdraw
    //         https://github.com/orbs-network/single-nominator/blob/main/scripts/ts/withdraw-deeplink.ts#L7C5-L7C137
    const payload = beginCell().storeUint(0x1000, 32).storeUint(1, 64).storeCoins(toNano(amount)).endCell()

    // 1 TON should be enough to cover the transaction fees (similar to nominator pool contract)
    const amountToCoverTxFees = '1'

    // ensure we don't drain the validator wallet by accident
    this.checkMinimumExistentialBalance(validatorAddress, amount)

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      messages: [{
        address: validatorAddress,
        // to unstake tokens we need to send a some tokens that should
        // be returned to us in case of error
        bounceable: true,
        amount: toNano(amountToCoverTxFees),
        payload
      }]
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

    // otherise it is a single nominator pool contract
    const roles = await this.getContractRoles(validatorAddress)
    if (!roles.ownerAddress.equals(Address.parse(delegatorAddress))) {
      throw new Error('delegator is not the owner of the single nominator pool contract')
    }

    const balance = await this.getBalance({ address: validatorAddress })

    return { balance: balance.amount }
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

  private async getContractRoles (
    contractAddress: string
  ): Promise<{ ownerAddress: Address; validatorAddress: Address }> {
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(contractAddress), 'get_roles', [])

    // reference: https://github.com/orbs-network/single-nominator/blob/main/contracts/single-nominator.fc#L186
    if (response.stack.remaining !== 2) {
      throw new Error('invalid get_pool_data response, expected 17 fields got ' + response.stack.remaining)
    }

    const ownerAddress = response.stack.readAddress()
    const validatorAddress = response.stack.readAddress()

    return {
      ownerAddress,
      validatorAddress
    }
  }
}
