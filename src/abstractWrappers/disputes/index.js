import AbstractWrapper from '../AbstractWrapper'
import {
  NULL_ADDRESS,
  VOTING_PERIOD,
  DEFAULT_ARBITRATION_COST,
  DISPUTE_STATUS
} from '../../../constants'
import _ from 'lodash'

/**
 * Disputes api
 */
class Disputes extends AbstractWrapper {
  /**
   * Disputes Constructor
   * @param storeProvider store provider object
   * @param arbitratorWrapper arbitrator contract wrapper object
   * @param arbitrableWrapper arbitrable contract wrapper object
   */
  constructor(storeProvider, arbitratorWrapper, arbitrableWrapper) {
    super(storeProvider, arbitratorWrapper, arbitrableWrapper)
  }

  /**
  * Pay the arbitration fee to raise a dispute. To be called by the party A.
  * @param account Ethereum account
  * @param arbitrableContract Address address of arbitrable contract
  * @param arbitrationCost Amount to pay the arbitrator
  * @return txHash hash transaction | Error
  */
  raiseDisputePartyA = async (
    account,
    arbitrableContractAddress,
    arbitrationCost = DEFAULT_ARBITRATION_COST
  ) => {
    this._checkArbitrableWrappersSet()

    const txHash = await this._ArbitrableContract.payArbitrationFeeByPartyA(
      account,
      arbitrableContractAddress,
      arbitrationCost
    )

    if (!txHash) throw new Error("unable to pay arbitration fee for party A")

    // update store if there is a dispute
    await this._storeNewDispute(arbitrableContractAddress, account)

    return txHash
  }

  /**
  * Pay the arbitration fee to raise a dispute. To be called by the party B.
  * @param account Ethereum account
  * @param arbitrableContract Address address of arbitrable contract
  * @param arbitrationCost Amount to pay the arbitrator
  * @return txHash hash transaction | Error
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

    if (!txHash) throw new Error("unable to pay arbitration fee for party B")

    // update store if there is a dispute
    await this._storeNewDispute(arbitrableContractAddress)

    return txHash
  }

  /**
  * If there is a dispute in contract update store
  * @param contractAddress
  * @param account
  * @return Boolean
  */
  _storeNewDispute = async (
    arbitrableContractAddress,
    account
  ) => {
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()

    const arbitrableContractData = await this._ArbitrableContract.getData(arbitrableContractAddress)

    if (arbitrableContractData.status === DISPUTE_STATUS) {
      await this._updateStoreForDispute(arbitrableContractAddress, account)
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
    let myDisputes = []
    // new jurors have not been chosen yet. don't update
    if (period !== VOTING_PERIOD) {
      let disputes = await this._StoreProvider.getDisputesForUser(account)
      disputes = await Promise.all(disputes.map(async (dispute) => {
        return await this.getDataForDispute(dispute.contractAddress, account)
      }))

      return disputes
    }

    if (currentSession != profile.session) {
      // get disputes for juror
      myDisputes = await this.getDisputesForJuror(arbitratorAddress, account)
      // update store for each dispute
      for (let i=0; i<myDisputes.length; i++) {
        await this._updateStoreForDispute(myDisputes[i].arbitrableContractAddress, account)
      }
      // update session on profile
      profile = await this._StoreProvider.getUserProfile(account)
      profile.session = currentSession
      await this._StoreProvider.updateUserProfile(account, profile)
    }

    // return array of all disputes for user
    let disputes = await this._StoreProvider.getDisputesForUser(account)
    disputes = await Promise.all(disputes.map(async (dispute) => {
      return await this.getDataForDispute(dispute.contractAddress, account)
    }))

    return disputes
  }

  /**
  * get the deadline for dispute
  * @param arbitratorAddress address of arbitrator contract
  * @param period default to voting period
  * @return date object
  */
  getDeadlineForDispute = async (
    arbitratorAddress,
    period = VOTING_PERIOD
  ) => {
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress)
    // compute end date
    const startTime = arbitratorData.lastPeriodChange
    const length = await this._Arbitrator.getTimeForPeriod(arbitratorAddress, period)
    // FIXME this is all UTC for now. Timezones are a pain
    const deadline = new Date(0);
    deadline.setUTCSeconds(startTime)
    deadline.setSeconds(deadline.getSeconds() + length);

    return deadline
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
    this._checkArbitratorWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress, account)
    const myDisputes = []
    let disputeId = 0
    const currentSession = arbitratorData.session


    let dispute
    while (1) {
      // iterate over all disputes (FIXME inefficient)
      try {
         dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)

         // session + number of appeals
         const disputeSession = dispute.firstSession + dispute.numberOfAppeals
         // if dispute not in current session skip
         if (disputeSession !== currentSession) {
           disputeId++
           dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
           continue
         }

         const votes = await this.getVotesForJuror(disputeId, arbitratorAddress, account)
         if (votes.length > 0) {
           const disputeData = await this.getDataForDispute(dispute.arbitratedContract, account)
           myDisputes.push(
             disputeData
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
  * @param disputeId id of the dispute
  * @param arbitratorAddress address of the arbitrator contract
  * @param account potential jurors address
  */
  getVotesForJuror = async (
    disputeId,
    arbitratorAddress,
    account
  ) => {
    const numberOfJurors = await this._Arbitrator.getAmountOfJurorsForDispute(arbitratorAddress, disputeId)
    const votes = []
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
   * @param contractAddress address of KlerosPOC contract
   * @param disputeId index of the dispute
   * @param ruling int representing the jurors decision
   * @param votes int[] of drawn votes for dispute
   * @param account address of user
   * @return transaction hash | Error
   */
  submitVotesForDispute = async (
    arbitratorAddress,
    disputeId,
    ruling,
    votes,
    hash,
    account
  ) => {
    const txHash = await this._Arbitrator.submitVotes(
      arbitratorAddress,
      disputeId,
      ruling,
      votes,
      hash,
      account
    )

    if (txHash) {
      // mark in store that you have ruled on dispute
      await this._StoreProvider.updateDisputeProfile(
        account,
        votes,
        hash,
        true,
        true
      )

      return txHash
    } else {
      throw new Error("unable to submit votes")
    }
  }

  /**
  * update store with new dispute data
  * @param arbitrableContract Address address of arbitrable contract
  * @param jurorAddress <optional> address of juror
  */
  _updateStoreForDispute = async (
    arbitrableContractAddress,
    jurorAddress
  ) => {
    const disputeData = await this.getDataForDispute(
      arbitrableContractAddress,
      jurorAddress
    )

    // update dispute
    await this._StoreProvider.updateDispute(
      disputeData.disputeId,
      disputeData.hash,
      disputeData.arbitrableContractAddress,
      disputeData.partyA,
      disputeData.partyB,
      disputeData.title,
      disputeData.deadline,
      disputeData.status,
      disputeData.fee,
      disputeData.information,
      disputeData.justification,
      disputeData.resolutionOptions
    )

    // update profile partyA
    await this._StoreProvider.updateDisputeProfile(
      disputeData.partyA,
      [],
      disputeData.hash,
      false,
      false
    )

    // update profile partyB
    await this._StoreProvider.updateDisputeProfile(
      disputeData.partyB,
      [],
      disputeData.hash,
      false,
      false
    )

    if (jurorAddress) {
      // update juror profile <optional>
      await this._StoreProvider.updateDisputeProfile(
        jurorAddress,
        disputeData.votes,
        disputeData.hash,
        disputeData.votes.length > 0 ? true : false,
        false
      )
    }
  }

  /**
  * get data for a dispute
  * @param arbitrableContract Address address for arbitrable contract
  * @param account <optional> jurors address
  */
  getDataForDispute = async (
    arbitrableContractAddress,
    account
  ) => {
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()

    const arbitrableContractData = await this._ArbitrableContract.getData(arbitrableContractAddress)
    const arbitratorAddress = arbitrableContractData.arbitrator
    const storeData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )

    const disputeId = arbitrableContractData.disputeId
    if (disputeId === undefined) throw new Error(`Arbitrable contract ${arbitrableContractAddress} does not have a dispute`)

    const dispute = this._Arbitrator.getDispute(arbitratorAddress, disputeId)

    let votes = []
    if (account) {
      votes = await this.getVotesForJuror(disputeId, arbitratorAddress, account)
    }

    const deadline = await this.getDeadlineForDispute(arbitratorAddress)

    return ({
      // FIXME hash not being stored in contract atm
      hash: arbitrableContractAddress,
      partyA: arbitrableContractData.partyA,
      partyB: arbitrableContractData.partyB,
      status: arbitrableContractData.status,
      arbitrableContractAddress: arbitrableContractAddress,
      arbitratorAddress: arbitratorAddress,
      fee: dispute.arbitrationFeePerJuror,
      disputeId: disputeId,
      votes: votes,
      session: dispute.session + dispute.appeals,
      // FIXME
      resolutionOptions: [
        {
          name: `Pay ${arbitrableContractData.partyA}`,
          description: `Release funds to ${arbitrableContractData.partyA}`,
          value: 1
        },
        {
          name: `Pay ${arbitrableContractData.partyB}`,
          description: `Release funds to ${arbitrableContractData.partyB}`,
          value: 2
        }
      ],
      deadline: deadline,
      // store data
      description: storeData.description,
      email: storeData.email
    })
  }
}

export default Disputes
