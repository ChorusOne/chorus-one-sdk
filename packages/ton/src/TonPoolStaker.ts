import { Address, beginCell, fromNano, toNano } from '@ton/ton'
import { defaultValidUntil, getDefaultGas, getRandomQueryId, TonBaseStaker } from './TonBaseStaker'
import { UnsignedTx } from './types'

export class TonPoolStaker extends TonBaseStaker {
  /**
   * Builds a staking (delegation) transaction for Nominator Pool contract.
   * For more information see: https://github.com/ton-blockchain/nominator-pool
   *
   * @param params - Parameters for building the transaction
   * @param params.validatorAddress - The validator address to stake to
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildStakeTx (params: {
    validatorAddressPair: [string, string]
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { validatorAddressPair, amount, validUntil } = params
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

    const payload = beginCell()
      .storeUint(2077040623, 32)
      .storeUint(getRandomQueryId(), 64) // Query ID
      .storeCoins(getDefaultGas()) // Gas
      .endCell()

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

    const payload = beginCell()
      .storeUint(3665837821, 32)
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
