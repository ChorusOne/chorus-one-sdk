import { Address, beginCell, toNano } from '@ton/ton'
import { defaultValidUntil, getDefaultGas, getRandomQueryId, TonBaseStaker } from './TonBaseStaker'
import { UnsignedTx } from './types'

export class TonPoolStaker extends TonBaseStaker {
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
    validatorAddressPair: [string, string]
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddressPair, amount, validUntil } = params
    const validatorAddress = await this.getPoolAddressForStake({ validatorAddressPair })

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
    delegatorAddress: string
    validatorAddress: string
    amount: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddress, amount, validUntil } = params

    const data = await this.getOnePoolParams({ validatorAddress })

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

  private async getOnePoolStake (params: { delegatorAddress: string; validatorAddress: string }) {
    const { delegatorAddress, validatorAddress } = params
    const client = this.getClient()

    const response = await client.runMethod(Address.parse(validatorAddress), 'get_member', [
      { type: 'slice', cell: beginCell().storeAddress(Address.parse(delegatorAddress)).endCell() }
    ])

    return {
      balance: response.stack.readBigNumber(),
      pendingDeposit: response.stack.readBigNumber(),
      pendingWithdraw: response.stack.readBigNumber(),
      withdraw: response.stack.readBigNumber()
    }
  }

  private async getOnePoolParams (params: { validatorAddress: string }) {
    const { validatorAddress } = params
    const client = this.getClient()
    const response = await client.runMethod(Address.parse(validatorAddress), 'get_params', [])

    const result = {
      enabled: response.stack.readBoolean(),
      updatesEnables: response.stack.readBoolean(),
      minStake: response.stack.readBigNumber(),
      depositFee: response.stack.readBigNumber(),
      withdrawFee: response.stack.readBigNumber(),
      poolFee: response.stack.readBigNumber(),
      receiptPrice: response.stack.readBigNumber()
    }

    return {
      minStake: result.minStake,
      depositFee: result.depositFee,
      withdrawFee: result.withdrawFee,
      poolFee: result.poolFee,
      receiptPrice: result.receiptPrice
    }
  }

  /** @ignore */
  async getPoolAddressForStake (params: { validatorAddressPair: [string, string] }) {
    const { validatorAddressPair } = params
    // The logic to be implemented, we return the first address for now

    return validatorAddressPair[0]
  }
}
