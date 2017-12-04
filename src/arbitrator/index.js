/**
 * Disputes api
 */
class Arbitrator {
  /**
   * Constructor Arbitrator.
   * @param web3Provider web3 wrapper object
   * @param storeProvider store provider object
   * @param arbitratorWrapper arbitrator contract wrapper object
   */
  constructor(web3Provider, storeProvider, arbitratorWrapper) {
    this._Web3Wrapper = web3Provider
    this._StoreProvider = storeProvider
    this._Arbitrator = arbitratorWrapper
  }

  /**
  * set Arbitrator wrapper
  * @param arbitratorWrapper wrapper for arbitrator contract
  */
  setArbitrator = arbitratorWrapper => {
    this._Arbitrator = arbitratorWrapper
  }

  /**
   * @param amount number of pinakion to buy
   * @param account address of user
   * @return objects[]
   */
  buyPNK = async (
    amount,
    arbitratorAddress, // address of KlerosPOC
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    txHash = await this._Arbitrator._buyPNK(amount, arbitratorAddress, account)
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

  /**
   * @param contractAddress address of KlerosPOC contract
   * @param account address of user
   * @return objects[]
   */
  getPNKBalance = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    const juror = await contractInstance.jurors(account)
    if (!juror) throw new Error(`${account} is not a juror for contract ${contractAddress}`)

    // total tokens stored in contract
    const contractBalance = this._Web3Wrapper.fromWei(juror[0].toNumber(), 'ether')
    // tokens activated in court session
    const currentSession = await contractInstance.session.call()
    let activatedTokens = 0
    if (juror[2].toNumber() === currentSession.toNumber()) {
      activatedTokens = this._Web3Wrapper.fromWei((juror[4].toNumber() - juror[3].toNumber()), 'ether')
    }
    // tokens locked into disputes
    const lockedTokens = this._Web3Wrapper.fromWei(juror[2].toNumber(), 'ether')

    return {
      activatedTokens,
      lockedTokens,
      tokenBalance: contractBalance
    }
  }
}
