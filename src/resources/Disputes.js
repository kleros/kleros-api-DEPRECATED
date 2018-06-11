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
    const disputeId = event.args._disputeID.toNumber()

    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
    // arbitrator data
    const disputeData = await this._ArbitratorInstance.getDispute(disputeId)
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
        disputeId,
        {
          contractAddress: disputeData.arbitrableContractAddress,
          partyA: arbitrableContractData.partyA,
          partyB: arbitrableContractData.partyB,
          blockNumber: event.blockNumber.toNumber()
        }
      )
    }
  }

  // **************************** //
  // *        Internal          * //
  // **************************** //

  /**
   * Add new data to the cache
   * @param {number} disputeId - The index of the dispute. Used as the key in cache
   * @param {object} newCacheData - Freeform data to cache. Will overwrite data with the same keys.
   */
  _updateDisputeCache = (disputeId, newCacheData = {}) => {
    this.disputeCache[disputeId] = {
      ...this.disputeCache[disputeId],
      ...newCacheData
    }
  }

  /**
   * Get the block at which a dispute was created. Used to find timestamps for dispute.
   * The start block is cached after it has been found once as it will never change.
   * @param {number} disputeId - The index of the dispute.
   * @param {string} account - The address of the user.
   * @returns {number} The block number that the dispute was created.
   */
  _getDisputeStartBlock = async (disputeId, account) => {
    const cachedDispute = this.disputeCache[disputeId]
    if (cachedDispute && cachedDispute.startBlock)
      return cachedDispute.startBlock

    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()

    let blockNumber

    try {
      const userData = await this._StoreProviderInstance.getDispute(
        account,
        arbitratorAddress,
        disputeId
      )
      blockNumber = userData.blockNumber
      // eslint-disable-next-line no-unused-vars
    } catch (err) {}
    // if block number is not stored we can look it up
    if (!blockNumber) {
      // Fetching a dispute will fail if it hasn't been added to the store yet. This is ok, we can just not return store data
      // see if we can get dispute start block from events
      const disputeCreationEvent = await this._ArbitratorInstance.getDisputeCreationEvent(
        disputeId
      )
      if (disputeCreationEvent) {
        blockNumber = disputeCreationEvent.blockNumber
      }
    }

    // cache start block for dispute
    this._updateDisputeCache(disputeId, { startBlock: blockNumber })
    return blockNumber
  }

  // **************************** //
  // *          Public          * //
  // **************************** //
  /**
   * Fetch the shared dispute data from the store.
   * @param {string} account - The users account.
   * @param {string} disputeId - The index of the dispute.
   * @returns {Promise} The dispute data in the store.
   */
  getDisputeFromStore = async (account, disputeId) => {
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
    return this._StoreProviderInstance.getDispute(
      account,
      arbitratorAddress,
      disputeId
    )
  }

  /**
   * Get the dispute deadline for the appeal.
   * @param {number} disputeId - The index of the dispute.
   * @param {string} account - The users address.
   * @param {number} appeal - The appeal number. 0 if there have been no appeals.
   * @returns {number} timestamp of the appeal
   */
  getDisputeDeadline = async (disputeId, account, appeal = 0) => {
    const cachedDispute = this.disputeCache[disputeId] || {}
    if (
      cachedDispute.appealDeadlines &&
      cachedDispute.appealDeadlines[appeal]
    )
      return cachedDispute.appealDeadlines[appeal]

    const dispute = await this._ArbitratorInstance.getDispute(disputeId)

    const deadlineTimestamp = await this._ArbitratorInstance.getDisputeDeadlineTimestamp(
      dispute.firstSession + appeal
    )

    if (deadlineTimestamp) {
      const currentDeadlines = cachedDispute.appealDeadlines || []
      currentDeadlines[appeal] = deadlineTimestamp
      // cache the deadline for the appeal
      this._updateDisputeCache(disputeId, {
        appealDeadlines: currentDeadlines
      })
    }

    return deadlineTimestamp
  }

  /**
   * Get the timestamp on when the dispute's ruling was finalized.
   * @param {number} disputeId - The index of the dispute.
   * @param {string} account - The users address.
   * @param {number} appeal - The appeal number. 0 if there have been no appeals.
   * @returns {number} timestamp of the appeal
   */
  getAppealRuledAt = async (disputeId, account, appeal = 0) => {
    const cachedDispute = this.disputeCache[disputeId]
    if (
      cachedDispute &&
      cachedDispute.appealRuledAt &&
      cachedDispute.appealRuledAt[appeal]
    )
      return cachedDispute.appealRuledAt[appeal]

    const startBlock = await this._getDisputeStartBlock(disputeId, account)
    // if there is no start block that means that dispute has not been created yet.
    if (!startBlock) return []

    const appealRuledAtTimestamps = await this._ArbitratorInstance.getAppealRuledAtTimestamps(
      startBlock,
      appeal
    )

    // cache the deadline for the appeal
    if (appealRuledAtTimestamps.length > 0) {
      this._updateDisputeCache(disputeId, {
        appealRuledAt: appealRuledAtTimestamps
      })
    }

    return appealRuledAtTimestamps[appeal]
  }

  /**
   * Get the timestamp on when the dispute's appeal was created
   * @param {number} disputeId - The index of the dispute.
   * @param {string} account - The users address.
   * @param {number} appeal - The appeal number. 0 if there have been no appeals.
   * @returns {number} timestamp of the appeal
   */
  getAppealCreatedAt = async (disputeId, account, appeal = 0) => {
    const cachedDispute = this.disputeCache[disputeId]
    if (
      cachedDispute &&
      cachedDispute.appealCreatedAt &&
      cachedDispute.appealCreatedAt[appeal]
    )
      return cachedDispute.appealCreatedAt[appeal]

    const startBlock = await this._getDisputeStartBlock(disputeId, account)
    // if there is no start block that means that dispute has not been created yet.
    if (!startBlock) return []

    const appealCreatedAtTimestamps = await this._ArbitratorInstance.getAppealCreationTimestamps(
      startBlock,
      appeal
    )

    // cache the deadline for the appeal
    if (appealCreatedAtTimestamps) {
      this._updateDisputeCache(disputeId, {
        appealCreatedAt: appealCreatedAtTimestamps
      })
    }

    return appealCreatedAtTimestamps[appeal]
  }

  /**
   * Get data for a dispute. This method provides data from the store as well as both
   * arbitrator and arbitrable contracts. Used to get all relevant data on a dispute.
   * @param {number} disputeId - The dispute's ID.
   * @param {string} account - The juror's address.
   * @returns {object} - Data object for the dispute that uses data from the contract and the store.
   */
  getDataForDispute = async (disputeId, account) => {
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
    // Get dispute data from contract. Also get the current session and period.
    const [dispute, period, session] = await Promise.all([
      this._ArbitratorInstance.getDispute(disputeId),
      this._ArbitratorInstance.getPeriod(),
      this._ArbitratorInstance.getSession()
    ])

    // Get arbitrable contract data and evidence
    const arbitrableContractAddress = dispute.arbitrableContractAddress
    await this._ArbitrableInstance.setContractInstance(
      arbitrableContractAddress
    )
    const [arbitrableContractData, evidence] = await Promise.all([
      this._ArbitrableInstance.getData(account),
      this._ArbitrableInstance.getEvidenceForArbitrableContract(
        arbitrableContractAddress
      )
    ])
    const contractStoreData = await this._StoreProviderInstance.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )

    // Get dispute data from the store
    let appealDraws = []

    // get draws if they have been added to store.
    try {
      const userData = await this._StoreProviderInstance.getDispute(
        account,
        arbitratorAddress,
        disputeId
      )
      if (userData.appealDraws) appealDraws = userData.appealDraws || []
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Dispute exists on chain but not in store. We have lost draws for past disputes.
      console.error('Dispute does not exist in store.')
    }

    const netPNK = await this._ArbitratorInstance.getNetTokensForDispute(
      disputeId,
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
        this._ArbitratorInstance.currentRulingForDispute(disputeId, appeal)
      ]

      // Extra info for the last appeal
      if (isLastAppeal) {
        if (draws.length > 0)
          rulingPromises.push(
            this._ArbitratorInstance.canRuleDispute(disputeId, draws, account)
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

      const appealCreatedAt = await this.getAppealCreatedAt(
        dispute.disputeId,
        account,
        appeal
      )
      const appealDeadline = await this.getDisputeDeadline(
        dispute.disputeId,
        account,
        appeal
      )
      const appealRuledAt = await this.getAppealRuledAt(
        dispute.disputeId,
        account,
        appeal
      )

      appealJuror[appeal] = {
        createdAt: appealCreatedAt,
        fee: dispute.arbitrationFeePerJuror * draws.length,
        draws,
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
      arbitrableContractStatus: arbitrableContractData.status,
      arbitratorAddress,
      partyA: arbitrableContractData.partyA,
      partyB: arbitrableContractData.partyB,

      // Dispute Data
      disputeId,
      firstSession: dispute.firstSession,
      lastSession,
      numberOfAppeals: dispute.numberOfAppeals,
      disputeState: dispute.state,
      disputeStatus: dispute.status,
      appealJuror,
      appealRulings,
      netPNK,

      // Store Data
      title: contractStoreData ? contractStoreData.title : undefined,
      description: contractStoreData
        ? contractStoreData.description
        : undefined,
      email: contractStoreData ? contractStoreData.email : undefined,
      evidence
    }
  }
}

export default Disputes
