import AbstractWrapper from '../AbstractWrapper'

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

  // default to arbitrator method if none exists
  __noSuchMethod__ = async (id, args) => {
    this.__checkArbitratorWrappersSet()

    arbitratorMethod = this._Arbitrator[id]
    if (arbitratorMethod) {
      return await arbitratorMethod(...args)
    } else {
      throw new Error(`Arbitrator has no method ${id}`)
    }
  }

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
    txHash = await this._Arbitrator.buyPNK(amount, arbitratorAddress, account)
    if (txHash) {
      // update store so user can get instantaneous feedback
      let userProfile = await this._StoreProvider.getUserProfile(account)
      if (_.isNull(userProfile)) userProfile = await this._StoreProvider.newUserProfile(account)
      // FIXME seems like a super hacky way to update store
      userProfile.balance = (parseInt(userProfile.balance) ? userProfile.balance : 0) + parseInt(amount)
      delete userProfile._id
      delete userProfile.created_at
      const response = await this._StoreProvider.newUserProfile(account, userProfile)

      return this.getPNKBalance(contractAddress, account)
    } else {
      throw new Error("unable to buy PNK")
    }
  }
}

export default Arbitrator
