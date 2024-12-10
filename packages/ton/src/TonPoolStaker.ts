import { Address, beginCell, fromNano, toNano } from '@ton/ton'
import { defaultValidUntil, getDefaultGas, getRandomQueryId, TonBaseStaker } from './TonBaseStaker'
import { UnsignedTx } from './types'

export class TonPoolStaker extends TonBaseStaker {
  /**
   * Builds a staking transaction for TON Pool contract. It uses 2 pool solution, and picks the best pool
   * to stake to automatically.
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorAddressPair - The validator address pair to stake to
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.referrer - (Optional) The address of the referrer. This is used to track the origin of transactions,
   * providing insights into which sources or campaigns are driving activity. This can be useful for analytics and
   * optimizing user acquisition strategies
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildStakeTx (params: {
    validatorAddressPair: [string, string]
    amount: string
    referrer?: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { validatorAddressPair, amount, validUntil, referrer } = params
    const validatorAddress = await this.getPoolAddressForStake({ validatorAddressPair })

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

    // https://github.com/tonwhales/ton-nominators/blob/0553e1b6ddfc5c0b60505957505ce58d01bec3e7/compiled/nominators.fc#L18
    let basePayload = beginCell()
      .storeUint(2077040623, 32) // stake_deposit method const
      .storeUint(getRandomQueryId(), 64) // Query ID
      .storeCoins(getDefaultGas()) // Gas

    if (referrer) {
      basePayload = basePayload.storeStringTail(referrer)
    }

    const payload = basePayload.endCell()

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        bounceable: true,
        amount: toNano(amount),
        payload
      }
    }

    return { tx }
  }

  /**
   * Builds an unstaking transaction for TON Pool contract.
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorAddress - The validator address to unstake from
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildUnstakeTx (params: {
    validatorAddress: string
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { validatorAddress, amount, validUntil } = params

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

    const data = await this.getPoolParamsUnformatted({ validatorAddress })

    // https://github.com/tonwhales/ton-nominators/blob/0553e1b6ddfc5c0b60505957505ce58d01bec3e7/compiled/nominators.fc#L20
    const payload = beginCell()
      .storeUint(3665837821, 32) // stake_withdraw method const
      .storeUint(getRandomQueryId(), 64) // Query ID
      .storeCoins(getDefaultGas()) // Gas
      .storeCoins(toNano(amount)) // Amount
      .endCell()

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      message: {
        address: validatorAddress,
        bounceable: true,
        amount: data.withdrawFee + data.receiptPrice,
        payload
      }
    }

    return { tx }
  }

  /**
   * Retrieves the staking information for a specified delegator.
   *
   * @param params - Parameters for the request
   * @param params.delegatorAddress - The delegator (wallet) address
   * @param params.validatorAddress - (Optional) The validator address to gather staking information from
   *
   * @returns Returns a promise that resolves to the staking information for the specified delegator.
   */
  async getStake (params: { delegatorAddress: string; validatorAddress: string }) {
    const { delegatorAddress, validatorAddress } = params
    const client = this.getClient()

    const response = await client.runMethod(Address.parse(validatorAddress), 'get_member', [
      { type: 'slice', cell: beginCell().storeAddress(Address.parse(delegatorAddress)).endCell() }
    ])

    return {
      balance: fromNano(response.stack.readBigNumber()),
      pendingDeposit: fromNano(response.stack.readBigNumber()),
      pendingWithdraw: fromNano(response.stack.readBigNumber()),
      withdraw: fromNano(response.stack.readBigNumber())
    }
  }

  /**
   * Retrieves the staking information for a specified pool, including minStake and fees information.
   *
   * @param params - Parameters for the request
   * @param params.validatorAddress - The validator (vault) address
   *
   * @returns Returns a promise that resolves to the staking information for the specified pool.
   */
  async getPoolParams (params: { validatorAddress: string }) {
    const result = await this.getPoolParamsUnformatted(params)

    return {
      minStake: fromNano(result.minStake),
      depositFee: fromNano(result.depositFee),
      withdrawFee: fromNano(result.withdrawFee),
      poolFee: fromNano(result.poolFee),
      receiptPrice: fromNano(result.receiptPrice)
    }
  }

  private async getPoolParamsUnformatted (params: { validatorAddress: string }) {
    const { validatorAddress } = params
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(validatorAddress), 'get_params', [])

    return {
      enabled: response.stack.readBoolean(),
      updatesEnables: response.stack.readBoolean(),
      minStake: response.stack.readBigNumber(),
      depositFee: response.stack.readBigNumber(),
      withdrawFee: response.stack.readBigNumber(),
      poolFee: response.stack.readBigNumber(),
      receiptPrice: response.stack.readBigNumber()
    }
  }

  /** @ignore */
  async getPoolAddressForStake (params: { validatorAddressPair: [string, string] }) {
    const { validatorAddressPair } = params
    // The logic to be implemented, we return the first address for now

    return validatorAddressPair[0]
  }
}
