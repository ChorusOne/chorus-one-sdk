import type { Address, Hex } from 'viem'
import { POLYGON_STAKING_TOKEN_ADDRESS, POLYGON_STAKE_MANAGER_ADDRESS } from '../../src/constants'

export const TEST_ADDRESS: Address = '0x1234567890123456789012345678901234567890'
export const TEST_VALIDATOR_SHARE: Address = '0xaBcDef0123456789AbCdEf0123456789aBcDeF01'

export const EXPECTED_APPROVE_TX = {
  amount: '100',
  expected: {
    to: POLYGON_STAKING_TOKEN_ADDRESS as Address,
    // approve(address spender, uint256 amount) with spender = POLYGON_STAKE_MANAGER_ADDRESS (0x5e3e...), amount = 100e18
    data: '0x095ea7b30000000000000000000000005e3ef299fddf15eaa0432e6e66473ace8c13d9080000000000000000000000000000000000000000000000056bc75e2d63100000' as Hex,
    value: 0n
  }
}

export const EXPECTED_APPROVE_MAX_TX = {
  amount: 'max',
  expected: {
    to: POLYGON_STAKING_TOKEN_ADDRESS as Address,
    // approve(address spender, uint256 amount) with spender = POLYGON_STAKE_MANAGER_ADDRESS, amount = maxUint256
    data: '0x095ea7b30000000000000000000000005e3ef299fddf15eaa0432e6e66473ace8c13d908ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as Hex,
    value: 0n
  }
}
