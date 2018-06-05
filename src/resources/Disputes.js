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
      DisputeCreation: [this._storeNewDisputeHandler],
      TokenShift: [this._storeTokensMovedForJuror],
      NewPeriod: [this._storeDisputeRuledAtTimestamp, this._storeAppealDeadline]
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
          blockNumber: event.blockNumber
        }
      )
    }
  }

  // **************************** //
  // *          Public          * //
  // **************************** //
  /**
   * Fetch the shared dispute data from the store.
   * @param {string} disputeId - The index of the dispute.
   * @returns {Promise} The dispute data in the store.
   */
  getDisputeFromStore = disputeId => {
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()

    return this._StoreProviderInstance.getDispute(arbitratorAddress, disputeId)
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
    let appealCreatedAt = []
    let appealDeadlines = []
    let appealRuledAt = []
    let startBlock
    try {
      const userData = await this._StoreProviderInstance.getDispute(
        account,
        arbitratorAddress,
        disputeId
      )
      if (userData.appealDraws) appealDraws = userData.appealDraws || []
      startBlock = userData.blockNumber
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Fetching a dispute will fail if it hasn't been added to the store yet. This is ok, we can just not return store data
      // see if we can get dispute start block from events
      const disputeCreationEvent = this._ArbitratorInstance.getDisputeCreationEvent(
        disputeId
      )
      if (disputeCreationEvent) startBlock = disputeCreationEvent.blockNumber
    }

    if (startBlock) {
      // get timestamps
      appealDeadlines = await this._ArbitratorInstance.getDisputeDeadlineTimestamps(
        startBlock,
        dispute.numberOfAppeals
      )
      appealRuledAt = await this._ArbitratorInstance.getAppealRuledAtTimestamps(
        startBlock,
        dispute.numberOfAppeals
      )
      appealCreatedAt = await this._ArbitratorInstance.getAppealCreationTimestamps(
        startBlock,
        dispute.numberOfAppeals
      )
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

      appealJuror[appeal] = {
        createdAt: appealCreatedAt[appeal],
        fee: dispute.arbitrationFeePerJuror * draws.length,
        draws,
        canRule
      }
      appealRulings[appeal] = {
        voteCounter: dispute.voteCounters[appeal],
        deadline: appealDeadlines[appeal],
        ruledAt: appealRuledAt[appeal],
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
