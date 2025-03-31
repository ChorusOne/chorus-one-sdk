import {
  Address,
  beginCell,
  fromNano,
  toNano,
  Slice,
  Builder,
  DictionaryValue,
  Dictionary,
  Cell,
  TransactionDescriptionGeneric
} from '@ton/ton'
import { defaultValidUntil, getDefaultGas, getRandomQueryId, TonBaseStaker } from './TonBaseStaker'
import { UnsignedTx, Election, FrozenSet, PoolStatus, Message, TonTxStatus } from './types'

export class TonPoolStaker extends TonBaseStaker {
  /**
   * Builds a staking transaction for TON Pool contract. It uses 2 pool solution, and picks the best pool
   * to stake to automatically.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address
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
    delegatorAddress: string
    validatorAddressPair: [string, string]
    amount: string
    referrer?: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { validatorAddressPair, delegatorAddress, amount, validUntil, referrer } = params

    // allow staking to both pools
    const validatorAddresses = validatorAddressPair.filter((address) => address.length > 0)
    if (validatorAddresses.length == 0) {
      throw new Error('At least one validator address is required')
    }

    validatorAddresses.forEach((validatorAddress) => {
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
    })

    const genStakeMsg = (validatorAddress: string, amount: bigint): Message => {
      // https://github.com/tonwhales/ton-nominators/blob/0553e1b6ddfc5c0b60505957505ce58d01bec3e7/compiled/nominators.fc#L18
      let basePayload = beginCell()
        .storeUint(2077040623, 32) // stake_deposit method const
        .storeUint(getRandomQueryId(), 64) // Query ID
        .storeCoins(getDefaultGas()) // Gas

      if (referrer) {
        basePayload = basePayload.storeStringTail(referrer)
      }

      const payload = basePayload.endCell()

      return {
        address: validatorAddress,
        bounceable: true,
        amount: amount,
        payload
      }
    }

    const msgs: Message[] = []
    const useStatefulCalculation = validatorAddresses.length > 1

    if (useStatefulCalculation) {
      const { minStake, currentPoolBalances, currentUserStakes } = await this.getPoolDataForDelegator(
        delegatorAddress,
        validatorAddresses
      )

      const stakeAmountPerPool = TonPoolStaker.calculateStakePoolAmount(
        toNano(amount),
        minStake,
        currentPoolBalances,
        currentUserStakes
      )

      // sanity check
      if (stakeAmountPerPool.reduce((acc, val) => acc + val, 0n) !== toNano(amount)) {
        throw new Error('unstake amount does not match the requested amount')
      }

      validatorAddresses.forEach((validatorAddress, index) => {
        if (stakeAmountPerPool[index] === 0n) {
          return null
        }
        msgs.push(genStakeMsg(validatorAddress, stakeAmountPerPool[index]))
      })
    } else {
      const validatorAddress = validatorAddresses[0] !== '' ? validatorAddresses[0] : validatorAddresses[1]
      msgs.push(genStakeMsg(validatorAddress, toNano(amount)))
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      messages: msgs.filter((msg) => msg !== null)
    }

    return { tx }
  }

  /**
   * Builds an unstaking transaction for TON Pool contract.
   *
   * @param params - Parameters for building the transaction
   * @param params.delegatorAddress - The delegator address
   * @param params.validatorAddressPair - The validator address pair to unstake from
   * @param params.amount - The amount to stake, specified in `TON`
   * @param params.disableStatefulCalculation - (Optional) Disables stateful calculation where validator and user stake is taken into account
   * @param params.validUntil - (Optional) The Unix timestamp when the transaction expires
   *
   * @returns Returns a promise that resolves to a TON nominator pool staking transaction.
   */
  async buildUnstakeTx (params: {
    delegatorAddress: string
    validatorAddressPair: [string, string]
    amount: string
    disableStatefulCalculation?: boolean
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { delegatorAddress, validatorAddressPair, amount, disableStatefulCalculation, validUntil } = params

    // allow unstaking from a single pool
    const validatorAddresses = validatorAddressPair.filter((address) => address.length > 0)
    if (validatorAddresses.length == 0) {
      throw new Error('At least one validator address is required')
    }

    validatorAddresses.forEach((validatorAddress) => {
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
    })

    const genUnstakeMsg = (
      validatorAddress: string,
      amount: bigint,
      withdrawFee: bigint,
      receiptPrice: bigint
    ): Message => {
      // https://github.com/tonwhales/ton-nominators/blob/0553e1b6ddfc5c0b60505957505ce58d01bec3e7/compiled/nominators.fc#L20
      const payload = beginCell()
        .storeUint(3665837821, 32) // stake_withdraw method const
        .storeUint(getRandomQueryId(), 64) // Query ID
        .storeCoins(getDefaultGas()) // Gas
        .storeCoins(amount) // Amount
        .endCell()

      return {
        address: validatorAddress,
        bounceable: true,
        amount: withdrawFee + receiptPrice,
        payload
      }
    }

    const poolParamsData = await Promise.all(
      validatorAddresses.map((validatorAddress) => this.getPoolParamsUnformatted({ validatorAddress }))
    )
    const msgs: Message[] = []

    if (disableStatefulCalculation) {
      validatorAddresses.forEach((validatorAddress, index) => {
        const data = poolParamsData[index]
        msgs.push(genUnstakeMsg(validatorAddress, toNano(amount), data.withdrawFee, data.receiptPrice))
      })
    } else {
      const { minStake, currentPoolBalances, currentUserStakes } = await this.getPoolDataForDelegator(
        delegatorAddress,
        validatorAddresses
      )

      const unstakeAmountPerPool = TonPoolStaker.calculateUnstakePoolAmount(
        toNano(amount),
        minStake,
        currentPoolBalances,
        currentUserStakes
      )

      // sanity check
      if (unstakeAmountPerPool.reduce((acc, val) => acc + val, 0n) !== toNano(amount)) {
        throw new Error('unstake amount does not match the requested amount')
      }

      validatorAddresses.forEach((validatorAddress, index) => {
        const data = poolParamsData[index]
        const amount = unstakeAmountPerPool[index]

        // skip if no amount to unstake
        if (amount === 0n) {
          return null
        }

        msgs.push(genUnstakeMsg(validatorAddress, amount, data.withdrawFee, data.receiptPrice))
      })
    }

    const tx = {
      validUntil: defaultValidUntil(validUntil),
      messages: msgs.filter((msg) => msg !== null)
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

  /**
   * Retrieves the status of a transaction using the transaction hash.
   *
   * This method is intended to check for transactions made recently (within limit) and not for historical transactions.
   *
   * @param params - Parameters for the transaction status request
   * @param params.address - The account address to query
   * @param params.txHash - The transaction hash to query
   * @param params.limit - (Optional) The maximum number of transactions to fetch
   *
   * @returns A promise that resolves to an object containing the transaction status.
   */
  async getTxStatus (params: { address: string; txHash: string; limit?: number }): Promise<TonTxStatus> {
    const transaction = await this.getTransactionByHash(params)

    if (transaction === undefined) {
      return { status: 'unknown', receipt: null }
    }

    if (transaction.description.type === 'generic') {
      const description = transaction.description as TransactionDescriptionGeneric

      if (description.computePhase.type === 'vm') {
        const compute = description.computePhase

        if (compute.exitCode === 501) {
          return { status: 'failure', receipt: transaction, reason: 'withdraw_below_minimum_stake' }
        }
      }
    }

    return this.matchTransactionStatus(transaction)
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
  private async getPoolDataForDelegator (delegatorAddress: string, validatorAddresses: string[]) {
    const [poolStatus, userStake, minStake] = await Promise.all([
      Promise.all(validatorAddresses.map((validatorAddress) => this.getPoolStatus(validatorAddress))),
      Promise.all(validatorAddresses.map((validatorAddress) => this.getStake({ delegatorAddress, validatorAddress }))),
      this.getMinStake()
    ])

    const currentPoolBalances: [bigint, bigint] =
      validatorAddresses.length === 2 ? [poolStatus[0].balance, poolStatus[1].balance] : [poolStatus[0].balance, 0n]

    const currentUserStakes: [bigint, bigint] =
      validatorAddresses.length === 2
        ? [
            toNano(userStake[0].balance) + toNano(userStake[0].pendingDeposit) - toNano(userStake[0].pendingWithdraw),
            toNano(userStake[1].balance) + toNano(userStake[1].pendingDeposit) - toNano(userStake[1].pendingWithdraw)
          ]
        : [
            toNano(userStake[0].balance) + toNano(userStake[0].pendingDeposit) - toNano(userStake[0].pendingWithdraw),
            0n
          ]

    return {
      minStake,
      currentPoolBalances,
      currentUserStakes
    }
  }

  async getMinStake (): Promise<bigint> {
    // elector contract address
    const elections = await this.getPastElections('Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF')

    // simple sanity validation
    if (elections.length == 0) {
      throw new Error('No elections found')
    }

    // iterate lastElection.frozen and find the lowest validator stake
    const lastElection = elections[0]
    const values = Array.from(lastElection.frozen.values())
    const minStake = values.reduce((min, p) => (p.stake < min ? p.stake : min), values[0].stake)

    return minStake
  }

  async getPoolStatus (validatorAddress: string): Promise<PoolStatus> {
    const client = this.getClient()
    const provider = client.provider(Address.parse(validatorAddress))
    const res = await provider.get('get_pool_status', [])

    return {
      balance: res.stack.readBigNumber(),
      balanceSent: res.stack.readBigNumber(),
      balancePendingDeposits: res.stack.readBigNumber(),
      balancePendingWithdrawals: res.stack.readBigNumber(),
      balanceWithdraw: res.stack.readBigNumber()
    }
  }

  async getPastElections (electorContractAddress: string): Promise<Election[]> {
    const client = this.getClient()
    const provider = client.provider(Address.parse(electorContractAddress))
    const res = await provider.get('past_elections', [])

    const FrozenDictValue: DictionaryValue<FrozenSet> = {
      serialize (_src: FrozenSet, _builder: Builder) {
        throw Error('not implemented')
      },
      parse (src: Slice): FrozenSet {
        const address = new Address(-1, src.loadBuffer(32))
        const weight = src.loadUintBig(64)
        const stake = src.loadCoins()
        return { address, weight, stake }
      }
    }

    // NOTE: In ideal case we would call `res.stack.readLispList()` however the library does not handle 'list' type well
    // and exits with an error. This is alternative way to get election data out of the 'list' type.
    const root = res.stack.readTuple()
    const elections: Election[] = []

    while (root.remaining > 0) {
      const electionsEntry = root.pop()
      const id = electionsEntry[0]
      const unfreezeAt = electionsEntry[1]
      const stakeHeld = electionsEntry[2]
      const validatorSetHash = electionsEntry[3]
      const frozenDict: Cell = electionsEntry[4]
      const totalStake = electionsEntry[5]
      const bonuses = electionsEntry[6]
      const frozen: Map<string, FrozenSet> = new Map()

      const frozenData = frozenDict.beginParse().loadDictDirect(Dictionary.Keys.Buffer(32), FrozenDictValue)
      for (const [key, value] of frozenData) {
        frozen.set(BigInt('0x' + key.toString('hex')).toString(10), {
          address: value['address'],
          weight: value['weight'],
          stake: value['stake']
        })
      }
      elections.push({ id, unfreezeAt, stakeHeld, validatorSetHash, totalStake, bonuses, frozen })
    }

    // return elections sorted by id (bigint) in descending order
    return elections.sort((a, b) => (a.id > b.id ? -1 : 1))
  }

  /** @ignore */
  static calculateUnstakePoolAmount (
    amount: bigint, // amount to unstake
    minStake: bigint, // minimum stake for participation (to be in the set)
    currentPoolBalances: [bigint, bigint], // current stake balances of the pools
    currentUserStakes: [bigint, bigint] // current user stakes in the pools
  ): [bigint, bigint] {
    const [balancePool1, balancePool2] = currentPoolBalances
    const [stakeUser1, stakeUser2] = currentUserStakes

    // check if the requested withdrawal amount exceeds the available user stakes
    const totalUserStake = stakeUser1 + stakeUser2
    if (amount > totalUserStake) {
      throw new Error('requested withdrawal amount exceeds available user stakes')
    }

    // check if the pool will remain active after withdrawal
    const willRemainActive = (balance: bigint, withdraw: bigint): boolean => balance - withdraw >= minStake

    // sorting pools based on balance (highest balance first)
    const pools = [
      { index: 0, balance: balancePool1, userStake: stakeUser1 },
      { index: 1, balance: balancePool2, userStake: stakeUser2 }
    ].sort((a, b) => Number(b.balance - a.balance))

    let remainingAmount = amount
    const result: [bigint, bigint] = [0n, 0n]

    for (const pool of pools) {
      if (remainingAmount === 0n) break

      // maximum that can be withdrawn from this pool without deactivating it
      let maxWithdraw = pool.userStake
      if (!willRemainActive(pool.balance, maxWithdraw)) {
        maxWithdraw = pool.balance - minStake
      }
      maxWithdraw = maxWithdraw < 0n ? 0n : maxWithdraw

      const withdrawAmount = remainingAmount <= maxWithdraw ? remainingAmount : maxWithdraw
      result[pool.index] = withdrawAmount
      remainingAmount -= withdrawAmount
    }

    return result
  }

  /** @ignore */
  static calculateStakePoolAmount (
    amount: bigint, // amount to stake
    minStake: bigint, // minimum stake for participation (to be in the set)
    currentPoolBalances: [bigint, bigint], // current stake balances of the pools
    currentUserStakes: [bigint, bigint] // current user stakes in the pools
  ): [bigint, bigint] {
    const [pool1Balance, pool2Balance] = currentPoolBalances
    const [user1Stake, user2Stake] = currentUserStakes

    const totalUserStake = user1Stake + user2Stake + amount
    const idealUserSplit = totalUserStake / 2n
    const result: [bigint, bigint] = [0n, 0n]

    // case: both pools are at or above minStake
    const pool1AboveMin = pool1Balance >= minStake
    const pool2AboveMin = pool2Balance >= minStake

    if (pool1AboveMin && pool2AboveMin) {
      // aim for user balance
      result[0] = idealUserSplit - user1Stake
      result[1] = idealUserSplit - user2Stake
      return result
    }

    // case: one pool is below minStake and one is above
    if (pool1Balance < minStake && pool2Balance >= minStake) {
      const needed = minStake - pool1Balance
      if (amount >= needed) {
        result[0] = needed
        const remaining = amount - needed
        result[0] += remaining / 2n
        result[1] = remaining - remaining / 2n
        return result
      }
    }

    if (pool2Balance < minStake && pool1Balance >= minStake) {
      const needed = minStake - pool2Balance
      if (amount >= needed) {
        result[1] = needed
        const remaining = amount - needed
        result[0] = remaining / 2n
        result[1] += remaining - remaining / 2n
        return result
      }
    }

    // case: both pools are below minStake
    if (!pool1AboveMin && !pool2AboveMin) {
      const needed1 = minStake - pool1Balance
      if (amount <= needed1) {
        result[0] = amount
        return result
      }

      result[0] = needed1
      result[1] = amount - needed1
      return result
    }

    // fallback: split 50/50
    result[0] = amount / 2n
    result[1] = amount - result[0]
    return result
  }
}
