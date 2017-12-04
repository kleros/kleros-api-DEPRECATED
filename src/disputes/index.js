import { NULL_ADDRESS, VOTING_PERIOD } from '../../constants'

/**
 * Disputes api
 */
class Disputes {
  /**
   * Constructor Disputes.
   * @param web3Provider web3 wrapper object
   * @param storeProvider store provider object
   * @param arbitratorWrapper arbitrator contract wrapper object
   * @param arbitrableWrapper arbitrable contract wrapper object
   */
  constructor(web3Provider, storeProvider, arbitratorWrapper, arbitrableWrapper) {
    this._Web3Wrapper = web3Provider
    this._StoreProvider = storeProvider
    this._Arbitrator = arbitratorWrapper
    this._Arbitrable = arbitrableWrapper
  }

  /**
  * set Arbitrator wrapper
  * @param arbitratorWrapper wrapper for arbitrator contract
  */
  setArbitrator = arbitratorWrapper => {
    this._Arbitrator = arbitratorWrapper
  }

  /**
  * set Arbitrable wrapper
  * @param arbitrableWrapper wrapper for arbitrable contract
  */
  setArbitrable = arbitrableWrapper => {
    this._Arbitrable = arbitrableWrapper
  }

  /**
  * I can't wait for decorators
  * throws an error if Arbitrator and Arbitable contract wrappers are not set yet
  */
  _checkContractWrappersSet = () => {
    if (!this._Arbitrator) throw new Error('No Arbitrator Contract Wrapper specified. Please call setArbitrator')
    if (!this._Arbitrable) throw new Error('No Arbitrable Contract Wrapper specified. Please call setArbitrable')
  }

  /**
  * Load instance of arbitrator contract
  * @param arbitratorAddress address
  * @return instance of arbitrator contract wrapper
  */
  _loadArbitratorInstance = async arbitratorAddress => {
    this._checkContractWrappersSet()
    return await this._Arbitrator.load(arbitratorAddress)
  }

  /**
  * Load instance of arbitrable contract
  * @param arbitrableAddress address
  * @return instance of arbitrable contract wrapper
  */
  _loadArbitrableInstance = async arbitrableAddress => {
    this._checkContractWrappersSet()
    return await this._Arbitrable.load(arbitrableAddress)
  }

  /**
   * Get dispute from store by hash
   * @param disputeHash hash of the dispute
   * @param account address of user
   * @return objects[]
   */
  getDisputeByHash = async (
    disputeHash,
    arbitratorAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    // fetch dispute
    const disputeData = await this._StoreProvider.getDisputeData(account, disputeHash)
    if (!disputeData) throw new Error(`No dispute with hash ${disputeHash} for account ${account}`)
    if (disputeData.disputeId) {
      disputeData.ruling = await this._Arbitrator.currentRulingForDispute(disputeData.disputeId, arbitratorAddress)
      const dispute = await this._Arbitrator.getDispute(disputeData.disputeId, arbitratorAddress)
      // should we just merge both objects?
      disputeData.state = dispute.state
    } else {
      // 0 indicates that there is no decision
      disputeData.ruling = 0
      disputeData.state = 0
    }

    // get contract data from partyA (should have same docs for both parties)
    let contractData = await this._Arbitrable.getDataContract(disputeData.contractAddress)

    return {
      contractData,
      disputeData
    }
  }

  /**
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param arbitratorAddress address of Kleros contract
   * @param account address of user
   * @return objects[]
   */
  getDisputesForUser = async (
    arbitratorAddress,
    account = this._Web3Wrapper.getAccount(0),
  ) => {
    // FIXME don't like having to call this every fnc
    this._checkContractWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress, account)

    // fetch user profile
    let profile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(profile)) profile = await this._StoreProvider.newUserProfile(account)
    // fetch current contract period
    const period = arbitratorData.period
    const currentSession = arbitratorData.session
    // new jurors have not been chosen yet. don't update
    if (period !== VOTING_PERIOD) {
      let disputes = await this._StoreProvider.getDisputesForUser(account)
      disputes = await Promise.all(disputes.map(async (dispute) => {
        // get dispute from store so that we have the same object returned for both methods
        // FIXME inefficient
        dispute = await this.getDisputeByHash(dispute.hash, arbitratorAddress)
        dispute.period = period
        dispute.session = currentSession
        return dispute
      }))

      return disputes
    }

    if (currentSession != profile.session) {
      // get disputes for juror
      const myDisputes = await this.getDisputesForJuror(arbitratorAddress, account)

      const newDisputes = await Promise.all(myDisputes.map(async dispute => {
        // get data for contract
        const contractData = await this._Arbitrable.getDataContractForDispute(
          dispute.partyA,
          dispute.arbitrated,
          dispute
        )
        // compute end date
        const startTime = arbitratorData.lastPeriodChange
        const length = await this._Arbitrator.getTimeForPeriod(period)

        // FIXME this is all UTC for now. Timezones are a pain
        const deadline = new Date(0);
        deadline.setUTCSeconds(startTime)
        deadline.setSeconds(deadline.getSeconds() + length);

        // set deadline
        contractData.deadline = `${deadline.getUTCDate()}/${deadline.getUTCMonth()}/${deadline.getFullYear()}`

        return contractData
      }))

      let disputeObject
      for (let i=0; i<newDisputes.length; i++) {
        disputeObject = newDisputes[i]

        // update dispute
        await this._StoreProvider.updateDispute(
          disputeObject.disputeId,
          disputeObject.hash,
          disputeObject.arbitratorAddress,
          disputeObject.partyA,
          disputeObject.partyB,
          disputeObject.title,
          disputeObject.deadline,
          disputeObject.status,
          disputeObject.fee,
          disputeObject.information,
          disputeObject.justification,
          disputeObject.resolutionOptions
        )

        // update profile
        await this._StoreProvider.updateDisputeProfile(
          account,
          disputeObject.votes,
          disputeObject.hash,
          true,
          false
        )
      }

      // update session on profile
      profile = await this._StoreProvider.getUserProfile(account)
      profile.session = currentSession
      await this._StoreProvider.updateUserProfile(account, profile)
    }

    // fetch user profile again after updates
    let disputes = await this._StoreProvider.getDisputesForUser(account)
    // add on data about period and session
    disputes = await Promise.all(disputes.map(async (dispute) => {
      // get dispute from store so that we have the same object returned for both methods
      // FIXME inefficient
      dispute = await this.getDisputeByHash(dispute.hash, arbitratorAddress)
      dispute.period = period
      dispute.session = currentSession
      return dispute
    }))
    return disputes
  }

  /**
   * Get disputes from Kleros contract
   * @param arbitratorAddress address of Kleros contract
   * @param account address of user
   * @return objects[]
   */
  getDisputesForJuror = async (
    arbitratorAddress,
    account,
  ) => {
    // FIXME don't like having to call this every fnc
    this._checkContractWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress, account)
    const myDisputes = []
    let disputeId = 0
    let numberOfJurors = 0
    const currentSession = arbitratorData.session

    // iterate over all disputes (FIXME inefficient)
    let dispute = await this._Arbitrator.getDispute(disputeId, arbitratorAddress)
    while (dispute.arbitratedContract !== NULL_ADDRESS) {
      // session + number of appeals
      const disputeSession = dispute.firstSession + dispute.numberOfAppeals
      // if dispute not in current session skip
      if (disputeSession !== currentSession) {
        disputeId++
        dispute = await this._Arbitrator.getDispute(disputeId, arbitratorAddress)
        continue
      }

      numberOfJurors = await this._Arbitrator.getAmountOfJurorsForDispute(disputeId, arbitratorAddress)
      for (let draw=1; draw<=numberOfJurors; draw++) {
        // check if you are juror for dispute
        const isJuror = await this._Arbitrator.isJurorDrawnForDispute(disputeID, draw, arbitratorAddress, account)
        if (isJuror) {
          let toAdd = true
          // if dispute already in myDipsutes add new draw number
          myDisputes.map((disputeObject) => {
            if (disputeObject.id === disputeId) {
              disputeObject.votes.push(draw)
              toAdd = false
            }
          })

          // if dispute not already in array add it
          if (toAdd) myDisputes.push({
            id: disputeId,
            votes: [draw],
            ...dispute
          })
        }
      }

      // check next dispute
      disputeId += 1
      dispute = await this._Arbitrator.getDispute(disputeId, arbitratorAddress)
    }

    return myDisputes
  }
}

export default Disputes
