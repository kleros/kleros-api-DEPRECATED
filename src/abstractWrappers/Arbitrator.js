import AbstractWrapper from './AbstractWrapper'
import _ from 'lodash'

/**
 * Arbitrator api
 */
class Arbitrator extends AbstractWrapper {
  /**
   * Arbitrator Constructor
   * @param {object} storeProvider store provider object
   * @param {object} arbitratorWrapper arbitrator contract wrapper object
   * @param {object} eventListener event listener object
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
   * @param {number} amount number of pinakion to buy
   * @param {address} account address of user
   * @return {object[]} balance of user
   */
  buyPNK = async (
    amount,
    arbitratorAddress, // address of KlerosPOC
    account
  ) => {
    const txHash = await this._Arbitrator.buyPNK(amount, arbitratorAddress, account)
    if (txHash) {
      // update store so user can get instantaneous feedback
      const userProfile = await this._StoreProvider.setUpUserProfile(account)
      // FIXME seems like a super hacky way to update store
      userProfile.balance = (parseInt(userProfile.balance) ? userProfile.balance : 0) + parseInt(amount)
      delete userProfile._id
      delete userProfile.created_at
      const response = await this._StoreProvider.newUserProfile(account, userProfile)

      return this.getPNKBalance(arbitratorAddress, account)
    } else {
      throw new Error("unable to buy PNK")
    }
  }

  /**
   * Get all contracts TODO do we need to get contract data from blockchain?
   * @param {string} account address of user
   * @return {object[]} contract data from store
   */
  getContractsForUser = async (
    account
  ) => {
    // fetch user profile
    const userProfile = await this._StoreProvider.setUpUserProfile(account)

    return userProfile.contracts
  }
}

export default Arbitrator
