import _ from 'lodash'

import * as ethConstants from '../constants/eth'
import * as arbitratorConstants from '../constants/arbitrator'
import * as contractConstants from '../constants/contract'

import AbstractWrapper from './AbstractWrapper'

/**
 * Disputes API.
 */
class Disputes extends AbstractWrapper {
  // **************************** //
  // *         Events           * //
  // **************************** //

  /**
   * If there is a dispute in contract update store.
   * FIXME contracts with multiple disputes will need a way to clarify that this is a new dispute
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - The account.
   */
  addDisputeEventListener = async (arbitratorAddress, account) => {
    if (!this._eventListener) return

    const _disputeCreatedHandler = async (
      event,
      contractAddress = arbitratorAddress,
      address = account
    ) => {
      console.log("adding dispute for " + address)
      const disputeId = event.args._disputeID.toNumber()
      const disputeData = await this.getDataForDispute(
        contractAddress,
        disputeId,
        account
      )
      // if listener is a party in dispute add to store
      if (disputeData.partyA === address || disputeData.partyB === address) {
        console.log("should be for partyA")
        const blockNumber = event.blockNumber
        const block = this._Arbitrator._Web3Wrapper.getBlock(blockNumber)

        // add new dispute with timestamp
        const dispute = await this._updateStoreForDispute(contractAddress, disputeId, address, block.timestamp)
      }
    }

    await this._eventListener.registerArbitratorEvent(
      'DisputeCreation',
      _disputeCreatedHandler
    )
  }

  /**
   * Add TokenShift event handler to EventListener.
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - The account.
   */
  addTokenShiftToJurorProfileEventListener = async (
    arbitratorAddress,
    account
  ) => {
    if (!this._eventListener) return

    const defaultAccount = account
    const _tokenShiftHandler = async (
      event,
      contractAddress = arbitratorAddress,
      address = defaultAccount
    ) => {
      const disputeId = event.args._disputeID.toNumber()
      const account = event.args._account
      const amountShift = event.args._amount.toNumber()
      // juror won/lost tokens
      if (account === address) {
        const userProfile = await this._StoreProvider.getUserProfile(address)
        const disputeIndex = _.findIndex(
          userProfile.disputes,
          dispute =>
            dispute.disputeId === disputeId &&
            dispute.arbitratorAddress === contractAddress
        )

        // if dispute is not in store ignore
        if (disputeIndex < 0) return
        const dispute = userProfile.disputes[disputeIndex]
        await this._StoreProvider.updateDisputeProfile(
          address,
          dispute.votes,
          dispute.arbitratorAddress,
          dispute.disputeId,
          dispute.isJuror,
          dispute.hasRuled,
          (dispute.netPNK ? dispute.netPNK : 0) + amountShift
        )
      }
    }

    await this._eventListener.registerArbitratorEvent(
      'TokenShift',
      _tokenShiftHandler
    )
  }

  addDisputeRulingHandler = async (
    arbitratorAddress,
    account,
    callback
  ) => {
    if (!this._eventListener) return

    const _disputeRulingHandler = async (
      event,
      contractAddress = arbitratorAddress,
      address = account,
      notificationCallback = callback
    ) => {
      console.log("in handler")
      const newPeriod = event.args._period.toNumber()
      const txHash = event.transactionHash
      // send appeal possible notifications
      if (newPeriod === PERIODS.APPEAL) {
        console.log("doing the do")
        this._checkArbitratorWrappersSet()
        const userProfile = await this._StoreProvider.getUserProfile(address)
        // contract data
        const arbitratorData = await this._Arbitrator.getData(contractAddress, address)
        const currentDisputes = []
        let disputeId = 0
        const currentSession = arbitratorData.session

        let dispute
        while (1) {
          // iterate over all disputes (FIXME inefficient)
          try {
             dispute = await this._Arbitrator.getDispute(contractAddress, disputeId)
             if (dispute.arbitratedContract === NULL_ADDRESS) break
             // session + number of appeals
             const disputeSession = dispute.firstSession + dispute.numberOfAppeals
             // if dispute not in current session skip
             if (disputeSession !== currentSession) {
               disputeId++
               dispute = await this._Arbitrator.getDispute(contractAddress, disputeId)
               continue
             }

             const ruling = await this._Arbitrator.currentRulingForDispute(contractAddress, disputeId)

             if (_.findIndex(userProfile.disputes, dispute => {
               return (dispute.disputeId === disputeId && dispute.arbitratorAddress === contractAddress)
             }) >= 0) {
               await this._StoreProvider.newNotification(
                 address,
                 txHash,
                 disputeId, // use disputeId instead of logIndex since it doens't have its own event
                 NOTIFICATION_TYPES.APPEAL_POSSIBLE,
                 'A ruling has been made. Appeal is possible',
                 {
                   disputeId,
                   contractAddress,
                   ruling
                 }
               )
               // get ruledAt from block timestamp
               const blockNumber = event.blockNumber
               const block = this._Arbitrator._Web3Wrapper.getBlock(blockNumber)
               // add ruledAt to store
               await this._updateStoreForDispute(contractAddress, disputeId, address, null, block.timestamp)

               if (callback) {
                 const userProfile = await this._StoreProvider.getUserProfile(address)
                 const notification = _.filter(userProfile.notifications, notification => {
                   return (notification.txHash === txHash && notification.logIndex === disputeId)
                 })

                 if (notification) {
                   callback(notification[0])
                 }
               }
             }
             // check next dispute
             disputeId += 1
          } catch (e) {
            // getDispute(n) throws an error if index out of range
            break
          }
        }
      }
    }

    await this._eventListener.registerArbitratorEvent('NewPeriod', _disputeRulingHandler)
  }

  // **************************** //
  // *          Public          * //
  // **************************** //

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param {string} account - Ethereum account.
   * @param {string} arbitrableContractAddress - Address address of arbitrable contract.
   * @param {number} [arbitrationCost=DEFAULT_ARBITRATION_FEE] - Amount to pay the arbitrator.
   * @returns {string} - txHash hash transaction | Error.
   */
  raiseDisputePartyA = async (
    account,
    arbitrableContractAddress,
    arbitrationCost = arbitratorConstants.DEFAULT_ARBITRATION_FEE
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
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param {string} account - Ethereum account.
   * @param {string} arbitrableContractAddress - Address address of arbitrable contract.
   * @param {number} [arbitrationCost=DEFAULT_ARBITRATION_FEE] - Amount to pay the arbitrator.
   * @returns {string} - txHash hash of the transaction | Error.
   */
  raiseDisputePartyB = async (
    account,
    arbitrableContractAddress,
    arbitrationCost = arbitratorConstants.DEFAULT_ARBITRATION_FEE
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
  getDisputesForUser = async (arbitratorAddress, account) => {
    // FIXME don't like having to call this every fnc
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(
      arbitratorAddress,
      account
    )

    // fetch user profile
    let profile = await this._StoreProvider.setUpUserProfile(account)
    // fetch current contract period
    const period = arbitratorData.period
    const currentSession = arbitratorData.session
    // new jurors have not been chosen yet. don't update

    const _getDisputesForUserFromStore = async account => {
      let disputes = await this._StoreProvider.getDisputesForUser(account)
      disputes = await Promise.all(
        disputes.map(dispute =>
          this.getDataForDispute(
            dispute.arbitratorAddress,
            dispute.disputeId,
            account
          )
        )
      )

      return disputes
    }

    if (period !== arbitratorConstants.PERIOD.VOTE) {
      return _getDisputesForUserFromStore(account)
    }

    if (currentSession !== profile.session) {
      // get disputes for juror
      const myDisputeIds = await this.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // update store for each dispute
      await Promise.all(
        myDisputeIds.map(async disputeId => {
          // add dispute to db if it doesn't already exist
          await this._updateStoreForDispute(
            arbitratorAddress,
            disputeId,
            account
          )
        })
      )

      // update session on profile
      profile = await this._StoreProvider.getUserProfile(account)
      profile.session = currentSession
      await this._StoreProvider.updateUserProfile(account, profile)
    }

    return _getDisputesForUserFromStore(account)
  }

  /**
   * Get disputes from Kleros contract.
   * @param {string} arbitratorAddress - Address of Kleros contract.
   * @param {string} account - Address of user.
   * @returns {int[]} - Array of dispute id's.
   */
  getDisputesForJuror = async (arbitratorAddress, account) => {
    // FIXME don't like having to call this every fnc
    this._checkArbitratorWrappersSet()
    // contract data
    const arbitratorData = await this._Arbitrator.getData(
      arbitratorAddress,
      account
    )
    const myDisputes = []
    let disputeId = 0
    const currentSession = arbitratorData.session

    let dispute
    while (1) {
      // iterate over all disputes (FIXME inefficient)
      // IDEA iterate over DisputeCreated events between last session and this session
      try {
        dispute = await this._Arbitrator.getDispute(
          arbitratorAddress,
          disputeId
        )
        if (dispute.arbitratedContract === ethConstants.NULL_ADDRESS) break
        // session + number of appeals
        const disputeSession = dispute.firstSession + dispute.numberOfAppeals
        // if dispute not in current session skip
        if (disputeSession !== currentSession) {
          disputeId++
          dispute = await this._Arbitrator.getDispute(
            arbitratorAddress,
            disputeId
          )
          continue
        }

        const votes = await this.getVotesForJuror(
          arbitratorAddress,
          disputeId,
          account
        )
        if (votes.length > 0) {
          myDisputes.push(disputeId)
        }
        // check next dispute
        disputeId += 1
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        break
      }
    }

    return myDisputes
  }

  /**
   * Fetch the votes a juror has in a dispute.
   * @param {string} arbitratorAddress - Address of the arbitrator contract.
   * @param {number} disputeId - ID of the dispute.
   * @param {string} account - Potential jurors address.
   * @returns {number[]} - Array of integers indicating the draw.
   */
  getVotesForJuror = async (arbitratorAddress, disputeId, account) => {
    const numberOfJurors = await this._Arbitrator.getAmountOfJurorsForDispute(
      arbitratorAddress,
      disputeId
    )
    const votes = []
    // FIXME map doesn't seem to make sense here. would need to construct array of possible choices and then filter?
    for (let draw = 1; draw <= numberOfJurors; draw++) {
      const isJuror = await this._Arbitrator.isJurorDrawnForDispute(
        disputeId,
        draw,
        arbitratorAddress,
        account
      )
      if (isJuror) {
        votes.push(draw)
      }
    }

    return votes
  }

  /**
   * Submit votes. Note can only be called during Voting period (Period 2).
   * @param {string} arbitratorAddress - Address of KlerosPOC contract.
   * @param {number} disputeId - Index of the dispute.
   * @param {number} ruling - Int representing the jurors decision.
   * @param {number[]} votes - Int[] of drawn votes for dispute.
   * @param {string} account - Address of user.
   * @returns {string} - Transaction hash | Error.
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
      // Mark in store that you have ruled on dispute
      await this._StoreProvider.updateDisputeProfile(
        account,
        votes,
        arbitratorAddress,
        disputeId,
        true,
        true,
        0
      )

      return txHash
    } else {
      throw new Error('unable to submit votes')
    }
  }

  /**
   * Gets the deadline for an arbitrator's period, which is also the deadline for all its disputes.
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {number} [period=arbitratorConstants.PERIOD.VOTE] - The period to get the deadline for.
   * @returns {Date} - A date object.
   */
  getDeadlineForDispute = async (
    arbitratorAddress,
    period = arbitratorConstants.PERIOD.VOTE
  ) => {
    // Get arbitrator data
    const arbitratorData = await this._Arbitrator.getData(arbitratorAddress)

    // Last period change + current period duration = deadline
    return (
      1000 *
      (arbitratorData.lastPeriodChange +
        (await this._Arbitrator.getTimeForPeriod(arbitratorAddress, period)))
    )
  }

  /**
  * update store with new dispute data
  * @param {string} arbitratorAddress Address address of arbitrator contract
  * @param {int} disputeId index of dispute
  * @param {string} account address of party to update dispute or
  */
  _updateStoreForDispute = async (
    arbitratorAddress,
    disputeId,
    account,
    createdAt,
    ruledAt
  ) => {
    const disputeData = await this.getDataForDispute(
      arbitratorAddress,
      disputeId,
      account
    )

    // update dispute
    await this._StoreProvider.updateDispute(
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
      disputeData.resolutionOptions,
      createdAt ? createdAt : disputeData.createdAt,
      ruledAt ? ruledAt : disputeData.ruledAt
    ).body

    // update profile for account
    await this._StoreProvider.updateDisputeProfile(
      account,
      disputeData.votes,
      disputeData.arbitratorAddress,
      disputeData.disputeId,
      disputeData.votes.length > 0,
      disputeData.hasRuled,
      disputeData.netPNK ? disputeData.netPNK : 0
    )

    return dispute
  }

  /**
   * Get user data for a dispute from the store.
   * @param {string} arbitratorAddress - Address for arbitrator contract.
   * @param {int} disputeId - Index of dispute.
   * @param {string} account - Jurors address.
   * @returns {object} - Dispute data from store for user.
   */
  getUserDisputeFromStore = async (arbitratorAddress, disputeId, account) => {
    const userProfile = await this._StoreProvider.getUserProfile(account)

    const disputeArray = _.filter(
      userProfile.disputes,
      dispute =>
        dispute.disputeId === disputeId &&
        dispute.arbitratorAddress === arbitratorAddress
    )

    if (_.isEmpty(disputeArray))
      throw new Error(`User ${account} does not have store data for dispute`)

    return disputeArray[0]
  }

  /**
   * Get evidence for contract.
   * @param {string} arbitrableContractAddress - Address of arbitrable contract.
   * @returns {object[]} - Array of evidence objects.
   */
  getEvidenceForArbitrableContract = async arbitrableContractAddress => {
    this._checkArbitrableWrappersSet()

    const arbitrableContractData = await this._ArbitrableContract.getData(
      arbitrableContractAddress
    )
    const partyAContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )
    const partyBContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyB,
      arbitrableContractAddress
    )

    const partyAEvidence = (partyAContractData
      ? partyAContractData.evidences
      : []
    ).map(evidence => {
      evidence.submitter = arbitrableContractData.partyA
      return evidence
    })
    const partyBEvidence = (partyBContractData
      ? partyBContractData.evidences
      : []
    ).map(evidence => {
      evidence.submitter = arbitrableContractData.partyB
      return evidence
    })

    return partyAEvidence.concat(partyBEvidence)
  }

  /**
   * Get ruling options for dispute.
   * @param {string} arbitratorAddress - Address of arbitrator contract.
   * @param {string} disputeId - Dispute ID.
   * @returns {object[]} - Array of ruling objects.
   */
  getRulingOptions = async (arbitratorAddress, disputeId) => {
    const dispute = await this._Arbitrator.getDispute(
      arbitratorAddress,
      disputeId
    )
    if (!dispute) {
      throw new Error(
        `Cannot fetch ruling options: Dispute from arbitrator ${arbitratorAddress} with disputeId: ${disputeId} does not exist`
      )
    }
    const arbitrableContractAddress = dispute.arbitratedContract

    return this._ArbitrableContract.getRulingOptions(
      arbitrableContractAddress,
      arbitratorAddress,
      disputeId
    )
  }

  /**
   * Get data for a dispute.
   * @param {string} arbitratorAddress - Address for arbitrator contract.
   * @param {number} disputeId - Index of dispute.
   * @param {string} account - Juror account address.
   * @returns {object} - Data object for dispute that uses data from the contract and store.
   */
  getDataForDispute = async (arbitratorAddress, disputeId, account) => {
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()

    // FIXME should we just return what we have in the store?
    const dispute = await this._Arbitrator.getDispute(
      arbitratorAddress,
      disputeId
    )
    if (!dispute) {
      throw new Error(
        `Dispute with arbitrator: ${arbitratorAddress} and disputeId: ${disputeId} does not exist`
      )
    }
    const arbitrableContractAddress = dispute.arbitratedContract

    const arbitrableContractData = await this._ArbitrableContract.getData(
      arbitrableContractAddress
    )
    const constractStoreData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )

    let isJuror = false
    let votes = []
    let hasRuled = false
    let netPNK = 0
    let createdAt
    let ruledAt
    if (account) {
      votes = await this.getVotesForJuror(arbitratorAddress, disputeId, account)
      try {
        const userData = await this.getUserDisputeFromStore(
          arbitratorAddress,
          disputeId,
          account
        )
        isJuror = userData.isJuror
        hasRuled = userData.hasRuled
        netPNK = userData.netPNK
        createdAt = userData.createdAt
        ruledAt = userData.ruledAt
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // fetching dispute will fail if it hasn't been added to the store yet. this is ok we can just not return store data
      }
    }

    // get evidence
    const evidence = await this.getEvidenceForArbitrableContract(
      arbitrableContractAddress
    )

    // get deadline
    const deadline = await this.getDeadlineForDispute(arbitratorAddress)

    // get ruling
    const ruling = await this._Arbitrator.currentRulingForDispute(
      arbitratorAddress,
      disputeId
    )

    return {
      // Arbitrable Contract Data
      // FIXME hash not being stored in contract atm
      hash: arbitrableContractAddress,
      arbitrableContractAddress,
      arbitrableContractStatus: arbitrableContractData.status,
      arbitratorAddress,
      partyA: arbitrableContractData.partyA,
      partyB: arbitrableContractData.partyB,

      // Dispute Data
      disputeId,
      session: dispute.firstSession + dispute.numberOfAppeals,
      numberOfAppeals: dispute.numberOfAppeals,
      fee: dispute.arbitrationFeePerJuror,
      deadline,
      disputeState: dispute.state,
      disputeStatus: dispute.status,
      voteCounters: dispute.voteCounters,

      // Store Data
      description: constractStoreData
        ? constractStoreData.description
        : undefined,
      email: constractStoreData ? constractStoreData.email : undefined,
      votes,
      isJuror,
      hasRuled,
      ruling,
      evidence,
      netPNK,
      ruledAt,
      createdAt
    })
  }
}

export default Disputes
