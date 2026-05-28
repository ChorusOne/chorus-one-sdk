/**
 * End-to-end Attestant -> Figment validation on Hoodi.
 *
 * Calls the Attestant Hoodi API LIVE to provision a new validator, then
 * forwards the returned deposit data through Figment's batch depositor on
 * Hoodi as a real transaction:
 *
 *   Attestant Hoodi API              https://client-hoodi.attestant.io
 *   FigmentEth2DepositorV2 (Hoodi)   0x7ac74cb69104cea773cc3154d47c930ca6462fe8
 *   Official deposit contract        0x00000000219ab540356cBB839Cbe05303d7705Fa
 *
 * The Hoodi Figment contract is byte-for-byte identical to the Mainnet
 * deployment at 0x8B0d88B8Be3C15D746Feb0B1f18c883c03B6Aa62, so the calldata
 * encoding is the same.
 *
 * What this script DOES prove (once a broadcast succeeds + the validator
 * activates on the consensus layer):
 *   - The Attestant Hoodi API returns data whose BLS signature is valid for
 *     Hoodi's deposit domain.
 *   - Figment's depositor accepts that data and forwards it to the official
 *     deposit contract.
 *   - Attestant's infrastructure picks up the new validator and starts
 *     attesting for its pubkey.
 *
 * What this script DOES NOT do:
 *   - It does not, by itself, prove activation. A successful tx only proves
 *     the deposit was accepted. Activation must be observed off-chain at
 *     https://hoodi.beaconcha.in/validator/<pubkey>.
 *
 * WEI vs GWEI gotcha:
 *   Figment reads the last `uint256[]` parameter as GWEI. Use the raw
 *   per-validator `amount` field from Attestant (already gwei) AS-IS in
 *   `amounts_gwei`, and send `value = sum(amounts_gwei[i]) * 1e9` wei.
 *   Never byte-copy `batch_transactions.Attestant` to Figment — it would
 *   revert with AmountTooHigh.
 *
 * Env vars:
 *   ATTESTANT_HOODI_TOKEN   bearer token for the Attestant Hoodi API (required)
 *   ATTESTANT_SUBACCOUNT    Attestant subaccount name (default: Core)
 *   VALIDATOR_NAME          name for the new validator
 *                           (default: hoodi-e2e-<cred>-<unix-ts>)
 *   CRED_TYPE               "0x01" or "0x02" (default: 0x01)
 *                           0x02 -> compounding:true (compounding creds)
 *   AMOUNT_ETH              deposit amount in whole ETH (default: 32)
 *   HOODI_RPC               Hoodi RPC URL
 *                           (default: https://rpc.hoodi.ethpandaops.io)
 *   HOODI_PK                0x-prefixed private key of the funded wallet
 *                           (preferred — takes priority over mnemonic)
 *   TEST_HOODI_MNEMONIC     mnemonic phrase, used if HOODI_PK is unset
 *                           (default account: m/44'/60'/0'/0/0)
 *   BROADCAST               set to "1" to actually broadcast. Anything else =
 *                           DRY RUN (prints calldata, value, balance check; no
 *                           tx sent, no validator provisioned).
 *
 * Run from packages/ethereum (loading repo-root .env into the shell):
 *
 *   set -a; source ../../.env; set +a
 *
 *   # DRY RUN — does not call Attestant, does not broadcast:
 *   ATTESTANT_HOODI_TOKEN=... CRED_TYPE=0x01 \
 *     npx tsx scripts/validate-attestant-end-to-end.ts
 *
 *   # BROADCAST for real (provisions an Attestant validator + sends a tx):
 *   ATTESTANT_HOODI_TOKEN=... CRED_TYPE=0x01 BROADCAST=1 \
 *     npx tsx scripts/validate-attestant-end-to-end.ts
 *
 *   # Same for 0x02 (compounding):
 *   ATTESTANT_HOODI_TOKEN=... CRED_TYPE=0x02 BROADCAST=1 \
 *     npx tsx scripts/validate-attestant-end-to-end.ts
 */

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  http,
  parseAbi,
  parseAbiItem,
  toEventSelector,
  type Account,
  type Address,
  type Hex
} from 'viem'
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'
import { hoodi } from 'viem/chains'

const ATTESTANT_BASE = 'https://client-hoodi.attestant.io'
const RPC = process.env.HOODI_RPC || 'https://rpc.hoodi.ethpandaops.io'
const CRED_TYPE = (process.env.CRED_TYPE || '0x01') as '0x01' | '0x02'
const AMOUNT_ETH = process.env.AMOUNT_ETH || '32'
const SUBACCOUNT = process.env.ATTESTANT_SUBACCOUNT || 'Core'
const VALIDATOR_NAME =
  process.env.VALIDATOR_NAME ||
  `hoodi-e2e-${CRED_TYPE.replace('0x', '')}-${Math.floor(Date.now() / 1000)}`
const BROADCAST = process.env.BROADCAST === '1'

const FIGMENT_DEPOSITOR: Address = '0x7ac74cb69104cea773cc3154d47c930ca6462fe8'
const OFFICIAL_DEPOSIT: Address = '0x00000000219ab540356cBB839Cbe05303d7705Fa'

const figmentAbi = parseAbi([
  'function deposit(bytes[] pubkeys, bytes[] withdrawal_credentials, bytes[] signatures, bytes32[] deposit_data_roots, uint256[] amounts_gwei) payable',
  'function paused() view returns (bool)',
  'event BatchDepositEvent(address from, uint256 nodesAmount, uint256 totalAmount)'
])

const batchDepositEvent = parseAbiItem(
  'event BatchDepositEvent(address from, uint256 nodesAmount, uint256 totalAmount)'
)
const BATCH_DEPOSIT_TOPIC = toEventSelector(batchDepositEvent)

interface AttestantCreatedValidator {
  id: string
  pubkey: Hex
  name: string
  amount: string
  withdrawal_credentials: Hex
  deposit_message_root: Hex
  deposit_data_root: Hex
  fork_version: Hex
  signature: Hex
  transaction_data: Hex
  version: string
}

interface AttestantCreateResponse {
  validators: AttestantCreatedValidator[]
  batch_transactions: Record<string, Hex>
}

let passed = 0
let failed = 0
const failures: string[] = []

function pass (name: string, detail?: string): void {
  passed++
  console.log(`  [PASS] ${name}${detail ? `  (${detail})` : ''}`)
}

function fail (name: string, reason: string): void {
  failed++
  failures.push(`${name}: ${reason}`)
  console.log(`  [FAIL] ${name}  -- ${reason}`)
}

function check (name: string, ok: boolean, detail?: string): void {
  if (ok) pass(name, detail)
  else fail(name, detail ?? 'assertion failed')
}

function section (title: string): void {
  console.log(`\n=== ${title} ===`)
}

function short (hex: string, head = 12, tail = 8): string {
  return hex.length > head + tail + 1 ? `${hex.slice(0, head)}…${hex.slice(-tail)}` : hex
}

function resolveAccount (): Account {
  if (process.env.HOODI_PK) {
    return privateKeyToAccount(process.env.HOODI_PK as Hex)
  }
  if (process.env.TEST_HOODI_MNEMONIC) {
    return mnemonicToAccount(process.env.TEST_HOODI_MNEMONIC)
  }
  throw new Error(
    'No signing material: set HOODI_PK or TEST_HOODI_MNEMONIC ' +
      '(repo-root .env has TEST_HOODI_MNEMONIC by default — run: set -a; source ../../.env; set +a)'
  )
}

/**
 * Provisions a new Attestant validator via the Hoodi API and returns the
 * deposit data needed to broadcast it on-chain.
 *
 * IMPORTANT: this call has a side effect. The validator is created on
 * Attestant's side regardless of whether we later broadcast a deposit for
 * it. Only call this when BROADCAST=1 so dry runs stay idempotent.
 */
async function provisionAttestantValidator (): Promise<AttestantCreateResponse> {
  const token = process.env.ATTESTANT_HOODI_TOKEN
  if (!token) {
    throw new Error('ATTESTANT_HOODI_TOKEN is required for live API calls')
  }
  if (CRED_TYPE !== '0x01' && CRED_TYPE !== '0x02') {
    throw new Error(`CRED_TYPE must be "0x01" or "0x02" (got "${CRED_TYPE}")`)
  }

  const body: Record<string, unknown> = {
    name: VALIDATOR_NAME,
    subaccount: SUBACCOUNT,
    amount: AMOUNT_ETH
  }
  if (CRED_TYPE === '0x02') {
    body.compounding = true
  }

  const resp = await fetch(`${ATTESTANT_BASE}/v1/eth/validators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const text = await resp.text()
  if (!resp.ok) {
    throw new Error(`Attestant POST /v1/eth/validators ${resp.status}: ${text}`)
  }
  const data = JSON.parse(text) as AttestantCreateResponse
  if (!Array.isArray(data.validators) || data.validators.length === 0) {
    throw new Error(`Attestant returned no validators: ${text.slice(0, 400)}`)
  }
  return data
}

async function main (): Promise<void> {
  console.log(`Mode        : ${BROADCAST ? 'BROADCAST (provisions + sends real tx)' : 'DRY RUN'}`)
  console.log(`Hoodi RPC   : ${RPC}`)
  console.log(`Attestant   : ${ATTESTANT_BASE}`)
  console.log(`Figment     : ${FIGMENT_DEPOSITOR}  (Hoodi)`)
  console.log(`Cred type   : ${CRED_TYPE}`)
  console.log(`Amount      : ${AMOUNT_ETH} ETH`)
  console.log(`Name        : ${VALIDATOR_NAME}`)
  console.log(`Subaccount  : ${SUBACCOUNT}`)
  console.log('='.repeat(72))

  // ----- 1. Hoodi connectivity / Figment sanity (always safe to run) -----
  section('1. Hoodi sanity')
  const client = createPublicClient({ chain: hoodi, transport: http(RPC) })
  const tip = await client.getBlockNumber()
  const code = await client.getCode({ address: FIGMENT_DEPOSITOR })
  check(
    'Figment contract is deployed on Hoodi',
    !!code && code.length > 2,
    `${code?.length ?? 0} hex chars at block ${tip}`
  )
  const paused = await client.readContract({
    address: FIGMENT_DEPOSITOR,
    abi: figmentAbi,
    functionName: 'paused'
  })
  check('Figment is not paused on Hoodi', paused === false, `${paused}`)

  // ----- 2. Resolve the signing wallet and check balance -----
  section('2. Resolve signer and check Hoodi balance')
  const account = resolveAccount()
  console.log(`  wallet address: ${account.address}`)
  const balance = await client.getBalance({ address: account.address })
  console.log(`  wallet balance: ${balance} wei  (= ${Number(balance) / 1e18} ETH)`)
  const expectedDepositWei = BigInt(AMOUNT_ETH) * 10n ** 18n
  const gasHeadroom = 10n ** 17n // ~0.1 ETH
  const required = expectedDepositWei + gasHeadroom
  check(
    `wallet has >= ${AMOUNT_ETH} ETH deposit + 0.1 ETH gas`,
    balance >= required,
    `need ${required} wei, have ${balance} wei`
  )

  // Abort early if pre-checks failed — never provision an Attestant validator
  // or broadcast against bad state.
  if (failed > 0) {
    console.log('\n  Aborting before any side-effecting calls (Attestant / chain).')
    summarize()
    return
  }

  // Dry-run stops here: no API call, no broadcast.
  if (!BROADCAST) {
    section('3. DRY RUN — skipping Attestant API call and broadcast')
    console.log('  Re-run with BROADCAST=1 to provision a validator and send the deposit tx.')
    summarize()
    return
  }

  // ----- 3. LIVE: provision a validator via the Attestant Hoodi API -----
  section('3. Provision validator via Attestant Hoodi API (LIVE)')
  const res = await provisionAttestantValidator()
  for (const v of res.validators) {
    console.log(`  - id=${v.id} name="${v.name}" amount=${v.amount} gwei`)
    console.log(`    pubkey=${v.pubkey}`)
    console.log(`    wc    =${v.withdrawal_credentials}`)
    console.log(`    sig   =${short(v.signature)}`)
    console.log(`    root  =${v.deposit_data_root}`)
  }
  // Sanity: returned creds prefix matches what we asked for
  const expectedWcPrefix = CRED_TYPE === '0x01' ? '0x01' : '0x02'
  const allMatch = res.validators.every((v) =>
    v.withdrawal_credentials.toLowerCase().startsWith(expectedWcPrefix)
  )
  check(`returned withdrawal_credentials start with ${expectedWcPrefix}`, allMatch)
  // Sanity: amount matches the requested ETH amount
  const expectedGwei = BigInt(AMOUNT_ETH) * 10n ** 9n
  const amountsOk = res.validators.every((v) => BigInt(v.amount) === expectedGwei)
  check(`returned amounts == ${AMOUNT_ETH} ETH (gwei)`, amountsOk)

  // ----- 4. Build Figment calldata from raw API fields, AS-IS gwei -----
  section('4. Build Figment-ABI calldata from Attestant fields')
  const pubkeys = res.validators.map((v) => v.pubkey)
  const wcs = res.validators.map((v) => v.withdrawal_credentials)
  const sigs = res.validators.map((v) => v.signature)
  const roots = res.validators.map((v) => v.deposit_data_root)
  const amountsGwei = res.validators.map((v) => BigInt(v.amount))
  const totalGwei = amountsGwei.reduce((a, x) => a + x, 0n)
  const totalWei = totalGwei * 1_000_000_000n

  const calldata = encodeFunctionData({
    abi: figmentAbi,
    functionName: 'deposit',
    args: [pubkeys, wcs, sigs, roots, amountsGwei]
  })
  console.log(`  calldata length: ${calldata.length} hex chars`)
  console.log(`  selector:        ${calldata.slice(0, 10)}`)
  console.log(`  msg.value:       ${totalWei} wei  (= ${Number(totalWei) / 1e18} ETH)`)
  check('calldata starts with 0xc09bb1db (Figment deposit selector)', calldata.startsWith('0xc09bb1db'))

  // Recheck balance now that we know the exact totalWei from the API response.
  const balanceNow = await client.getBalance({ address: account.address })
  check(
    `wallet still has >= totalWei (${Number(totalWei) / 1e18} ETH) + 0.1 ETH gas`,
    balanceNow >= totalWei + gasHeadroom,
    `need ${totalWei + gasHeadroom} wei, have ${balanceNow} wei`
  )
  if (failed > 0) {
    console.log('\n  Refusing to broadcast: post-provision checks failed.')
    console.log('  Note: Attestant validator(s) were provisioned but no deposit was sent.')
    for (const v of res.validators) {
      console.log(`    https://hoodi.beaconcha.in/validator/${v.pubkey}`)
    }
    summarize()
    return
  }

  // ----- 5. Broadcast the deposit on Hoodi -----
  section('5. Broadcast deposit on Hoodi')
  const wallet = createWalletClient({ chain: hoodi, transport: http(RPC), account })
  let txHash: Hex
  try {
    txHash = await wallet.sendTransaction({
      to: FIGMENT_DEPOSITOR,
      data: calldata,
      value: totalWei,
      gas: 5_000_000n
    })
    pass('tx broadcast', txHash)
  } catch (e) {
    fail('tx broadcast', (e as Error).message.split('\n')[0])
    summarize()
    return
  }

  const receipt = await client.waitForTransactionReceipt({ hash: txHash })
  check('receipt.status == "success"', receipt.status === 'success', receipt.status)
  console.log(`  block:    ${receipt.blockNumber}`)
  console.log(`  gas used: ${receipt.gasUsed}`)
  console.log(`  logs:     ${receipt.logs.length}`)
  console.log(`  explorer: https://hoodi.etherscan.io/tx/${txHash}`)

  // ----- 6. Parse and verify BatchDepositEvent -----
  section('6. Verify BatchDepositEvent fired with expected values')
  let found = false
  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !== FIGMENT_DEPOSITOR.toLowerCase() ||
      log.topics[0] !== BATCH_DEPOSIT_TOPIC
    ) {
      continue
    }
    found = true
    const decoded = decodeEventLog({ abi: figmentAbi, data: log.data, topics: log.topics })
    const { from, nodesAmount, totalAmount } = decoded.args as {
      from: Address
      nodesAmount: bigint
      totalAmount: bigint
    }
    console.log(`  BatchDepositEvent.from         = ${from}`)
    console.log(`  BatchDepositEvent.nodesAmount  = ${nodesAmount}`)
    console.log(`  BatchDepositEvent.totalAmount  = ${totalAmount} wei  (= ${Number(totalAmount) / 1e18} ETH)`)
    check(
      'BatchDepositEvent.from == our wallet',
      from.toLowerCase() === account.address.toLowerCase()
    )
    check(
      'BatchDepositEvent.nodesAmount == validators.length',
      nodesAmount === BigInt(res.validators.length)
    )
    check('BatchDepositEvent.totalAmount == sum(amounts_gwei) * 1e9', totalAmount === totalWei)
  }
  check('Figment emitted BatchDepositEvent', found)

  // ----- 7. Verify inner DepositEvent from the official deposit contract -----
  section('7. Verify inner DepositEvent emitted by the official deposit contract')
  let innerCount = 0
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === OFFICIAL_DEPOSIT.toLowerCase()) innerCount++
  }
  check(
    'inner deposit contract log count == validators.length',
    innerCount === res.validators.length,
    `${innerCount} log(s)`
  )

  // ----- 8. Next steps: track activation off-chain -----
  section('8. Off-chain follow-up')
  console.log('  Activation cannot be proven from the receipt alone. Watch each')
  console.log('  validator pubkey transition from deposited -> pending_queued ->')
  console.log('  active_ongoing, and observe attestations from Attestant\'s infra:')
  for (const v of res.validators) {
    console.log(`    https://hoodi.beaconcha.in/validator/${v.pubkey}`)
  }

  summarize()
}

function summarize (): void {
  console.log('\n' + '='.repeat(72))
  console.log(`Total: ${passed + failed}   Passed: ${passed}   Failed: ${failed}`)
  if (failed > 0) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  - ${f}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('end-to-end error:', e)
  process.exit(2)
})
