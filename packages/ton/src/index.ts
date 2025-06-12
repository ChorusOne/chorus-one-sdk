export { TonSingleNominatorPoolStaker } from './TonSingleNominatorPoolStaker'
export { TonNominatorPoolStaker } from './TonNominatorPoolStaker'
export { TonPoolStaker } from './TonPoolStaker'

export { CHORUS_ONE_TON_VALIDATORS } from './constants'

export {
  TonNetworkConfig,
  TonSigningData,
  UnsignedTx,
  SignedTx,
  PoolData,
  AddressDerivationConfig,
  NominatorInfo,
  TonTxStatus
} from './types.d'

// easy staker classes
import { makeEasyStaker } from './FluentStaker'
import { TonPoolStaker } from './TonPoolStaker'
import { TonNominatorPoolStaker } from './TonNominatorPoolStaker'
import { TonSingleNominatorPoolStaker } from './TonSingleNominatorPoolStaker'

export const EasyTonPoolStaker = makeEasyStaker(TonPoolStaker)
export const EasyTonNominatorPoolStaker = makeEasyStaker(TonNominatorPoolStaker)
export const EasyTonSingleNominatorPoolStaker = makeEasyStaker(TonSingleNominatorPoolStaker)
