---
description: >-
  An introduction to Vouch and Dirk — the open-source Ethereum validator
  infrastructure that powers Bitwise Onchain Solutions' institutional staking.
---

# Vouch & Dirk: The Infrastructure Behind ETH Staking

<!-- NOTE: This page is an interim overview. It is a jumping-off point for the Bitwise UK / Attestant team to expand with deeper institutional collateral. See KB_OUTSTANDING_ITEMS.md. -->

## Overview

Bitwise Onchain Solutions' Ethereum staking operations — including the infrastructure behind the Ethereum Foundation's ~70,000 ETH staking program — run on two open-source tools built by Attestant (now part of BOS): **Vouch** and **Dirk**.

Both are Apache-2.0 licensed and used in production by the Ethereum Foundation itself, making them one of the most battle-tested institutional Ethereum staking stacks available.

---

## What Problem Do They Solve?

Traditional Ethereum validator setups have two structural weaknesses:

1. **Single points of failure** — one beacon node, one validator client, one key store. If any component fails, validators miss duties and forfeit rewards.
2. **Keys stored alongside signing logic** — validator signing keys typically live inside the same process as the validator client. A compromise of that process exposes the keys.

Vouch and Dirk address these as a pair:

- **Vouch** handles **orchestration** — communicating with multiple beacon nodes, deciding what to sign and when.
- **Dirk** handles **signing** — holding the keys in a separate, hardened, distributed system.

---

## Vouch: The Validator Orchestration Layer

Vouch is a standalone Ethereum consensus-layer validator client. Unlike bundled clients (Prysm, Lighthouse, Teku, Nimbus) that ship the validator client together with a beacon node, Vouch is **decoupled**. It connects to multiple beacon nodes simultaneously and performs validator duties on their behalf.

### Multi-Node Availability

Vouch maintains connections to multiple beacon nodes *at the same time* — not as primary/backup, but all concurrently. If any beacon node goes down, Vouch continues operating using the remaining nodes. This eliminates the classic single-beacon-node failure mode.

### Client Diversity

Vouch can use different beacon nodes for different purposes. This is particularly important for client diversity: if one consensus client has a supermajority and ships a bug, validators can be configured to exclude that client when determining what to attest to — reducing the risk of cascading attestation errors.

### Pluggable Strategies

Rather than hardcoding decision logic, Vouch uses **strategies** — configurable modules that define how to pick the best block proposal, attestation data, or MEV builder bid. For example, the `best` strategy for block proposals fetches candidates from all connected beacon nodes and selects the highest-value block, maximizing validator rewards.

### MEV-Boost Integration

Vouch includes native support for MEV-boost via its block-relay service, enabling participation in the builder auction market for additional block rewards.

### Multi-Instance Operation

Multiple Vouch instances can run simultaneously — safely. Combined with Dirk's slashing protection (below), this enables zero-downtime upgrades: operators can upgrade Vouch instances one at a time without missing validator duties.

---

## Dirk: The Distributed Key Manager

Dirk is the signing backend. It holds the validator private keys and performs signing operations — but only for authorized callers, and only if doing so won't result in a slashable offense.

### Certificate-Based Access Control

Every client that requests a signature must authenticate with a TLS client certificate. Dirk checks the certificate against a permissions config specifying exactly which validator keys each client is allowed to use. The default is deny-everything; permissions are explicitly granted. A compromised or misconfigured client can only access what it's been authorized for.

### Slashing Protection

Every signing request passes through a validation check **before** the key is used. This prevents:

- Signing two different blocks for the same slot (double block proposal)
- Signing conflicting attestations for the same epoch (surround vote / double vote)

Dirk durably records each signature to disk before producing it. The added latency is small (tens of milliseconds) but eliminates the risk of accidental double-signing — including when multiple Vouch instances try to sign the same duty.

### Threshold Signing

Instead of one Dirk instance holding one full key, keys can be split across multiple Dirk instances using **Shamir Secret Sharing**. In a 3-of-5 configuration:

- The key is split into 5 shares distributed across 5 Dirk instances
- Any 3 instances can collaborate to produce a valid signature
- No single instance holds the full key
- 2 instances can be down or compromised without affecting operations
- An attacker would need to compromise 3 separate instances to steal a key

This is how zero-downtime upgrades work: one Dirk instance at a time can be taken offline and upgraded while the remaining instances meet the signing threshold.

### Distributed Key Generation (DKG)

When threshold-signed keys are created, Dirk supports DKG — the keys are generated **collaboratively** across the Dirk instances. At no point during creation does any single machine hold the complete key. This eliminates the setup vulnerability where a compromised key-generation ceremony could expose the private key.

---

## How They Work Together

The flow for a single block proposal:

1. **Vouch's scheduler** detects a managed validator is selected as proposer for an upcoming slot.
2. **Vouch queries all connected beacon nodes** simultaneously for block proposal candidates.
3. **Strategy selects the best proposal** (scored by expected rewards).
4. **Vouch sends a signing request to Dirk** with the block to sign.
5. **Dirk verifies the certificate** — is this caller authorized for this validator?
6. **Dirk runs slashing protection** — has anything else been signed for this slot?
7. **Dirk signs the block** (using threshold signing if multi-instance) and returns the signature.
8. **Vouch submits the signed block** to all connected beacon nodes.

The full round-trip completes in a fraction of a 12-second slot.

---

## Why This Matters for Institutional Staking

The Vouch + Dirk stack provides three institutional-grade properties:

| Property | How It's Achieved |
|----------|-------------------|
| **High availability** | Multi-beacon-node connections + multi-instance Vouch + threshold-signing Dirk — no single point of failure |
| **Cryptographic security** | Keys held in separate signing process with certificate-based access; threshold signing means no machine holds a complete key |
| **Zero-downtime operations** | One component at a time can be upgraded or replaced without interrupting validator duties |

These properties are table stakes for operating institutional-scale staking infrastructure — and they are prerequisites for the track record underlying Bitwise Onchain Solutions' Ethereum staking offering.

---

## Further Reading

- [Attestant blog: Introducing Vouch](https://www.attestant.io/posts/introducing-vouch/)
- [Attestant blog: Introducing Dirk](https://www.attestant.io/posts/introducing-dirk/)
- [Attestant blog: Helping client diversity](https://www.attestant.io/posts/helping-client-diversity/)
- [Attestant blog: Upgrading infrastructure without missing a beat](https://www.attestant.io/posts/upgrading-attestants-infrastructure-without-missing-a-beat/)
- [Vouch on GitHub](https://github.com/attestantio/vouch)
- [Dirk on GitHub](https://github.com/attestantio/dirk)
