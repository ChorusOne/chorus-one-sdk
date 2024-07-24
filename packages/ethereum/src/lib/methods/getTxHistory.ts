import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'
import { VaultActionType, VaultTransaction } from '../types/transactionHistory'

async function extractTransactionsHistory (connector: StakewiseConnector, vault: Hex): Promise<VaultTransaction[]> {
  const vars_getActions = {
    where: {
      vault_: {
        id: vault.toLowerCase()
      },
      actionType_in: Object.values(VaultActionType)
    },
    first: 1000,
    skip: 0
  }

  const actionsData = await connector.graphqlRequest({
    type: 'graph',
    op: 'AllocatorActions',
    query: `
        query AllocatorActions(
            $skip: Int!
            $first: Int!
            $where: AllocatorAction_filter
            ) {
            allocatorActions(
                skip: $skip,
                first: $first,
                orderBy: createdAt,
                orderDirection: desc,
                where: $where,
            ) {
                id
                assets
                shares
                createdAt
                actionType
            }
        }
        `,
    variables: vars_getActions
  })

  if (!actionsData.data.allocatorActions || actionsData.data.allocatorActions.length === 0) {
    throw new Error(`Transaction data is missing the allocatorActions field`)
  }
  const interactions: VaultTransaction[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionsData.data.allocatorActions.forEach((action: any) => {
    const createdAt: string = action.createdAt
    interactions.push({
      vault: vault,
      when: new Date(parseInt(createdAt) * 1000),
      type: action.actionType,
      amount: action.assets ? BigInt(action.assets) : 0n, // some txs don't have assets, e.g. ExitQueueEntered
      hash: action.id
    })
  })

  return interactions
}

export async function getTxHistory (params: {
  connector: StakewiseConnector
  vault: Hex
  // userAccount: Hex
}): Promise<Array<VaultTransaction>> {
  const { connector, vault } = params
  const interactions = await extractTransactionsHistory(connector, vault)

  return interactions
}
