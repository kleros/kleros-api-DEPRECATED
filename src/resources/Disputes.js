import _ from 'lodash'

import * as arbitratorConstants from '../constants/arbitrator'
import * as disputeConstants from '../constants/dispute'
import isRequired from '../utils/isRequired'

/**
 * Disputes API.
 * Requires Store Provider to be set to call methods.
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

  registerStoreUpdateEventListeners = (
    eventListener = isRequired('eventListener'),
    account = isRequired('account')
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
   * Store dispute in store upon creation
   * @param {string} event - The event log.
   */
  _storeNewDisputeHandler = async event => {
    // There is no need to handle this event if we are not using the store
    const disputeId = event.args._disputeID.toNumber()

    const contractAddress = this._ArbitratorInstance.getContractAddress()
    const existingDispute = (await this._StoreProviderInstance.getDispute(
      contractAddress,
      disputeId
    )).body

    // Add dispute to store if not there
    if (_.isNull(existingDispute)) {
      // arbitrator data
      const disputeData = await this._ArbitratorInstance.getDispute(disputeId)
      // arbitrable contract data
      await this._ArbitrableInstance.setContractInstance(
        disputeData.arbitrableContractAddress
      )
      const arbitrableContractData = await this._ArbitrableInstance.getData()
      // timestamp
      const blockTimestamp = this._ArbitratorInstance._Web3Wrapper.getBlock(
        event.blockNumber
      ).timestamp
      const appealCreatedAt = disputeData.appealCreatedAt
      appealCreatedAt[disputeData.numberOfAppeals] = blockTimestamp * 1000

      await this._StoreProviderInstance.updateDispute(
        contractAddress,
        disputeId,
        {
          contractAddress: disputeData.arbitrableContractAddress,
          partyA: arbitrableContractData.partyA,
          partyB: arbitrableContractData.partyB,
          status: disputeData.status,
          appealCreatedAt
        }
      )
    }
  }

  /**
   * Add or substract the stored Net PNK won/lost for a juror.
   * @param {string} event - The event log.
   * @param {string} account - The account.
   */
  _storeTokensMovedForJuror = async (event, account) => {
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amountShift = event.args._amount.toNumber()
    // juror won/lost tokens
    if (address === account) {
      const userProfile = await this._StoreProviderInstance.getUserProfile(
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
   * Event listener that updates ruled at timestamp
   * @param {object} event - The event log.
   * @param {string} account - The users eth account.
   */
  _storeDisputeRuledAtTimestamp = async (event, account) => {
    const newPeriod = event.args._period.toNumber()
    // send appeal possible notifications
    if (newPeriod === arbitratorConstants.PERIOD.APPEAL) {
      const disputes = await this._StoreProviderInstance.getDisputesForUser(
        account
      )
      const openDisputes = await this._ArbitratorInstance.getOpenDisputesForSession()
      const contractAddress = this._ArbitratorInstance.getContractAddress()

      await Promise.all(
        openDisputes.map(async disputeId => {
          if (
            _.findIndex(
              disputes,
              dispute =>
                dispute.disputeId === disputeId &&
                dispute.arbitratorAddress === contractAddress
            ) >= 0
          ) {
            // get ruledAt from block timestamp
            const blockNumber = event.blockNumber
            const blockTimestamp = this._ArbitratorInstance._Web3Wrapper.getBlock(
              blockNumber
            ).timestamp

            const disputeData = await this.getDataForDispute(
              contractAddress,
              disputeId,
              account
            )
            const appealRuledAt = disputeData.appealRuledAt
            appealRuledAt[disputeData.numberOfAppeals] = blockTimestamp * 1000

            this._StoreProviderInstance.updateDispute(
              contractAddress,
              disputeId,
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
   * Event listener that sets the deadline for an appeal
   * @param {object} event - The event log.
   * @param {string} account - The users eth account.
   */
  _storeAppealDeadline = async (event, account) => {
    const newPeriod = event.args._period.toNumber()
    // send appeal possible notifications
    if (newPeriod === arbitratorConstants.PERIOD.VOTE) {
      this._checkArbitratorWrappersSet()
      const disputes = await this._StoreProviderInstance.getDisputesForUser(
        account
      )
      // contract data
      const openDisputes = await this._ArbitratorInstance.getOpenDisputesForSession()
      const contractAddress = this._ArbitratorInstance.getContractAddress()
      await Promise.all(
        openDisputes.map(async disputeId => {
          if (
            _.findIndex(
              disputes,
              dispute =>
                dispute.disputeId === disputeId &&
                dispute.arbitratorAddress === contractAddress
            ) >= 0
          ) {
            const deadline = await this._ArbitratorInstance.getDeadlineForOpenDispute()
            const disputeData = await this.getDataForDispute(
              contractAddress,
              disputeId,
              account
            )
            const appealDeadlines = disputeData.appealDeadlines
            appealDeadlines[disputeData.numberOfAppeals] = deadline

            this._StoreProviderInstance.updateDispute(
              contractAddress,
              disputeId,
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
   * Get data for a dispute.
   * @param {number} disputeId - The dispute's ID.
   * @param {string} account - The juror's address.
   * @returns {object} - Data object for the dispute that uses data from the contract and the store.
   * TODO: Should we return what we have in the store even if dispute is not in the contract?
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
      this._ArbitrableInstance.getData(),
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
      const userData = await this._StoreProviderInstance.getDisputeData(
        arbitratorAddress,
        disputeId,
        account
      )
      if (userData.appealDraws) appealDraws = userData.appealDraws
      if (userData.appealCreatedAt) appealCreatedAt = userData.appealCreatedAt
      if (userData.appealDeadlines) appealDeadlines = userData.appealDeadlines
      if (userData.appealRuledAt) appealRuledAt = userData.appealRuledAt
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
