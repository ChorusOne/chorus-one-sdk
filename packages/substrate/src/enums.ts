/**
 * Enum for the different Substrate reward destinations.
 *
 * @enum {string} RewardDestination
 *
 * @property {string} STASH - Sends rewards to the staker's stash account, where they can compound with the locked staking balance.
 *
 * @property {string} CONTROLLER - Sends rewards to the controller account, which handles staking operations but holds minimal funds.
 *
 */
export enum RewardDestination {
  STASH = 'Stash',
  CONTROLLER = 'Controller'
}
