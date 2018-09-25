import _ from 'lodash'

import * as arbitratorConstants from '../../constants/arbitrator'
import AbstractContract from '../AbstractContract'
import httpRequest from '../../utils/httpRequest'
import { DISPUTE_CACHE_URI } from '../../constants/dispute'
/**
 * Arbitrator Abstract Contarct API. This wraps an arbitrator contract. It provides
 * interaction with both the off chain store as well as the arbitrator instance. All
 * arbitrator methods from the supplied contract implementation can be called from this
 * object.
 */
class Arbitrator extends AbstractContract {
  /**
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param {string} account Address of user
   * @param {bool} allowOffChainCache Should open disputes be pulled from off chain cache.
   * The cache is maintained by Kleros for performance. To pull open disputes from the blockchain
   * set false
   * @returns {object[]} dispute data objects for user
   */
  getDisputesForUser = async (account, allowOffChainCache = true) => {
    // contract data
    const [period, currentSession] = await Promise.all([
      this._contractImplementation.getPeriod(),
      this._contractImplementation.getSession()
    ])

    // new jurors have not been chosen yet. don't update
    if (period !== arbitratorConstants.PERIOD.VOTE) {
      return this.getDisputesForUserFromStore(account)
    }

    const profile = await this._StoreProvider.newUserProfile(account)
    if (currentSession !== profile.session) {
      // pull open disputes from off chain cache
      let cachedDisputes = null
      if (allowOffChainCache) {
        const cachedDisputesResponse = await httpRequest(
          'GET',
          `${DISPUTE_CACHE_URI}/${currentSession}`
        )

        if (
          cachedDisputesResponse.body &&
          cachedDisputesResponse.body.open_disputes
        ) {
          cachedDisputes = await Promise.all(
            cachedDisputesResponse.body.open_disputes.map(disputeIDString =>
              this._contractImplementation.getDispute(Number(disputeIDString))
            )
          )
        }
      }

      // get disputes for juror
      const myDisputes = await this._contractImplementation.getDisputesForJuror(
        account,
        cachedDisputes
      )

      // update user profile for each dispute
      await Promise.all(
        myDisputes.map(async dispute => {
          if (dispute.appealDraws[dispute.numberOfAppeals].length > 0) {
            const disputeCreationLog = await this._contractImplementation.getDisputeCreationEvent(
              dispute.disputeID
            )

            if (!disputeCreationLog)
              throw new Error('Could not fetch dispute creation event log')
            // update profile for account
            await this._StoreProvider.updateDisputeProfile(
              account,
              dispute.arbitratorAddress,
              dispute.disputeID,
              {
                blockNumber: disputeCreationLog.blockNumber
              }
            )
            // add draws separately for appeals
            await this._StoreProvider.addNewDrawsDisputeProfile(
              account,
              dispute.arbitratorAddress,
              dispute.disputeID,
              dispute.appealDraws[dispute.numberOfAppeals],
              dispute.numberOfAppeals
            )
          }
        })
      )

      // Only update session if we found some draws. Othewise assume error
      if (myDisputes.length > 0)
        await this._StoreProvider.updateUserSession(account, currentSession)
    }

    return this.getDisputesForUserFromStore(account)
  }

  /**
   * Get disputes from the store.
   * @param {string} account - The users account.
   * @returns {object[]} The dispute objects.
   */
  getDisputesForUserFromStore = async account => {
    const aribtratorAddress = this._contractImplementation.getContractAddress()
    return Promise.all(
      (await this._StoreProvider.getDisputes(account))
        .filter(dispute => dispute.arbitratorAddress === aribtratorAddress)
        .map(dispute =>
          this._contractImplementation.getDispute(dispute.disputeId)
        )
    )
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
