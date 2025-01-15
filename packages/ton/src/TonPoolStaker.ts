import { Address, beginCell, fromNano, toNano, Slice, Builder, DictionaryValue, Dictionary, Cell, configParse17 } from '@ton/ton'
import { defaultValidUntil, getDefaultGas, getRandomQueryId, TonBaseStaker } from './TonBaseStaker'
import { UnsignedTx, Election, FrozenSet, PoolStatus, GetPoolAddressForStakeResponse } from './types'

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
    const validatorAddress = (await this.getPoolAddressForStake({ validatorAddressPair })).SelectedPoolAddress

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
  async getPoolAddressForStake (params: { validatorAddressPair: [string, string] }): Promise<GetPoolAddressForStakeResponse> {
    const { validatorAddressPair } = params
    const client = this.getClient()

    // fetch required data:
    // 1. stake balance for both pools
    // 2. stake limits from the onchain config
    // 3. last election data to get the minimum stake for participation
    const [ poolOneStatus, poolTwoStatus, elections, stakeLimitsCfgCell ] = await Promise.all([
        this.getPoolStatus(validatorAddressPair[0]),
        this.getPoolStatus(validatorAddressPair[1]),

        // elector contract address
        this.getPastElections('Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF'),

        // see full config: https://tonviewer.com/config#17
        client.getConfigParam(17)
    ])

    const [ poolOneBalance, poolTwoBalance ] = [poolOneStatus.Balance, poolTwoStatus.Balance]
    const stakeLimitsCfg = configParse17(stakeLimitsCfgCell.beginParse())
    const maxStake = stakeLimitsCfg.maxStake

    // simple sanity validation
    if (elections.length == 0) {
        throw new Error('No elections found')
    }

    if (stakeLimitsCfg.minStake == BigInt(0)) {
        throw new Error('Minimum stake is 0, that is not expected')
    }

    // iterate lastElection.frozen and find the lowest validator stake
    const lastElection = elections[0]
    const values = Array.from(lastElection.frozen.values())
    const minStake = values.reduce((min, p) => p.stake < min ? p.stake : min, values[0].stake)

    const selectedPoolIndex = TonPoolStaker.selectPool(minStake, maxStake, [poolOneBalance, poolTwoBalance])

    return {
        SelectedPoolAddress: validatorAddressPair[selectedPoolIndex],
        MinStake: minStake,
        MaxStake: maxStake,
        PoolStakes: [poolOneBalance, poolTwoBalance]
    }
  }

  async getPoolStatus (validatorAddress: string): Promise<PoolStatus> {
    const client = this.getClient()
    const provider = client.provider(Address.parse(validatorAddress))
    const res = await provider.get('get_pool_status', []);

    return {
      Balance: res.stack.readBigNumber(),
      BalanceSent: res.stack.readBigNumber(),
      BalancePendingDeposits: res.stack.readBigNumber(),
      BalancePendingWithdrawals: res.stack.readBigNumber(),
      BalanceWithdraw: res.stack.readBigNumber()
    }
  }

  async getPastElections (electorContractAddress: string): Promise<Election[]> {
    const client = this.getClient()
    const provider = client.provider(Address.parse(electorContractAddress))
    const res = await provider.get('past_elections', []);

    const FrozenDictValue: DictionaryValue<FrozenSet> = {
        serialize (_src: FrozenSet, _builder: Builder) {
            throw Error("not implemented");
        },
        parse (src: Slice): FrozenSet {
            const address = new Address(-1, src.loadBuffer(32));
            const weight = src.loadUintBig(64);
            const stake = src.loadCoins();
            return { address, weight, stake };
        }
    };

    // NOTE: In ideal case we would call `res.stack.readLispList()` however the library does not handle 'list' type well
    // and exits with an error. This is alternative way to get election data out of the 'list' type.
    const root = res.stack.readTuple()
    const elections: Election[] = [];

    while (root.remaining > 0) {
        const electionsEntry = root.pop()
        const id = electionsEntry[0]
        const unfreezeAt = electionsEntry[1]
        const stakeHeld = electionsEntry[2]
        const validatorSetHash = electionsEntry[3]
        const frozenDict: Cell = electionsEntry[4]
        const totalStake = electionsEntry[5]
        const bonuses = electionsEntry[6]
        const frozen: Map<string, FrozenSet> = new Map();

        const frozenData = frozenDict.beginParse().loadDictDirect(Dictionary.Keys.Buffer(32), FrozenDictValue);
        for (const [key, value] of frozenData) {
            frozen.set(BigInt("0x" + key.toString("hex")).toString(10), { address: value["address"], weight: value["weight"], stake: value["stake"] });
        }
        elections.push({ id, unfreezeAt, stakeHeld, validatorSetHash, totalStake, bonuses, frozen });
    }

    // return elections sorted by id (bigint) in descending order
    return elections.sort((a, b) => (a.id > b.id ? -1 : 1));
  }

  /** @ignore */
  static selectPool (
      minStake: bigint, // minimum stake for participation (to be in the set)
      maxStake: bigint, // maximum allowes stake per validator
      currentBalances: [bigint, bigint] // current stake balances of the pools
  ): number {
      const [balancePool1, balancePool2] = currentBalances;

      const hasReachedMinStake = (balance: bigint): boolean => balance >= minStake;
      const hasReachedMaxStake = (balance: bigint): boolean => balance >= maxStake;

      // prioritize filling a pool that hasn't reached the minStake
      if (!hasReachedMinStake(balancePool1) && !hasReachedMinStake(balancePool2)) {
          // if neither pool has reached minStake, prioritize the one with the higher balance
          return balancePool1 >= balancePool2 ? 0 : 1;
      } else if (!hasReachedMinStake(balancePool1)) {
          return 0; // fill pool 1 to meet minStake
      } else if (!hasReachedMinStake(balancePool2)) {
          return 1; // fill pool 2 to meet minStake
      }

      // both pools have reached minStake, balance them until they reach maxStake
      if (!hasReachedMaxStake(balancePool1) && !hasReachedMaxStake(balancePool2)) {
          // distribute to balance the pools
          return balancePool1 <= balancePool2 ? 0 : 1;
      } else if (!hasReachedMaxStake(balancePool1)) {
          return 0; // add to pool 1 until it reaches maxStake
      } else if (!hasReachedMaxStake(balancePool2)) {
          return 1; // add to pool 2 until it reaches maxStake
      }

      // if both pools have reached maxStake, no more staking is allowed
      throw new Error("Both pools have reached their maximum stake limits");
  }
}
