import _ from 'lodash'

import delegateCalls from '../../utils/delegateCalls'
import * as arbitratorConstants from '../../constants/arbitrator'

import AbstractWrapper from './AbstractWrapper'

/**
 * Arbitrator API.
 */
class Arbitrator extends AbstractWrapper {
  constructor(contractWrapperInstance, storeProviderWrapperInstance) {
    super(contractWrapperInstance, storeProviderWrapperInstance)
    // delegate calls to contractWrapperInstance
    delegateCalls(this, contractWrapperInstance)
  }

  /**
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param {string} arbitratorAddress address of Kleros contract
   * @param {string} account address of user
   * @returns {object[]} dispute data objects for user
   */
  getDisputesForUser = async (arbitratorAddress, account) => {
    this._checkStoreProviderSet()
    // contract data
    const [period, currentSession] = await Promise.all([
      this._contractWrapper.getPeriod(arbitratorAddress),
      this._contractWrapper.getSession(arbitratorAddress)
    ])

    const _getDisputesForUserFromStore = async account =>
      Promise.all(
        (await this._StoreProvider.getDisputesForUser(account)).map(dispute =>
          this._contractWrapper.getDispute(
            dispute.arbitratorAddress,
            dispute.disputeId,
            account
          )
        )
      )

    // new jurors have not been chosen yet. don't update
    if (period !== arbitratorConstants.PERIOD.VOTE) {
      return _getDisputesForUserFromStore(account)
    }

    let profile = await this._StoreProvider.setUpUserProfile(account)
    if (currentSession !== profile.session) {
      // get disputes for juror
      const myDisputes = await this._contractWrapper.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // update user profile for each dispute
      await Promise.all(
        myDisputes.map(async dispute => {
          // update profile for account
          await this._StoreProvider.updateDisputeProfile(
            account,
            dispute.arbitratorAddress,
            dispute.disputeId,
            {
              appealDraws: dispute.appealDraws
            }
          )
        })
      )

      this._StoreProvider.updateUserProfile(account, {
        session: currentSession
      })
    }

    return _getDisputesForUserFromStore(account)
  }

  /**
   * Buy PNK.
   * @param {number} amount - Number of pinakion to buy.
   * @param {string} arbitratorAddress - Arbitrator contract's address.
   * @param {string} account - Address of user.
   * @returns {object[]} - Balance of user.
   */
  buyPNK = async (
    amount,
    arbitratorAddress, // address of KlerosPOC
    account
  ) => {
    await this._contractWrapper.buyPNK(amount, arbitratorAddress, account)
    return this._contractWrapper.getPNKBalance(arbitratorAddress, account)
  }
}

export default Arbitrator
