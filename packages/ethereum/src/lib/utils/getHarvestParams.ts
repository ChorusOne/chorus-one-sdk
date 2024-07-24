import { Hex } from 'viem'
import { StakewiseConnector } from '../connector'

export const getHarvestParams = async (connector: StakewiseConnector, vault: Hex) => {
  const harvestData = await connector.graphqlRequest({
    type: 'graph',
    op: 'HarvestParams',
    query: `
            query HarvestParams($address: ID!) {
            harvestParams: vault(id: $address) {
                proof
                rewardsRoot
                reward: proofReward
                unlockedMevReward: proofUnlockedMevReward
              }
            }
            `,
    variables: {
      address: vault.toLowerCase()
    }
  })

  if (!harvestData.data.harvestParams) {
    throw new Error('Vault data is missing the harvestParams field')
  }
  return harvestData.data.harvestParams
}
