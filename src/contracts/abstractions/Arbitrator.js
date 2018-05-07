import _ from 'lodash'

import * as arbitratorConstants from '../../constants/arbitrator'
import AbstractContract from '../AbstractContract'

/**
 * Arbitrator Abstract Contarct API. This wraps an arbitrator contract. It provides
 * interaction with both the off chain store as well as the arbitrator instance. All
 * arbitrator methods from the supplied contract implementation can be called from this
 * object.
 */
class Arbitrator extends AbstractContract {
  /**
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param {string} account address of user
   * @returns {object[]} dispute data objects for user
   */
  getDisputesForUser = async account => {
    // contract data
    const [period, currentSession] = await Promise.all([
      this._contractImplementation.getPeriod(),
      this._contractImplementation.getSession()
    ])

    const _getDisputesForUserFromStore = async account =>
      Promise.all(
        (await this._StoreProvider.getDisputes(account)).map(dispute =>
          this._contractImplementation.getDispute(dispute.disputeId)
        )
      )

    // new jurors have not been chosen yet. don't update
    if (period !== arbitratorConstants.PERIOD.VOTE) {
      return _getDisputesForUserFromStore(account)
    }

    let profile = await this._StoreProvider.setUpUserProfile(account)
    if (currentSession !== profile.session) {
      // get disputes for juror
      const myDisputes = await this._contractImplementation.getDisputesForJuror(
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
   * @param {string} account - Address of user.
   * @returns {object[]} - Balance of user.
   */
  buyPNK = async (amount, account) => {
    await this._contractImplementation.buyPNK(amount, account)
    return this._contractImplementation.getPNKBalance(account)
  }
}

export default Arbitrator
