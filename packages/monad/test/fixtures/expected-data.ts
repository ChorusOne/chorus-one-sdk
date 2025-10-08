import type { Address, Hex } from 'viem'

/**
 * Expected encoded data for transaction builders
 * Generated from running the SDK functions and verified manually
 */

export const STAKING_CONTRACT_ADDRESS: Address = '0x0000000000000000000000000000000000001000'

export const TEST_ADDRESS: Address = '0x1234567890123456789012345678901234567890'

export const EXPECTED_DELEGATE_TX = {
  validatorId: 1,
  amount: '100',
  expected: {
    to: STAKING_CONTRACT_ADDRESS as Address,
    // delegate(uint64 validatorId) with validatorId = 1
    // Function selector: 0x84994fec
    // Padded validatorId: 0x0000000000000000000000000000000000000000000000000000000000000001
    data: '0x84994fec0000000000000000000000000000000000000000000000000000000000000001' as Hex,
    value: 100000000000000000000n // 100 MON in wei
  }
}

export const EXPECTED_DELEGATE_TX_LARGE = {
  validatorId: 999,
  amount: '0.5',
  expected: {
    to: STAKING_CONTRACT_ADDRESS as Address,
    // delegate(uint64 validatorId) with validatorId = 999
    // Function selector: 0x84994fec
    // Padded validatorId: 0x00000000000000000000000000000000000000000000000000000000000003e7
    data: '0x84994fec00000000000000000000000000000000000000000000000000000000000003e7' as Hex,
    value: 500000000000000000n // 0.5 MON in wei
  }
}
