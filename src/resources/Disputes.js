import _ from 'lodash'

import * as arbitratorConstants from '../constants/arbitrator'
import * as disputeConstants from '../constants/dispute'
import isRequired from '../utils/isRequired'

/**
 * Disputes API. Provides cross arbitrator and arbitrable contracts functionality.
 * Requires Store Provider to be set.
 */
class Disputes {
  constructor(
    arbitratorInstance = isRequired('arbitratorInstance'),
    arbitrableInstance = isRequired('arbitrableInstance'),
    storeProviderInstance = isRequired('storeProviderInstance')
  ) {
    this._ArbitratorInstance = arbitratorInstance
    this._ArbitrableInstance = arbitrableInstance
    this._StoreProviderInstance = storeProviderInstance
    this.disputeCache = {}
  }
  /**
   * Set arbitrator instance.
   * @param {object} arbitratorInstance - instance of an arbitrator contract.
   */
  setArbitratorInstance = arbitratorInstance => {
    this._ArbitratorInstance = arbitratorInstance
  }
  /**
   * Set arbitrable instance.
   * @param {object} arbitrableInstance - instance of an arbitrable contract.
   */
  setArbitrableInstance = arbitrableInstance => {
    this._ArbitrableInstance = arbitrableInstance
  }
  /**
   * Set store provider instance.
   * @param {object} storeProviderInstance - instance of store provider wrapper.
   */
  setStoreProviderInstance = storeProviderInstance => {
    this._StoreProviderInstance = storeProviderInstance
  }

  // **************************** //
  // *         Events           * //
  // **************************** //

  /**
   * Method to register all dispute handlers to an EventListener.
   * @param {string} account - The address of the user.
   * @param {object} eventListener - The EventListener instance. See utils/EventListener.js.
   */
  registerStoreUpdateEventListeners = (
    account = isRequired('account'),
    eventListener = isRequired('eventListener')
  ) => {
    const eventHandlerMap = {
      DisputeCreation: [this._storeNewDisputeHandler]
    }

    for (let event in eventHandlerMap) {
      if (eventHandlerMap.hasOwnProperty(event)) {
        eventHandlerMap[event].forEach(handler => {
          eventListener.addEventHandler(this._ArbitratorInstance, event, args =>
            handler(args, account)
          )
        })
      }
    }
  }

  /**
   * Event listener handler that stores dispute in store upon creation
   * @param {string} event - The event log.
   * @param {string} account - Account of user to update store data for
   */
  _storeNewDisputeHandler = async (event, account) => {
    // There is no need to handle this event if we are not using the store
    const disputeID = event.args._disputeID.toNumber()

    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
    // arbitrator data
    const disputeData = await this._ArbitratorInstance.getDispute(disputeID)
    // arbitrable contract data
    await this._ArbitrableInstance.setContractInstance(
      disputeData.arbitrableContractAddress
    )

    const arbitrableContractData = await this._ArbitrableInstance.getData(
      account
    )

    if (
      account === arbitrableContractData.partyA ||
      account === arbitrableContractData.partyB
    ) {
      await this._StoreProviderInstance.updateDisputeProfile(
        account,
        arbitratorAddress,
        disputeID,
        {
          contractAddress: disputeData.arbitrableContractAddress,
          partyA: arbitrableContractData.partyA,
          partyB: arbitrableContractData.partyB,
          blockNumber: event.blockNumber
        }
      )
    }
  }

  // **************************** //
  // *        Internal          * //
  // **************************** //

  /**
   * Add new data to the cache
   * @param {number} disputeID - The index of the dispute. Used as the key in cache
   * @param {object} newCacheData - Freeform data to cache. Will overwrite data with the same keys.
   */
  _updateDisputeCache = (disputeID, newCacheData = {}) => {
    this.disputeCache[disputeID] = {
      ...this.disputeCache[disputeID],
      ...newCacheData
    }
  }

  /**
   * Get the block at which a dispute was created. Used to find timestamps for dispute.
   * The start block is cached after it has been found once as it will never change.
   * @param {number} disputeID - The index of the dispute.
   * @param {string} account - The address of the user.
   * @returns {number} The block number that the dispute was created.
   */
  _getDisputeStartBlock = async (disputeID, account) => {
    const cachedDispute = this.disputeCache[disputeID]
    if (cachedDispute && cachedDispute.startBlock)
      return cachedDispute.startBlock

    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()

    let blockNumber

    try {
      const userData = await this._StoreProviderInstance.getDispute(
        account,
        arbitratorAddress,
        disputeID
      )
      blockNumber = userData.blockNumber
      // eslint-disable-next-line no-unused-vars
    } catch (err) {}
    // if block number is not stored we can look it up
    if (!blockNumber) {
      // Fetching a dispute will fail if it hasn't been added to the store yet. This is ok, we can just not return store data
      // see if we can get dispute start block from events
      const disputeCreationEvent = await this._ArbitratorInstance.getDisputeCreationEvent(
        disputeID
      )
      if (disputeCreationEvent) {
        blockNumber = disputeCreationEvent.blockNumber
      }
    }

    // cache start block for dispute
    this._updateDisputeCache(disputeID, { startBlock: blockNumber })
    return blockNumber
  }

  // **************************** //
  // *          Public          * //
  // **************************** //
  /**
   * Fetch the shared dispute data from the store.
   * @param {string} account - The users account.
   * @param {string} disputeID - The index of the dispute.
   * @returns {Promise} The dispute data in the store.
   */
  getDisputeFromStore = async (account, disputeID) => {
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
    return this._StoreProviderInstance.getDispute(
      account,
      arbitratorAddress,
      disputeID
    )
  }

  /**
   * Get the dispute deadline for the appeal.
   * @param {number} disputeID - The index of the dispute.
   * @param {number} appeal - The appeal number. 0 if there have been no appeals.
   * @returns {number} timestamp of the appeal
   */
  getDisputeDeadline = async (disputeID, appeal = 0) => {
    const cachedDispute = this.disputeCache[disputeID] || {}
    if (cachedDispute.appealDeadlines && cachedDispute.appealDeadlines[appeal])
      return cachedDispute.appealDeadlines[appeal]

    const dispute = await this._ArbitratorInstance.getDispute(disputeID)

    const deadlineTimestamp = await this._ArbitratorInstance.getDisputeDeadlineTimestamp(
      dispute.firstSession + appeal
    )

    if (deadlineTimestamp) {
      const currentDeadlines = cachedDispute.appealDeadlines || []
      currentDeadlines[appeal] = deadlineTimestamp
      // cache the deadline for the appeal
      this._updateDisputeCache(disputeID, {
        appealDeadlines: currentDeadlines
      })
    }

    return deadlineTimestamp
  }

  /**
   * Get the timestamp on when the dispute's ruling was finalized.
   * @param {number} disputeID - The index of the dispute.
   * @param {number} appeal - The appeal number. 0 if there have been no appeals.
   * @returns {number} timestamp of the appeal
   */
  getAppealRuledAt = async (disputeID, appeal = 0) => {
    const cachedDispute = this.disputeCache[disputeID] || {}
    if (
      cachedDispute.appealRuledAt &&
      cachedDispute.appealRuledAt[appeal]
    )
      return cachedDispute.appealRuledAt[appeal]

    const dispute = await this._ArbitratorInstance.getDispute(disputeID)
    const appealRuledAtTimestamp = await this._ArbitratorInstance.getAppealRuledAtTimestamp(
      dispute.firstSession + appeal
    )

    // cache the deadline for the appeal
    if (appealRuledAtTimestamp) {
      const currentRuledAt = cachedDispute.appealRuledAt || []
      currentRuledAt[appeal] = appealRuledAtTimestamp
      this._updateDisputeCache(disputeID, {
        appealRuledAt: currentRuledAt
      })
    }

    return appealRuledAtTimestamp
  }

  /**
   * Get the timestamp on when the dispute's appeal was created
   * @param {number} disputeID - The index of the dispute.
   * @param {string} account - The users address.
   * @param {number} appeal - The appeal number. 0 if there have been no appeals.
   * @returns {number} timestamp of the appeal
   */
  getAppealCreatedAt = async (disputeID, account, appeal = 0) => {
    const cachedDispute = this.disputeCache[disputeID] || {}
    if (
      cachedDispute.appealCreatedAt &&
      cachedDispute.appealCreatedAt[appeal]
    )
      return cachedDispute.appealCreatedAt[appeal]

    const dispute = await this._ArbitratorInstance.getDispute(disputeID)

    let appealCreatedAtTimestamp = null
    if (appeal === 0) {
      const creationBlock = await this._getDisputeStartBlock(disputeID, account)
      if (creationBlock) {
        const timestampSeconds = await this._ArbitratorInstance._getTimestampForBlock(
          creationBlock
        )

        appealCreatedAtTimestamp = timestampSeconds * 1000
      }
    } else {
      appealCreatedAtTimestamp = await this._ArbitratorInstance.getAppealCreationTimestamp(
        dispute.firstSession + (appeal - 1) // appeal was created during previous session
      )

      // cache the deadline for the appeal
      if (appealCreatedAtTimestamp) {
        const currentCreatedAt = cachedDispute.appealCreatedAt || []
        currentCreatedAt[appeal] = appealCreatedAtTimestamp
        this._updateDisputeCache(disputeID, {
          appealCreatedAt: currentCreatedAt
        })
      }
    }

    return appealCreatedAtTimestamp
  }

  /**
   * Get data for a dispute. This method provides data from the store as well as both
   * arbitrator and arbitrable contracts. Used to get all relevant data on a dispute.
   * @param {number} disputeID - The dispute's ID.
   * @param {string} account - The juror's address.
   * @returns {object} - Data object for the dispute that uses data from the contract and the store.
   */
  getDataForDispute = async (disputeID, account) => {
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
    // Get dispute data from contract. Also get the current session and period.
    const [dispute, period, session] = await Promise.all([
      this._ArbitratorInstance.getDispute(disputeID, true),
      this._ArbitratorInstance.getPeriod(),
      this._ArbitratorInstance.getSession()
    ])

    // Get arbitrable contract data and evidence
    const arbitrableContractAddress = dispute.arbitrableContractAddress
    await this._ArbitrableInstance.setContractInstance(
      arbitrableContractAddress
    )
    const [metaEvidence, evidence, parties] = await Promise.all([
      this._ArbitrableInstance.getMetaEvidence(),
      this._ArbitrableInstance.getEvidence(),
      this._ArbitrableInstance.getParties()
    ])

    // Get dispute data from the store
    let appealDraws = []

    // get draws if they have been added to store.
    try {
      const userData = await this._StoreProviderInstance.getDispute(
        account,
        arbitratorAddress,
        disputeID
      )
      if (userData.appealDraws) appealDraws = userData.appealDraws || []
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Dispute exists on chain but not in store. We have lost draws for past disputes.
      console.error('Dispute does not exist in store.')
    }

    const netPNK = await this._ArbitratorInstance.getNetTokensForDispute(
      disputeID,
      account
    )

    // Build juror info and ruling arrays, indexed by appeal number
    const lastSession = dispute.firstSession + dispute.numberOfAppeals
    const appealJuror = []
    const appealRulings = []

    for (let appeal = 0; appeal <= dispute.numberOfAppeals; appeal++) {
      const isLastAppeal = dispute.firstSession + appeal === lastSession
      // Get appeal data
      const draws = appealDraws[appeal] || []
      let canRule = false
      let canRepartition = false
      let canExecute = false
      let ruling
      const rulingPromises = [
        this._ArbitratorInstance.currentRulingForDispute(disputeID, appeal)
      ]

      // Extra info for the last appeal
      if (isLastAppeal) {
        if (draws.length > 0)
          rulingPromises.push(
            this._ArbitratorInstance.canRuleDispute(disputeID, draws, account)
          )

        if (session && period)
          canRepartition =
            lastSession <= session && // Not appealed to the next session
            period === arbitratorConstants.PERIOD.EXECUTE && // Executable period
            dispute.state === disputeConstants.STATE.OPEN // Open dispute
        canExecute = dispute.state === disputeConstants.STATE.EXECUTABLE // Executable state
      }

      // Wait for parallel requests to complete
      ;[ruling, canRule] = await Promise.all(rulingPromises)

      let jurorRuling = null
      // if can't rule that means they already did or they missed it
      if (!canRule) {
        jurorRuling = await this._ArbitratorInstance.getVoteForJuror(
          dispute.disputeID,
          appeal,
          account
        )
      }

      const appealCreatedAt = await this.getAppealCreatedAt(
        dispute.disputeID,
        account,
        appeal
      )
      const appealDeadline = await this.getDisputeDeadline(
        dispute.disputeID,
        appeal
      )
      const appealRuledAt = await this.getAppealRuledAt(
        dispute.disputeID,
        appeal
      )

      appealJuror[appeal] = {
        createdAt: appealCreatedAt,
        fee: dispute.arbitrationFeePerJuror.mul(draws.length),
        draws,
        jurorRuling,
        canRule
      }
      appealRulings[appeal] = {
        voteCounter: dispute.voteCounters[appeal],
        deadline: appealDeadline,
        ruledAt: appealRuledAt,
        ruling,
        canRepartition,
        canExecute
      }
    }

    return {
      // Arbitrable Contract Data
      arbitrableContractAddress,
      arbitratorAddress,
      parties,
      evidence,
      metaEvidence,

      // Dispute Data
      disputeID,
      firstSession: dispute.firstSession,
      lastSession,
      numberOfAppeals: dispute.numberOfAppeals,
      disputeState: dispute.state,
      disputeStatus: dispute.status,
      appealJuror,
      appealRulings,
      netPNK
    }
  }
}

export default Disputes
