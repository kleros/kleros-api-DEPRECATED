import AbstractWrapper from '../AbstractWrapper'
import _ from 'lodash'

/**
 * Arbitrator api
 */
class Arbitrator extends AbstractWrapper {
  /**
   * Arbitrator Constructor
   * @param storeProvider store provider object
   * @param arbitratorWrapper arbitrator contract wrapper object
   */
  constructor(storeProvider, arbitratorWrapper) {
    super(storeProvider, arbitratorWrapper, undefined)
  }

  // passthroughs
  getPNKBalance = this._Arbitrator.getPNKBalance
  activatePNK = this._Arbitrator.activatePNK

  /**
   * @param amount number of pinakion to buy
   * @param account address of user
   * @return objects[]
   */
  buyPNK = async (
    amount,
    arbitratorAddress, // address of KlerosPOC
    account
  ) => {
    const txHash = await this._Arbitrator.buyPNK(amount, arbitratorAddress, account)
    if (txHash) {
      // update store so user can get instantaneous feedback
      let userProfile = await this._StoreProvider.getUserProfile(account)
      if (_.isNull(userProfile)) userProfile = await this._StoreProvider.newUserProfile(account)
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
}

export default Arbitrator
