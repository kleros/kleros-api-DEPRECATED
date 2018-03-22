import _ from 'lodash'

import * as arbitratorConstants from '../constants/arbitrator'
import * as disputeConstants from '../constants/dispute'
import * as notificationConstants from '../constants/notification'
import * as errorConstants from '../constants/error'

import AbstractWrapper from './AbstractWrapper'

/**
 * Disputes API.
 * Requires Store Provider to be set to call methods.
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
  addNewDisputeEventListener = async (arbitratorAddress, account) => {
    if (!this._eventListener) return

    const _disputeCreatedHandler = async (
      event,
      contractAddress = arbitratorAddress,
      address = account
    ) => {
      const disputeId = event.args._disputeID.toNumber()
      const disputeData = await this.getDataForDispute(
        contractAddress,
        disputeId,
        account
      )
      // if listener is a party in dispute add to store
      if (disputeData.partyA === address || disputeData.partyB === address) {
        const blockNumber = event.blockNumber
        const block = this._Arbitrator._Web3Wrapper.getBlock(blockNumber)

        // add new dispute with timestamp
        await this._updateStoreForDispute(
          contractAddress,
          disputeId,
          address,
          block.timestamp * 1000
        )
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
          dispute.arbitratorAddress,
          dispute.disputeId,
          {
            netPNK: (dispute.netPNK || 0) + amountShift
          }
        )
      }
    }

    await this._eventListener.registerArbitratorEvent(
      'TokenShift',
      _tokenShiftHandler
    )
  }

  /**
   * Event listener that sends notification when a dispute has been ruled on.
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - The users eth account.
   * @param {function} callback - <optional> function to be called when event is triggered.
   */
  addDisputeRulingHandler = async (arbitratorAddress, account, callback) => {
    if (!this._eventListener) return
    const _disputeRulingHandler = async (
      event,
      contractAddress = arbitratorAddress,
      address = account,
      notificationCallback = callback
    ) => {
      const newPeriod = event.args._period.toNumber()
      // send appeal possible notifications
      if (newPeriod === arbitratorConstants.PERIOD.APPEAL) {
        this._checkArbitratorWrappersSet()
        const disputes = await this._getDisputes(arbitratorAddress, account)
        const openDisputes = await this._Arbitrator.getOpenDisputesForSession(
          arbitratorAddress
        )

        await Promise.all(
          openDisputes.map(async disputeId => {
            const dispute = await this._Arbitrator.getDispute(
              arbitratorAddress,
              disputeId
            )
            const ruling = await this._Arbitrator.currentRulingForDispute(
              contractAddress,
              disputeId,
              dispute.numberOfAppeals
            )

            if (
              _.findIndex(
                disputes,
                dispute =>
                  dispute.disputeId === disputeId &&
                  dispute.arbitratorAddress === contractAddress
              ) >= 0
            ) {
              const notification = await this._newNotification(
                address,
                arbitratorAddress, // use arbitratorAddress so that we know it is unique. not event based
                disputeId, // use disputeId instead of logIndex since it doens't have its own event
                notificationConstants.TYPE.APPEAL_POSSIBLE,
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
              if (this._hasStoreProvider())
                await this._updateStoreForDispute(
                  contractAddress,
                  disputeId,
                  address,
                  null,
                  block.timestamp * 1000
                )

              if (notificationCallback && notification) {
                notificationCallback(notification)
              }
            }
          })
        )
      }
    }

    await this._eventListener.registerArbitratorEvent(
      'NewPeriod',
      _disputeRulingHandler
    )
  }

  /**
   * Event listener that sets the deadline for an appeal
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - The users eth account.
   * @param {function} callback - <optional> function to be called when event is triggered.
   */
  addDisputeDeadlineHandler = async (arbitratorAddress, account) => {
    if (!this._eventListener) return

    const _disputeDeadlineHandler = async (
      event,
      contractAddress = arbitratorAddress,
      address = account
    ) => {
      const newPeriod = event.args._period.toNumber()
      // send appeal possible notifications
      if (newPeriod === arbitratorConstants.PERIOD.VOTE) {
        this._checkArbitratorWrappersSet()
        const disputes = await this._getDisputes(arbitratorAddress, account)
        // contract data
        const openDisputes = await this._Arbitrator.getOpenDisputesForSession(
          arbitratorAddress
        )

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
              const deadline = await this.getDeadlineForOpenDispute(
                arbitratorAddress
              )
              // add ruledAt to store
              await this._updateStoreForDispute(
                contractAddress,
                disputeId,
                address,
                null,
                null,
                deadline
              )
            }
          })
        )
      }
    }

    await this._eventListener.registerArbitratorEvent(
      'NewPeriod',
      _disputeDeadlineHandler
    )
  }

  // **************************** //
  // *          Public          * //
  // **************************** //

  /**
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param {string} arbitratorAddress address of Kleros contract
   * @param {string} account address of user
   * @returns {object[]} dispute data objects for user
   */
  getDisputesForUser = async (arbitratorAddress, account) => {
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()
    this._checkStoreProviderSet()

    // contract data
    const [period, currentSession] = await Promise.all([
      this._Arbitrator.getPeriod(arbitratorAddress),
      this._Arbitrator.getSession(arbitratorAddress)
    ])

    const _getDisputesForUserFromStore = async account => {
      let disputes = await this._StoreProvider.getDisputesForUser(account)

      return Promise.all(
        disputes.map(dispute =>
          this.getDataForDispute(
            dispute.arbitratorAddress,
            dispute.disputeId,
            account
          )
        )
      )
    }

    // new jurors have not been chosen yet. don't update
    if (period !== arbitratorConstants.PERIOD.VOTE) {
      return _getDisputesForUserFromStore(account)
    }

    let profile = await this._StoreProvider.setUpUserProfile(account)
    if (currentSession !== profile.session) {
      // get disputes for juror
      const myDisputes = await this._Arbitrator.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // update store for each dispute
      await Promise.all(
        myDisputes.map(async dispute => {
          // add dispute to db if it doesn't already exist
          await this._updateStoreForDispute(
            arbitratorAddress,
            dispute.disputeId,
            account
          )
        })
      )

      this._StoreProvider.updateUserProfile(account, {
        session: currentSession
      })
    }

    return _getDisputesForUserFromStore(account)
  }

  /**
   * update store with new dispute data
   * @param {string} arbitratorAddress Address address of arbitrator contract
   * @param {int} disputeId index of dispute
   * @param {string} account address of party to update dispute or
   * @param {number} createdAt <optional> epoch timestamp of when dispute was created
   * @param {number} ruledAt <optional> epoch timestamp of when dispute was ruled on
   * @param {number} deadline <optional> epoch timestamp of dispute deadline
   * @returns {object} updated dispute object
   */
  _updateStoreForDispute = async (
    arbitratorAddress,
    disputeId,
    account,
    createdAt,
    ruledAt,
    deadline
  ) => {
    this._checkStoreProviderSet()
    this._checkArbitratorWrappersSet()

    const disputeData = await this.getDataForDispute(
      arbitratorAddress,
      disputeId,
      account
    )

    if (createdAt)
      disputeData.appealCreatedAt[disputeData.numberOfAppeals] = createdAt
    if (ruledAt)
      disputeData.appealRuledAt[disputeData.numberOfAppeals] = ruledAt
    if (deadline)
      disputeData.appealDeadlines[disputeData.numberOfAppeals] = deadline

    // update dispute
    const dispute = await this._StoreProvider.updateDispute(
      disputeData.arbitratorAddress,
      disputeData.disputeId,
      {
        contractAddress: disputeData.arbitrableContractAddress,
        partyA: disputeData.partyA,
        partyB: disputeData.partyB,
        title: disputeData.title,
        status: disputeData.status,
        information: disputeData.information,
        justification: disputeData.justification,
        resolutionOptions: disputeData.resolutionOptions,
        appealCreatedAt: disputeData.appealCreatedAt,
        appealRuledAt: disputeData.appealRuledAt,
        appealDeadlines: disputeData.appealDeadlines
      }
    )

    const storedDisputeData = await this._StoreProvider.getDisputeData(
      arbitratorAddress,
      disputeId,
      account
    )
    const currentSession = await this._Arbitrator.getSession(arbitratorAddress)
    if (disputeData.lastSession === currentSession) {
      const sessionDraws = await this._Arbitrator.getDrawsForJuror(
        arbitratorAddress,
        disputeId,
        account
      )

      if (!storedDisputeData.appealDraws) storedDisputeData.appealDraws = []
      storedDisputeData.appealDraws[disputeData.numberOfAppeals] = sessionDraws
    }

    // update profile for account
    await this._StoreProvider.updateDisputeProfile(
      account,
      disputeData.arbitratorAddress,
      disputeData.disputeId,
      {
        appealDraws: storedDisputeData.appealDraws
      }
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
    this._checkStoreProviderSet()

    const userProfile = await this._StoreProvider.getUserProfile(account)

    const disputeArray = _.filter(
      userProfile.disputes,
      dispute =>
        dispute.disputeId === disputeId &&
        dispute.arbitratorAddress === arbitratorAddress
    )

    if (_.isEmpty(disputeArray))
      throw new Error(errorConstants.NO_STORE_DATA_FOR_DISPUTE(account))

    return disputeArray[0]
  }

  /**
   * Get evidence for contract.
   * @param {string} arbitrableContractAddress - Address of arbitrable contract.
   * @returns {object[]} - Array of evidence objects.
   */
  getEvidenceForArbitrableContract = async arbitrableContractAddress => {
    this._checkStoreProviderSet()
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
    this._checkArbitrableWrappersSet()
    this._checkArbitratorWrappersSet()

    const arbitrableContractAddress = (await this._Arbitrator.getDispute(
      arbitratorAddress,
      disputeId
    )).arbitrableContractAddress
    return this._ArbitrableContract.getRulingOptions(
      arbitrableContractAddress,
      arbitratorAddress,
      disputeId
    )
  }

  /**
   * Get data for a dispute.
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {number} disputeId - The dispute's ID.
   * @param {string} account - The juror's address.
   * @returns {object} - Data object for the dispute that uses data from the contract and the store.
   * TODO: Should we return what we have in the store even if dispute is not in the contract?
   */
  getDataForDispute = async (arbitratorAddress, disputeId, account) => {
    this._checkArbitratorWrappersSet()
    this._checkArbitrableWrappersSet()
    this._checkStoreProviderSet()

    // Get dispute data from contract. Also get the current session and period.
    const [dispute, period, session] = await Promise.all([
      this._Arbitrator.getDispute(arbitratorAddress, disputeId),
      this._Arbitrator.getPeriod(arbitratorAddress),
      this._Arbitrator.getSession(arbitratorAddress)
    ])

    // Get arbitrable contract data and evidence
    const arbitrableContractAddress = dispute.arbitrableContractAddress
    const [arbitrableContractData, evidence] = await Promise.all([
      this._ArbitrableContract.getData(arbitrableContractAddress),
      this.getEvidenceForArbitrableContract(arbitrableContractAddress)
    ])
    const contractStoreData = await this._StoreProvider.getContractByAddress(
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
      const userData = await this._StoreProvider.getDisputeData(
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
        this._Arbitrator.currentRulingForDispute(
          arbitratorAddress,
          disputeId,
          appeal
        )
      ]

      // Extra info for the last appeal
      if (isLastAppeal) {
        if (draws.length > 0)
          rulingPromises.push(
            this._Arbitrator.canRuleDispute(
              arbitratorAddress,
              disputeId,
              draws,
              account
            )
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
