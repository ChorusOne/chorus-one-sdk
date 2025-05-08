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
   * @param params.preferredStrategy - (Optional) The stake allocation strategy. Default is `balanced`.
   * * `balanced` - automatically balances the stake between the two pools based on the current pool balances and user stakes
   * * `split` - splits the stake evenly between the two pools
   * * `single` - stakes to a single pool
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
    preferredStrategy?: 'balanced' | 'split' | 'single'
    referrer?: string
    validUntil?: number
  }): Promise<{ tx: UnsignedTx }> {
    const { validatorAddressPair, delegatorAddress, amount, preferredStrategy, validUntil, referrer } = params

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

    const { minElectionStake, currentPoolBalances, currentUserStakes } = await this.getPoolDataForDelegator(
      delegatorAddress,
      validatorAddresses
    )

    const poolParams = await Promise.all(
      validatorAddresses.map((validatorAddress) => this.getPoolParamsUnformatted({ validatorAddress }))
    )
    const lowestMinStake: bigint = poolParams
      .filter((param) => param.minStake !== 0n)
      .reduce((acc, val) => (val.minStakeTotal < acc ? val.minStakeTotal : acc), poolParams[0].minStakeTotal)
    if (lowestMinStake === 0n) {
      throw new Error('minimum stake for both pools is zero, that does not seem right')
    }

    if (toNano(amount) < lowestMinStake) {
      throw new Error('provided amount is less than the minimum required to stake')
    }

    const selectedStrategy = TonPoolStaker.selectStrategy(
      preferredStrategy,
      toNano(amount),
      validatorAddresses.length,
      lowestMinStake
    )

    const msgs: Message[] = []
    switch (selectedStrategy) {
      case 'single': {
        const poolIndex = TonPoolStaker.selectPool(minElectionStake, currentPoolBalances)
        msgs.push(genStakeMsg(validatorAddressPair[poolIndex], toNano(amount)))
        break
      }

      case 'split': {
        const amounts: [bigint, bigint] = [0n, 0n]
        amounts[0] = toNano(amount) / 2n
        amounts[1] = toNano(amount) - amounts[0]
        msgs.push(genStakeMsg(validatorAddressPair[0], amounts[0]))
        msgs.push(genStakeMsg(validatorAddressPair[1], amounts[1]))
        break
      }

      case 'balanced': {
        const stakeAmountPerPool = TonPoolStaker.calculateStakePoolAmount(
          toNano(amount),
          minElectionStake,
          currentPoolBalances,
          currentUserStakes
        )

        validatorAddresses.forEach((validatorAddress, index) => {
          if (stakeAmountPerPool[index] === 0n) {
            return null
          }
          msgs.push(genStakeMsg(validatorAddress, stakeAmountPerPool[index]))
        })
      }
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
      const { minElectionStake, currentPoolBalances, userMaxUnstakeAmounts } = await this.getPoolDataForDelegator(
        delegatorAddress,
        validatorAddresses
      )

      const unstakeAmountPerPool = TonPoolStaker.calculateUnstakePoolAmount(
        toNano(amount),
        minElectionStake,
        currentPoolBalances,
        userMaxUnstakeAmounts
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

    const data = {
      enabled: response.stack.readBoolean(),
      updatesEnables: response.stack.readBoolean(),
      minStake: response.stack.readBigNumber(),
      depositFee: response.stack.readBigNumber(),
      withdrawFee: response.stack.readBigNumber(),
      poolFee: response.stack.readBigNumber(),
      receiptPrice: response.stack.readBigNumber(),
      minStakeTotal: 0n
    }

    data.minStakeTotal = data.minStake + data.depositFee + data.withdrawFee

    return data
  }

  /** @ignore */
  private async getPoolDataForDelegator (delegatorAddress: string, validatorAddresses: string[]) {
    const [poolStatus, userStake, minElectionStake] = await Promise.all([
      Promise.all(validatorAddresses.map((validatorAddress) => this.getPoolStatus(validatorAddress))),
      Promise.all(validatorAddresses.map((validatorAddress) => this.getStake({ delegatorAddress, validatorAddress }))),
      this.getElectionMinStake()
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

    const userMaxUnstakeAmounts: [bigint, bigint] =
      validatorAddresses.length === 2
        ? [
            toNano(userStake[0].balance) + toNano(userStake[0].pendingDeposit) + toNano(userStake[0].withdraw),
            toNano(userStake[1].balance) + toNano(userStake[1].pendingDeposit) + toNano(userStake[1].withdraw)
          ]
        : [toNano(userStake[0].balance) + toNano(userStake[0].pendingDeposit) + toNano(userStake[0].withdraw), 0n]

    return {
      minElectionStake,
      currentPoolBalances,
      currentUserStakes,
      userMaxUnstakeAmounts
    }
  }

  async getElectionMinStake (): Promise<bigint> {
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
  static selectPool (
    minStake: bigint, // minimum stake for participation (to be in the set)
    currentBalances: [bigint, bigint] // current stake balances of the pools
  ): number {
    const [balancePool1, balancePool2] = currentBalances

    const hasReachedMinStake = (balance: bigint): boolean => balance >= minStake

    // prioritize filling a pool that hasn't reached the minStake
    if (!hasReachedMinStake(balancePool1) && !hasReachedMinStake(balancePool2)) {
      // if neither pool has reached minStake, prioritize the one with the higher balance
      return balancePool1 >= balancePool2 ? 0 : 1
    } else if (!hasReachedMinStake(balancePool1)) {
      return 0 // fill pool 1 to meet minStake
    } else if (!hasReachedMinStake(balancePool2)) {
      return 1 // fill pool 2 to meet minStake
    }

    // both pools have reached minStake, so allocate to the one with the lower balance
    return balancePool1 <= balancePool2 ? 0 : 1
  }

  /** @ignore */
  static selectStrategy (
    preferredStrategy: string | undefined,
    amount: bigint,
    totalValidators: number,
    lowestMinStake: bigint
  ): string {
    const strategy = preferredStrategy || 'balanced'

    if (totalValidators === 0) {
      throw new Error('At least one validator address is required')
    }

    if (totalValidators === 1) {
      return 'single'
    }

    if (['split', 'balanced'].includes(strategy)) {
      const enoughStakeForBothPools = totalValidators > 1 && amount >= 2n * lowestMinStake
      if (enoughStakeForBothPools) {
        return strategy
      }
      return 'single'
    }

    return strategy
  }

  /** @ignore */
  static calculateUnstakePoolAmount (
    amount: bigint, // amount to unstake
    minStake: bigint, // minimum stake for participation (to be in the set)
    currentPoolBalances: [bigint, bigint], // current stake balances of the pools
    userMaxUnstakeAmounts: [bigint, bigint] // maximum user stake that can be unstaked from the pools
  ): [bigint, bigint] {
    const [balancePool1, balancePool2] = currentPoolBalances
    const [maxUnstakeUser1, maxUnstakeUser2] = userMaxUnstakeAmounts

    // check if the requested withdrawal amount exceeds the available user stakes
    const totalUserStake = maxUnstakeUser1 + maxUnstakeUser2
    if (amount > totalUserStake) {
      throw new Error('requested withdrawal amount exceeds available user stakes')
    }

    // check if the pool will remain active after withdrawal
    const willRemainActive = (balance: bigint, withdraw: bigint): boolean => balance - withdraw >= minStake

    // sorting pools based on balance (highest balance first)
    const pools = [
      { index: 0, balance: balancePool1, userMaxUnstake: maxUnstakeUser1 },
      { index: 1, balance: balancePool2, userMaxUnstake: maxUnstakeUser2 }
    ].sort((a, b) => Number(b.balance - a.balance))

    let remainingAmount = amount
    const result: [bigint, bigint] = [0n, 0n]

    for (const pool of pools) {
      if (remainingAmount === 0n) break

      // maximum that can be withdrawn from this pool without deactivating it
      let maxWithdraw = pool.userMaxUnstake
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
    minPoolStakes: [bigint, bigint] // min staked amount per pool
  ): [bigint, bigint] {
    const [poolOneBalance, poolTwoBalance] = currentPoolBalances
    const [minPoolOne, minPoolTwo] = minPoolStakes

    if (amount < minPoolOne || amount < minPoolTwo) {
      throw new Error('amount is less than the minimum required to stake')
    }

    const calculate = (): [bigint, bigint] => {
      const result: [bigint, bigint] = [0n, 0n]

      // case: both pools are at or above minStake
      const poolOneAboveMin = poolOneBalance >= minStake
      const poolTwoAboveMin = poolTwoBalance >= minStake

      // here we know that both pools will get elected therefore
      // we should balance the user stake to equalize the pool balances
      if (poolOneAboveMin && poolTwoAboveMin) {
        const highestStakeI = poolOneBalance > poolTwoBalance ? 0 : 1
        const lowerStakeI = highestStakeI === 1 ? 0 : 1
        const stakedDelta = currentPoolBalances[highestStakeI] - currentPoolBalances[lowerStakeI]

        const remainder = amount - stakedDelta

        // if the amount won't balance two stakes, we add the amount to the
        // lowest stake to fill the gap as much as possible
        if (remainder <= 0n) {
          result[lowerStakeI] = amount
          result[highestStakeI] = 0n
          return result
        }

        // if the remainder is less than min, then spliting it 50/50 will
        // not work. Instead stake all to one pool
        if (remainder < minPoolOne || remainder < minPoolTwo) {
          result[highestStakeI] = 0n
          result[lowerStakeI] = stakedDelta + remainder
          return result
        }

        // now ideal case is to split the remainder 50/50, but if that is not
        // possible due to minPool stake constraints, we need to adjust
        const halfRemainder = remainder / 2n
        if (halfRemainder <= minPoolOne || halfRemainder <= minPoolTwo) {
          if (stakedDelta < minPoolOne || stakedDelta < minPoolTwo) {
            // balancing out wihtout going below minPool is impossible
            // split the stake amount 50/50 instead
            result[highestStakeI] = amount / 2n
            result[lowerStakeI] = amount - result[highestStakeI]
          } else {
            // carry over the remainder to the higher stake pool,
            // because reminder can't be split 50/50 without violating minPool
            // constraint
            result[highestStakeI] = remainder
            result[lowerStakeI] = stakedDelta
          }
          return result
        }

        // here most likely we have enough tokens to blance and split the
        // remainder 50/50
        result[highestStakeI] = remainder / 2n
        result[lowerStakeI] = stakedDelta + remainder - remainder / 2n

        return result
      }

      const poolOneBelowMin = poolOneBalance < minStake && poolTwoBalance >= minStake
      const poolTwoBelowMin = poolTwoBalance < minStake && poolOneBalance >= minStake
      // case: one pool is below minStake and one is above
      if (poolOneBelowMin || poolTwoBelowMin) {
        const needed = [minStake - poolOneBalance, minStake - poolTwoBalance]
        const highestStakeI = poolOneBalance > poolTwoBalance ? 0 : 1
        const lowerStakeI = highestStakeI === 1 ? 0 : 1

        // the pool will become active
        if (needed[lowerStakeI] - amount <= 0) {
          const remaining = amount - needed[highestStakeI]
          result[highestStakeI] = needed[highestStakeI] + remaining / 2n
          result[lowerStakeI] = remaining - remaining / 2n
          return result
        }

        // no chance of filling the pool to become active
        const remaining = amount
        result[lowerStakeI] = remaining / 2n
        result[highestStakeI] = remaining - remaining / 2n

        return result
      }

      // case: both pools are below minStake
      if (!poolOneAboveMin && !poolTwoAboveMin) {
        const needed = [minStake - poolOneBalance, minStake - poolTwoBalance]
        const highestStakeI = poolOneBalance > poolTwoBalance ? 0 : 1
        const lowerStakeI = highestStakeI === 1 ? 0 : 1

        // there is a chance to make both pools active
        if (amount >= needed[0] + needed[1]) {
          const remaining = amount - (needed[0] + needed[1])
          result[0] = needed[0] + remaining / 2n
          result[1] = needed[1] + remaining - remaining / 2n
          return result
        }

        // at least one pool will be active
        if (needed[0] - amount <= 0 || needed[1] - amount <= 0) {
          const remaining = amount - needed[highestStakeI]
          result[highestStakeI] = needed[highestStakeI] + remaining / 2n
          result[lowerStakeI] = remaining - remaining / 2n
          return result
        }

        // no chance of filling both pools to become active
        result[highestStakeI] = amount
        return result
      }

      // fallback: split 50/50
      result[0] = amount / 2n
      result[1] = amount - result[0]

      return result
    }

    const fallback = (result: [bigint, bigint]) => {
      // if both amounts are lower than minPool (0n may be explicit action), something must hve gone wrong
      // attempt to split the amount 50/50 and hope for the best
      if ((result[0] !== 0n && result[0] < minPoolOne) || (result[1] !== 0n && result[1] < minPoolTwo)) {
        result[0] = amount / 2n
        result[1] = amount - result[0]
      }

      return result
    }

    const stakeAmountPerPool: [bigint, bigint] = fallback(calculate())

    // sanity check sum
    if (stakeAmountPerPool.reduce((acc, val) => acc + val, 0n) !== amount) {
      throw new Error('stake amount does not match the requested amount, this should not have happened')
    }

    // sanity check negative values
    if (stakeAmountPerPool.some((stake) => stake < 0n)) {
      throw new Error('stake amount per pool cannot be negative, this should not have happened')
    }

    return stakeAmountPerPool
  }
}
