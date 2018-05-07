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
      // timestamp
      const blockTimestamp = (await this._ArbitratorInstance.getBlock(
        event.blockNumber
      )).timestamp

      // Check if dispute has already been stored. This can happen if there was an appeal
      const storedDispute = this._StoreProviderInstance.getDisputeDataForUser(
        arbitrableContractData.partyA,
        arbitratorAddress,
        disputeId
      )
      const appealCreatedAt = storedDispute.appealCreatedAt || []
      appealCreatedAt[disputeData.numberOfAppeals] = blockTimestamp * 1000

      await this._StoreProviderInstance.updateDisputeProfile(
        account,
        arbitratorAddress,
        disputeId,
        {
          contractAddress: disputeData.arbitrableContractAddress,
          partyA: arbitrableContractData.partyA,
          partyB: arbitrableContractData.partyB,
          appealCreatedAt
        }
      )
    }
  }

  /**
   * Event listener handler that add or substract the stored Net PNK won/lost for a juror.
   * @param {string} event - The event log.
   * @param {string} account - The account.
   */
  _storeTokensMovedForJuror = async (event, account) => {
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amountShift = event.args._amount.toNumber()
    // juror won/lost tokens
    if (address === account) {
      const userProfile = await this._StoreProviderInstance.setUpUserProfile(
        account
      )
      const contractAddress = this._ArbitratorInstance.getContractAddress()
      const disputeIndex = _.findIndex(
        userProfile.disputes,
        dispute =>
          dispute.disputeId === disputeId &&
          dispute.arbitratorAddress === contractAddress
      )

      // if dispute is not in store ignore
      if (disputeIndex < 0) return
      const dispute = userProfile.disputes[disputeIndex]
      await this._StoreProviderInstance.updateDisputeProfile(
        account,
        dispute.arbitratorAddress,
        dispute.disputeId,
        {
          netPNK: (dispute.netPNK || 0) + amountShift
        }
      )
    }
  }

  /**
   * Event listener handler that updates ruled at timestamp
   * @param {object} event - The event log.
   * @param {string} account - The users eth account.
   */
  _storeDisputeRuledAtTimestamp = async (event, account) => {
    // we fetch the current period in case we are consuming old events from previous sessions
    const newPeriod = await this._ArbitratorInstance.getPeriod()
    // send appeal possible notifications
    if (newPeriod === arbitratorConstants.PERIOD.APPEAL) {
      const disputes = await this._StoreProviderInstance.getDisputes(account)
      const openDisputes = await this._ArbitratorInstance.getOpenDisputesForSession()
      const contractAddress = this._ArbitratorInstance.getContractAddress()

      await Promise.all(
        openDisputes.map(async openDispute => {
          const disputeIndex = _.findIndex(
            disputes,
            dispute =>
              dispute.disputeId === openDispute.disputeId &&
              dispute.arbitratorAddress === contractAddress
          )
          if (disputeIndex >= 0) {
            // get ruledAt from block timestamp
            const blockNumber = event.blockNumber
            const blockTimestamp = (await this._ArbitratorInstance.getBlock(
              blockNumber
            )).timestamp

            const appealRuledAt = disputes[disputeIndex].appealRuledAt || []
            appealRuledAt[openDispute.numberOfAppeals] = blockTimestamp * 1000

            this._StoreProviderInstance.updateDisputeProfile(
              account,
              contractAddress,
              openDispute.disputeId,
              {
                appealRuledAt
              }
            )
          }
        })
      )
    }
  }

  /**
   * Event listener handler that sets the deadline for an appeal
   * @param {object} _ - The event log. Unused in function.
   * @param {string} account - The users eth account.
   */
  _storeAppealDeadline = async (_, account) => {
    // we fetch the current period in case we are consuming old events from previous sessions
    const newPeriod = await this._ArbitratorInstance.getPeriod()
    // send appeal possible notifications
    if (newPeriod === arbitratorConstants.PERIOD.VOTE) {
      const disputes = await this._StoreProviderInstance.getDisputes(account)
      // contract data
      const openDisputes = await this._ArbitratorInstance.getOpenDisputesForSession()
      const contractAddress = this._ArbitratorInstance.getContractAddress()
      await Promise.all(
        openDisputes.map(async openDispute => {
          const disputeIndex = _.findIndex(
            disputes,
            dispute =>
              dispute.disputeId === openDispute.disputeId &&
              dispute.arbitratorAddress === contractAddress
          )
          if (disputeIndex >= 0) {
            const deadline = await this._ArbitratorInstance.getDeadlineForOpenDispute()
            const appealDeadlines = disputes[disputeIndex].appealDeadlines || []
            appealDeadlines[openDispute.numberOfAppeals] = deadline

            this._StoreProviderInstance.updateDisputeProfile(
              account,
              contractAddress,
              openDispute.disputeId,
              {
                appealDeadlines
              }
            )
          }
        })
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
    let netPNK = 0
    try {
      const userData = await this._StoreProviderInstance.getDisputeDataForUser(
        account,
        arbitratorAddress,
        disputeId
      )
      if (userData.appealDraws) appealDraws = userData.appealDraws || []
      if (userData.appealCreatedAt)
        appealCreatedAt = userData.appealCreatedAt || []
      if (userData.appealDeadlines)
        appealDeadlines = userData.appealDeadlines || []
      if (userData.appealRuledAt) appealRuledAt = userData.appealRuledAt || []
      if (userData.netPNK) netPNK = userData.netPNK
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Fetching a dispute will fail if it hasn't been added to the store yet. This is ok, we can just not return store data
    }

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

      // Store Data
      description: contractStoreData
        ? contractStoreData.description
        : undefined,
      email: contractStoreData ? contractStoreData.email : undefined,
      evidence,
      netPNK,

      // Deprecated Data // TODO: Remove
      appealCreatedAt,
      appealDeadlines,
      appealRuledAt
    }
  }
}

export default Disputes
