# Overview

Staking on the Ethereum network involves locking up tokens to support the network's security and operations. In return, stakers earn rewards.

{% hint style="info" %}

The Ethereum blockchain, renowned for its smart contract functionality and vibrant ecosystem, employs the Proof of Stake (PoS) consensus mechanism in its Ethereum 2.0 upgrade. This transition enhances scalability, security, and energy efficiency. By staking ETH, Ethereum's native token, validators maintain the network, secure the blockchain, and incentivize active participation, ensuring the network remains robust and efficient.

{% endhint %}

The **Chorus One SDK** simplifies the staking process on the Ethereum network, providing developers with the tools needed to build, sign, and broadcast staking transactions.

{% hint style="info" %}

### Compatibility Notice

The methods provided in this documentation are compatible with popular Ethereum libraries such as `Ethers` and `viem`. This compatibility ensures that you can seamlessly integrate these methods into your existing Ethereum projects.

{% endhint %}

To enhance efficiency, the SDK leverages [Stakewise V3's](https://docs.stakewise.io/) audited and secure smart contracts. By utilizing a pooling solution, it allows multiple users to combine their stakes, making staking more accessible and beneficial for smaller stakeholders.

This guide will walk you through the fundamentals of staking on Ethereum using the Chorus One SDK.

## Understanding Key Concepts

<details>
<summary>
🏦 Pools: Collective Staking for Enhanced Rewards
</summary>

A pool is where individual stakers combine their resources. This collective approach benefits those who may not have substantial resources or technical knowledge for individual staking. Pools increase the chances of earning rewards by aggregating the staking power of multiple participants. The Chorus One SDK offers a non-custodial pooling solution, enabling users to stake their assets while maintaining control and enjoying the benefits of pooled resources.

</details>
<details>
<summary>
🏰 Vaults: Customized Staking Pools
</summary>

Vaults are isolated staking pools offering a trustless, non-custodial process for ETH deposits, reward distribution, and withdrawals. These pools operate independently, using ETH deposits solely to launch validators for that particular Vault, ensuring any rewards or penalties are confined to it. They provide a customized staking experience enabling owners to define their staking fees, opt for a particular mix of operators, employ a unique MEV strategy and other capabilities. Governed entirely by smart contracts, each Vault caters to the specific needs of its depositors, maintaining the integrity and isolation of each staking experience.

</details>
<details>
<summary>
🪙 Minting osETH: Creating Liquid Staking Tokens
</summary>

Minting osETH involves converting staked ETH in Vaults into liquid staking tokens. This process enables stakers to utilize their assets in the DeFi ecosystem without losing staking rewards. By minting osETH, users can maintain liquidity and flexibility while contributing to network security. The amount of osETH that can be minted is determined by the staked ETH value, current exchange rate, and a 90% minting threshold set by the StakeWise DAO. This ensures that osETH remains overcollateralized, providing robust backing and value stability.

</details>
<details>
<summary>
🔥 Burning osETH: Redeeming Staked ETH
</summary>

Burning osETH is destroying osETH tokens to reclaim the underlying staked ETH. When users wish to unstake their ETH, they must return the minted osETH, which is then burned. This reduces the total supply of osETH and unlocks the corresponding staked ETH. During this process, a 5% commission on the rewards accumulated by osETH is automatically deducted, ensuring the integrity of the staking process. This novel commission structure helps maintain osETH’s value and ensures it remains fully backed by staked ETH.

</details>
<details>
<summary>
📤 Unstaking: Reclaiming Your ETH
</summary>

Unstaking allows users to withdraw their staked ETH from a Vault, stopping the accrual of staking rewards and regaining control over their assets. The process begins with the user initiating an unstaking request, which uses available unbonded ETH in the Vault to fulfill it. If there isn’t enough unbonded ETH, a sufficient number of Vault validators will be exited to provide the necessary ETH. This process can take time, so users are placed in an exit queue until the validators are exited. While in the exit queue, users continue to earn staking rewards. Once the exit is complete, users can claim their unstaked ETH at any time.

</details>

## Setting Up the Staker

To get started with staking on the Ethereum network using the Chorus One SDK, you will first need to initialize the SDK.

- **Note:** For testing purposes, we will use the Holesky testnet.

First, create an instance of `EthereumStaker` with the necessary configuration:

```javascript
import { EthereumStaker } from '@chorus-one/ethereum'

const staker = new EthereumStaker({
  network: 'holesky',
  rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com'
})
```

**Configuration Parameters**:

- **network**: The Ethereum network to connect to. It can be `mainnet` or `holesky`.
- **rpcUrl**: (Optional) The URL of the Ethereum network RPC endpoint. This is where the SDK will connect to interact with the network. If not provided, the SDK will use the public RPC endpoint for the specified network.

---

## Initializing the Staker

After configuring the `EthereumStaker`, initialize it to prepare for staking operations.

This can be done via the following input:

```javascript
await staker.init()
```

The `init` method establishes a connection with the configured RPC endpoint and prepares the staker for operations such as building and broadcasting transactions.

---

## Building Transactions

Once the staker is set up, you can start building transactions for staking operations.

The `EthereumStaker` class provides methods to build transactions for staking, unstaking, merging and splitting stakes, and creating stake accounts.

- You can learn more about these methods in the [Methods](methods.md) section.

**Example of building a staking transaction:**

```javascript
const { tx } = await staker.buildStakeTx({
  delegatorAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  validatorAddress: '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  amount: '1' // 1 ETH
})
```

{% hint style="warning" %}

**Ensuring Correct Amount Format for Staking**

The `amount` parameter must be a string representing the amount of ETH to deposit. For example, `'1'` represents 1 ETH.

If you have the amount as a `bigint`, convert it to a string using the `formatEther` function from `viem`. Example:

```typescript
import { formatEther } from 'viem'

const amountBigInt = 10000000000000000n // 0.01 ETH
const amountToStake = formatEther(amountBigInt)

console.log(amountToStake) // "0.01"
```

This ensures the `amountToStake` parameter is in the correct format for the staking transaction function.

{% endhint %}

---

## Getting the Validator Address provided by Chorus One

The `@chorus-one/ethereum` module includes a list of Chorus One validators for the Ethereum-compatible chains, organized by network(ethereum or holesky) and vault type. You can use these addresses when building transactions.

### Vault Types

- **MEV Max Vault (mevMaxVault)**: This vault employs Chorus One’s proprietary [MEV Research](https://chorus.one/categories/mev) to maximize staking returns by optimizing transaction ordering.

- **Obol Distributed Validator Technology (obolDvVault)**: This vault uses [Obol's DVT](https://docs.obol.org/docs/int/Overview) to enhance resilience and decentralization of Ethereum staking by distributing validator duties across multiple nodes.

```javascript
import { CHORUS_ONE_ETHEREUM_VALIDATORS } from '@chorus-one/ethereum'

const validatorAddress = CHORUS_ONE_ETHEREUM_VALIDATORS.holesky.mevMaxVault
console.log(vaultAddress) // '0x95d0db03d59658e1af0d977ecfe142f178930ac5'
```

---

## Signing the Transaction

Once the transaction is built, you can sign that transaction using your own signing solution e.g.:

```javascript
const signedTx = await yourWalletClient.signTransaction(tx)
```

When using your own signer, you will need to calculate the transaction fees yourself before signing.

Additionally, you can use the Chorus One SDK to sign transactions using Fireblocks, mnemonic or other methods.

- For detailed information on setting up and configuring these options, please refer to the [What is a Signer?](../../signers-explained/what-is-a-signer.md) section.

{% tabs %}

{% tab title="Using wagmi/Viem for Signing" %}
By integrating wagmi, you can take advantage of its lightweight developer-friendly wallet client capabilities to sign transactions on the Ethereum network:

```javascript
import { useWalletClient } from 'wagmi'

const { data: walletClient } = useWalletClient()

const request = await walletClient.prepareTransactionRequest(tx)

// Sign and send the transaction
const hash = await walletClient.sendTransaction(request)
```

For more information please refer to the [Viem Documentation](https://viem.sh/)

{% endtab %}

{% tab title="Using Ethers for Signing" %}

By integrating Ethers, you can use its widely adopted and feature-rich library for signing transactions on the Ethereum network:

```javascript
import { BrowserProvider } from 'ethers'

const provider = new BrowserProvider(window.ethereum)
const signer = await provider.getSigner()

const feeData = await provider.getFeeData()
const gasLimit = await provider.estimateGas(stakeTx2)

// Sign and send the transaction
const { hash } = await signer.sendTransaction({
  ...stakeTx2,
  // Optional: Set the gas limit and fees
  gasLimit: gasLimit,
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
})
```

For more information please refer to the [Ethers Documentation](https://docs.ethers.org/)

{% endtab %}

{% tab title="Using Fireblocks for Signing" %}

By integrating Fireblocks, you can leverage its robust security features to sign transactions on the Ethereum network. To set up Fireblocks, you will need to provide the necessary API key, secret key, and vault ID:

```javascript
import { EthereumStaker } from '@chorus-one/ethereum'
import { FireblocksSigner } from '@chorus-one/signer-fireblocks'

const signer = new FireblocksSigner({
  apiSecretKey: 'your-api-secret-key',
  apiKey: 'your-api-key',
  vaultName: 'your-vault-name',
  assetId: 'ETH_TEST6',
  addressDerivationFn: EthereumStaker.getAddressDerivationFn()
})

await signer.init()

const { signedTx } = await staker.sign({
  signer,
  signerAddress: '0x70aEe8a9099ebADB186C2D530F72CF5dC7FE6B30',
  tx,
  fees: {
    baseFeeMultiplier: 2, // Optional: Multiplier for the base fee per gas
    defaultPriorityFee: '2' // Optional: Override for the maxPriorityFeePerGas
  }
})
```

### Configuring Transaction Fees

When signing transactions, you can optionally configure the fees to manage cost and priority. The `fees` parameter allows you to specify a `baseFeeMultiplier` and a `defaultPriorityFee`.

- **`baseFeeMultiplier`**: (Optional) This multiplier helps manage fee fluctuations by adjusting the base fee per gas from the latest block. For example, if the `baseFeeMultiplier` is set to 2, the final `maxFeePerGas` will be 2 times the base fee. The default value is 1.2.

- **`defaultPriorityFee`**: (Optional) This value allows you to override the `maxPriorityFeePerGas` estimated by the RPC. You can specify a fixed value to ensure that your transaction has a certain priority. By default, the `maxPriorityFeePerGas` is calculated by the RPC.

For more information please refer to the [Signing with Fireblocks](../../signers-explained/fireblocks.md)

{% endtab %}

{% endtabs %}

---

## Broadcasting the Transaction

After signing the transaction, you will need to broadcast it to the network. You can do this using the `broadcast` method:

```javascript
const { txHash } = await staker.broadcast({ signedTx })
```

And now you can track the transaction status:

```javascript
const { status, receipt } = await staker.getTxStatus({ txHash })

console.log(status) // 'success'
```

---

## Next Steps

In this section you learned how to set up the Chorus One SDK for the Ethereum network using the Holesky testnet, which included how to build staking transactions, sign, broadcast, and track them.

- To learn more about the available methods on `EthereumStaker` continue to the [Methods](methods.md) section.

## Further Reading

- [EthereumStaker API Reference](../../docs/classes/ethereum_src.EthereumStaker.md)
- [What is a Signer?](../../signers-explained/what-is-a-signer.md)
