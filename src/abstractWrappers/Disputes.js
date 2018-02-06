import AbstractWrapper from './AbstractWrapper'
import {
  NULL_ADDRESS,
  PERIODS,
  DEFAULT_ARBITRATION_COST,
  DISPUTE_STATUS
} from '../../constants'
import _ from 'lodash'

/**
 * Disputes api
 */
class Disputes extends AbstractWrapper {
  /**
   * Disputes Constructor
   * @param {object} storeProvider store provider object
   * @param {object} arbitratorWrapper arbitrator contract wrapper object
   * @param {object} arbitrableWrapper arbitrable contract wrapper object
   */
  constructor(storeProvider, arbitratorWrapper, arbitrableWrapper, eventListener) {
    super(storeProvider, arbitratorWrapper, arbitrableWrapper, eventListener)
  }

  // **************************** //
  // *      Notifications       * //
  // **************************** //

  /**
  * If there is a dispute in contract update store
  * FIXME contracts with multiple disputes will need a way to clarify that this is a new dispute
  * @param {string} arbitratorAddress
  */
  addDisputeEventListener = async (
    arbitratorAddress
  ) => {
    if (!this._eventListener) return

    const _disputeCreatedHandler = (
      event,
      contractAddress = arbitratorAddress
    ) => {
      const disputeId = event.args._disputeID.toNumber()
      const arbitratorAddress = contractAddress
      this._updateStoreForDispute(arbitratorAddress, disputeId)
    }

    await this._eventListener.registerArbitratorEvent('DisputeCreation', _disputeCreatedHandler)
  }

  /**
  * stop watching for disputes
  */
  stopWatchingForDisputes = (
    arbitratorAddress
  ) => {
    this._eventListener.stopWatchingArbitratorEvents(arbitratorAddress)
  }

  /**
  * Subscribe to receive notifications for a dispute. In order for jurors to receive push notifications they must be subscribed
  * @param {string} arbitratorAddress address of arbitrator contract
  * @param {number} disputeId index of dispute
  * @param {string} subscriberAddress address of new subscriber
  */
  subscribeToDispute = async (
    arbitratorAddress,
    disputeId,
    subscriberAddress
  ) => {
    await this._StoreProvider.addSubscriber(
      arbitratorAddress,
      disputeId,
      subscriberAddress
    )
  }

  // **************************** //
  // *          Public          * //
  // **************************** //

  /**
  * Pay the arbitration fee to raise a dispute. To be called by the party A.
  * @param {string} account Ethereum account
  * @param {string} arbitrableContract Address address of arbitrable contract
  * @param {number} arbitrationCost Amount to pay the arbitrator
  * @return {string} txHash hash transaction | Error
  */
  raiseDisputePartyA = async (
    account,
    arbitrableContractAddress,
    arbitrationCost = DEFAULT_ARBITRATION_COST
  ) => {
    this._checkArbitrableWrappersSet()

    try {
      const txHash = await this._ArbitrableContract.payArbitrationFeeByPartyA(
        account,
        arbitrableContractAddress,
        arbitrationCost
      )

      if (!txHash) throw new Error('unable to pay arbitration fee for party A')

      return txHash
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
  * Pay the arbitration fee to raise a dispute. To be called by the party B.
  * @param {string} account Ethereum account
  * @param {string} arbitrableContract Address address of arbitrable contract
  * @param {number} arbitrationCost Amount to pay the arbitrator
  * @return {string} txHash hash of the transaction | Error
  */
  raiseDisputePartyB = async (
    account,
    arbitrableContractAddress,
    arbitrationCost = DEFAULT_ARBITRATION_COST
  ) => {
    this._checkArbitrableWrappersSet()

    const txHash = await this._ArbitrableContract.payArbitrationFeeByPartyB(
      account,
      arbitrableContractAddress,
      arbitrationCost
    )

    if (!txHash) throw new Error('unable to pay arbitration fee for party B')

    return txHash
  }

  /**
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param {string} arbitratorAddress address of Kleros contract
   * @param {string} account address of user
   * @return {object[]} dispute data objects for user
   */
  getDisputesForUser = async (
    arbitratorAddress,
    account
  ) => {
    // FIXME don't like having to call this every fnc
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress, account)

    // fetch user profile
    let profile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(profile)) profile = await this._StoreProvider.newUserProfile(account)
    // fetch current contract period
    const period = arbitratorData.period
    const currentSession = arbitratorData.session
    // new jurors have not been chosen yet. don't update
    if (period !== PERIODS.VOTE) {
      let disputes = await this._StoreProvider.getDisputesForUser(account)
      disputes = await Promise.all(disputes.map(async (dispute) => {
        return await this.getDataForDispute(dispute.arbitratorAddress, dispute.disputeId, account)
      }))

      return disputes
    }

    if (currentSession != profile.session) {
      // get disputes for juror
      const myDisputeIds = await this.getDisputesForJuror(arbitratorAddress, account)
      // update store for each dispute
      await Promise.all(myDisputeIds.map(async disputeId => {
        // add dispute to db if it doesn't already exist
        await this._updateStoreForDispute(arbitratorAddress, disputeId, account)
        // subscribe for notifications
        await this.subscribeToDispute(arbitratorAddress, disputeId, account)
      }))

      // update session on profile
      profile = await this._StoreProvider.getUserProfile(account)
      profile.session = currentSession
      await this._StoreProvider.updateUserProfile(account, profile)
    }
    // return array of all disputes for user
    let disputes = await this._StoreProvider.getDisputesForUser(account)
    disputes = await Promise.all(disputes.map(async (dispute) => {
      return await this.getDataForDispute(dispute.arbitratorAddress, dispute.disputeId, account)
    }))

    return disputes
  }

  /**
   * Get disputes from Kleros contract
   * @param {string} arbitratorAddress address of Kleros contract
   * @param {string} account address of user
   * @return {int[]} array of dispute id's
   */
  getDisputesForJuror = async (
    arbitratorAddress,
    account,
  ) => {
    // FIXME don't like having to call this every fnc
    this._checkArbitratorWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress, account)
    const myDisputes = []
    let disputeId = 0
    const currentSession = arbitratorData.session

    let dispute
    while (1) {
      // iterate over all disputes (FIXME inefficient)
      // IDEA iterate over DisputeCreated events between last session and this session
      try {
         dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
         if (dispute.arbitratedContract === NULL_ADDRESS) break
         // session + number of appeals
         const disputeSession = dispute.firstSession + dispute.numberOfAppeals
         // if dispute not in current session skip
         if (disputeSession !== currentSession) {
           disputeId++
           dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
           continue
         }

         const votes = await this.getVotesForJuror(arbitratorAddress, disputeId, account)
         if (votes.length > 0) {
           myDisputes.push(
             disputeId
           )
         }
         // check next dispute
         disputeId += 1
      } catch (e) {
        // getDispute(n) throws an error if index out of range
        break
      }
    }

    return myDisputes
  }

  /**
  * Fetch the votes a juror has in a dispute
  * @param {string} arbitratorAddress address of the arbitrator contract
  * @param {number} disputeId id of the dispute
  * @param {string} account potential jurors address
  * @return {number[]} array of integers indicating the draw
  */
  getVotesForJuror = async (
    arbitratorAddress,
    disputeId,
    account
  ) => {
    const numberOfJurors = await this._Arbitrator.getAmountOfJurorsForDispute(arbitratorAddress, disputeId)
    const votes = []
    // FIXME map doesn't seem to make sense here. would need to construct array of possible choices and then filter?
    for (let draw=1; draw<=numberOfJurors; draw++) {
      const isJuror = await this._Arbitrator.isJurorDrawnForDispute(disputeId, draw, arbitratorAddress, account)
      if (isJuror) {
        votes.push(draw)
      }
    }

    return votes
  }

  /**
   * Submit votes. Note can only be called during Voting period (Period 2)
   * @param {string} arbitratorAddress address of KlerosPOC contract
   * @param {number} disputeId index of the dispute
   * @param {number} ruling int representing the jurors decision
   * @param {number[]} votes int[] of drawn votes for dispute
   * @param {string} account address of user
   * @return {string} transaction hash | Error
   */
  submitVotesForDispute = async (
    arbitratorAddress,
    disputeId,
    ruling,
    votes,
    account
  ) => {
    const txHash = await this._Arbitrator.submitVotes(
      arbitratorAddress,
      disputeId,
      ruling,
      votes,
      account
    )

    if (txHash) {
      // FIXME don't like having to fetch data just to get the arbitratedContract
      const disputeData = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
      // mark in store that you have ruled on dispute
      await this._StoreProvider.updateDisputeProfile(
        account,
        votes,
        arbitratorAddress,
        disputeId,
        true,
        true
      )

      return txHash
    } else {
      throw new Error('unable to submit votes')
    }
  }

  /**
  * get the deadline for dispute
  * @param {string} arbitratorAddress address of arbitrator contract
  * @param {number} period default to voting period
  * @return {string} date string in the form dd/mm/yyyy
  */
  getDeadlineForDispute = async (
    arbitratorAddress,
    period = PERIODS.VOTE
  ) => {
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress)
    // compute end date
    const startTime = arbitratorData.lastPeriodChange
    const length = await this._Arbitrator.getTimeForPeriod(arbitratorAddress, period)
    // FIXME this is all UTC for now. Timezones are a pain
    const deadline = new Date(0);
    deadline.setUTCSeconds(startTime)
    deadline.setSeconds(deadline.getSeconds() + length);

    return `${deadline.getUTCDate()}/${deadline.getUTCMonth()}/${deadline.getFullYear()}`
  }

  /**
  * update store with new dispute data
  * @param {string} arbitratorAddress Address address of arbitrator contract
  * @param {int} disputeId index of dispute
  * @param {string} jurorAddress <optional> address of juror
  */
  _updateStoreForDispute = async (
    arbitratorAddress,
    disputeId,
    jurorAddress
  ) => {
    const disputeData = await this.getDataForDispute(
      arbitratorAddress,
      disputeId,
      jurorAddress
    )

    // update dispute
    const dispute = (await this._StoreProvider.updateDispute(
      disputeData.disputeId,
      disputeData.arbitratorAddress,
      disputeData.hash,
      disputeData.partyA,
      disputeData.partyB,
      disputeData.title,
      disputeData.deadline,
      disputeData.status,
      disputeData.fee,
      disputeData.information,
      disputeData.justification,
      disputeData.resolutionOptions
    )).body

    // if no subscribers (a new dispute) add partyA and partyB
    if (!dispute.subscribers.length) {
      await this._StoreProvider.addSubscriber(
        disputeData.arbitratorAddress,
        disputeData.disputeId,
        disputeData.partyA
      )
      await this._StoreProvider.addSubscriber(
        disputeData.arbitratorAddress,
        disputeData.disputeId,
        disputeData.partyB
      )
    }

    // update profile partyA
    await this._StoreProvider.updateDisputeProfile(
      disputeData.partyA,
      [],
      disputeData.arbitratorAddress,
      disputeData.disputeId,
      false,
      false
    )

    // update profile partyB
    await this._StoreProvider.updateDisputeProfile(
      disputeData.partyB,
      [],
      disputeData.arbitratorAddress,
      disputeData.disputeId,
      false,
      false
    )

    if (jurorAddress) {
      // update juror profile <optional>
      await this._StoreProvider.updateDisputeProfile(
        jurorAddress,
        disputeData.votes,
        disputeData.arbitratorAddress,
        disputeData.disputeId,
        disputeData.votes.length > 0 ? true : false,
        false
      )
    }
  }

  /**
  * get user data for a dispute from the store
  * @param {string} arbitratorAddress address for arbitrator contract
  * @param {int} disputeId index of dispute
  * @param {string} account jurors address
  * @return {object} dispute data from store for user
  */
  getUserDisputeFromStore = async (
    arbitratorAddress,
    disputeId,
    account
  ) => {
    const userProfile = await this._StoreProvider.getUserProfile(account)

    const disputeArray = _.filter(userProfile.disputes, (dispute) => {
      return (dispute.disputeId === disputeId && dispute.arbitratorAddress == arbitratorAddress)
    })

    if (_.isEmpty(disputeArray)) throw new Error(`User ${account} does not have store data for dispute`)

    return disputeArray[0]
  }

  /**
  * get evidence for contract
  * @param {string} arbitrableContract Address address for arbitrable contract
  * @param {string} account <optional> jurors address
  * @return {object[]} array of evidence objects
  */
  getEvidenceForArbitrableContract = async (
    arbitrableContractAddress
  ) => {
    this._checkArbitrableWrappersSet()

    const arbitrableContractData = await this._ArbitrableContract.getData(arbitrableContractAddress)
    const partyAContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )
    const partyBContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyB,
      arbitrableContractAddress
    )

    const partyAEvidence = partyAContractData ? partyAContractData.evidences : []
    const partyBEvidence = partyBContractData ? partyBContractData.evidences : []

    return partyAEvidence.concat(partyBEvidence)
  }

  getRulingOptions = async (
    arbitratorAddress,
    disputeId
  ) => {
    const dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
    if (!dispute) {
      throw new Error(`Cannot fetch ruling options: Dispute from arbitrator ${arbitratorAddress} with disputeId: ${disputeId} does not exist`)
    }
    const arbitrableContractAddress = dispute.arbitratedContract

    return await this._ArbitrableContract.getRulingOptions(
      arbitrableContractAddress,
      arbitratorAddress,
      disputeId
    )
  }

  /**
  * get data for a dispute
  * @param {string} arbitratorAddress Address address for arbitrator contract
  * @param {int} disputeId index of dispute
  * @param {string} account <optional> jurors address
  * @return {Object} data object for dispute that uses data from the contract and store
  */
  getDataForDispute = async (
    arbitratorAddress,
    disputeId,
    account
  ) => {
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()

    // FIXME should we just return what we have in the store?
    const dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
    if (!dispute) {
      throw new Error(`Dispute with arbitrator: ${arbitratorAddress} and disputeId: ${disputeId} does not exist`)
    }
    const arbitrableContractAddress = dispute.arbitratedContract

    const arbitrableContractData = await this._ArbitrableContract.getData(arbitrableContractAddress)
    const constractStoreData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )

    let votes = []
    let isJuror = false
    let hasRuled = false
    if (account) {
      votes = await this.getVotesForJuror(arbitratorAddress, disputeId, account)
      try {
        const userData = await this.getUserDisputeFromStore(arbitratorAddress, disputeId, account)
        isJuror = userData.isJuror
        hasRuled = userData.hasRuled
      } catch (e) {
        isJuror = false
        hasRuled = false
      }
    }

    // get evidence
    const evidence = await this.getEvidenceForArbitrableContract(arbitrableContractAddress)

    // get deadline
    const deadline = await this.getDeadlineForDispute(arbitratorAddress)

    // get ruling
    const ruling = await this._Arbitrator.currentRulingForDispute(arbitratorAddress, disputeId)

    return ({
      // FIXME hash not being stored in contract atm
      hash: arbitrableContractAddress,
      partyA: arbitrableContractData.partyA,
      partyB: arbitrableContractData.partyB,
      arbitrableContractStatus: arbitrableContractData.status,
      disputeState: dispute.state,
      arbitrableContractAddress: arbitrableContractAddress,
      arbitratorAddress: arbitratorAddress,
      fee: dispute.arbitrationFeePerJuror,
      disputeId: disputeId,
      session: dispute.firstSession + dispute.numberOfAppeals,
      deadline: deadline,
      // store data
      description: constractStoreData ? constractStoreData.description : undefined,
      email: constractStoreData ? constractStoreData.email : undefined,
      votes: votes,
      isJuror: isJuror,
      hasRuled: hasRuled,
      ruling: ruling,
      evidence: evidence
    })
  }
}

export default Disputes
