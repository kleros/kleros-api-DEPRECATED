/**
 * Disputes object
 */
class Disputes {
  /**
   * Constructor Kleros.
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

  setArbitrator = arbitratorWrapper => {
    this._Arbitrator = arbitratorWrapper
  }

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
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param arbitratorAddress address of Kleros contract
   * @param account address of user
   * @return objects[]
   */
  getDisputesForUser = async (
    arbitratorAddress,
    account = this._Web3Wrapper.getAccount(0),
  ) => {
    // contract instance
    const arbitratorInstance = await this._loadArbitratorInstance(arbitratorAddress)

    // fetch user profile
    let profile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(profile)) profile = await this._StoreProvider.newUserProfile(account)
    // fetch current contract period
    const period = (await arbitratorInstance.period()).toNumber()
    const currentSession = (await arbitratorInstance.session()).toNumber()
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
        const startTime = (await arbitratorInstance.lastPeriodChange()).toNumber()
        const length = (await arbitratorInstance.timePerPeriod(period)).toNumber()

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
   * @param contractAddress address of Kleros contract
   * @param account address of user
   * @return objects[]
   */
  getDisputesForJuror = async (
    contractAddress,
    account,
  ) => {
    const contractInstance = await this.load(contractAddress)
    const myDisputes = []
    let disputeId = 0
    let numberOfJurors = 0
    const currentSession = (await contractInstance.session()).toNumber()

    // iterate over all disputes (FIXME inefficient)
    let dispute = await contractInstance.disputes(disputeId)
    while (dispute[0] !== "0x") {
      // session + number of appeals
      const disputeSession = dispute[1].toNumber() + dispute[2].toNumber()
      // if dispute not in current session skip
      if (disputeSession !== currentSession) {
        disputeId++
        dispute = await contractInstance.disputes(disputeId)
        continue
      }

      numberOfJurors = (await contractInstance.amountJurors(disputeId)).toNumber()
      for (let draw=1; draw<=numberOfJurors; draw++) {
        // check if you are juror for dispute
        const isJuror = await contractInstance.isDrawn(disputeId, account, draw)
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
            arbitrated: dispute[0],
            session: dispute[1].toNumber(),
            appeals: dispute[2].toNumber(),
            choices: dispute[3].toNumber(),
            initialNumberJurors: dispute[4].toNumber(),
            arbitrationFeePerJuror: dispute[5].toNumber(),
            votes: [draw]
          })
        }
      }

      // check next dispute
      disputeId += 1
      dispute = await contractInstance.disputes(disputeId)
    }

    return myDisputes
  }
}

export default Disputes
