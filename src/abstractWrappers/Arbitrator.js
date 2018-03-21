import _ from 'lodash'

import AbstractWrapper from './AbstractWrapper'

/**
 * Arbitrator API.
 */
class Arbitrator extends AbstractWrapper {
  /**
   * Arbitrator Constructor.
   * @param {object} storeProvider - store provider object.
   * @param {object} arbitratorWrapper - arbitrator contract wrapper object.
   * @param {object} eventListener - event listener object.
   */
  constructor(storeProvider, arbitratorWrapper, eventListener) {
    super(storeProvider, arbitratorWrapper, undefined, eventListener)
  }

  // passthroughs
  getPNKBalance = this._Arbitrator.getPNKBalance
  activatePNK = this._Arbitrator.activatePNK
  getData = this._Arbitrator.getData
  passPeriod = this._Arbitrator.passPeriod

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
    await this._Arbitrator.buyPNK(amount, arbitratorAddress, account)
    return this.getPNKBalance(arbitratorAddress, account)
  }

  /**
   * Get all contracts TODO do we need to get contract data from blockchain?
   * @param {string} account - Address of user.
   * @returns {object[]} - Contract data from store.
   */
  getContractsForUser = async account => {
    // fetch user profile
    const userProfile = await this._StoreProvider.setUpUserProfile(account)

    return userProfile.contracts
  }
}

export default Arbitrator
