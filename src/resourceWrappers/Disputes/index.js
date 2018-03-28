import _ from 'lodash'

import * as arbitratorConstants from '../../constants/arbitrator'
import * as disputeConstants from '../../constants/dispute'
import * as notificationConstants from '../../constants/notification'
import ResourceWrapper from '../ResourceWrapper'

/**
 * Disputes API.
 * Requires Store Provider to be set to call methods.
 */
class Disputes extends ResourceWrapper {
  // **************************** //
  // *         Events           * //
  // **************************** //

  /**
   * If there is a dispute in contract update store.
   * FIXME contracts with multiple disputes will need a way to clarify that this is a new dispute
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - The account.
   */
  addNewDisputeEventListener = async arbitratorAddress => {
    if (!this._eventListener) return

    const _disputeCreatedHandler = async (
      event,
      contractAddress = arbitratorAddress
    ) => {
      // There is no need to handle this event if we are not using the store
      if (!this._hasStoreProvider()) return
      const disputeId = event.args._disputeID.toNumber()

      const existingDispute = (await this._StoreProvider.getDispute(
        contractAddress,
        disputeId
      )).body

      // Add dispute to store if not there
      if (_.isNull(existingDispute)) {
        // arbitrator data
        const disputeData = await this._Arbitrator.getDispute(
          contractAddress,
          disputeId
        )
        // arbitrable contract data
        const arbitrableContractData = await this._ArbitrableContract.getData(
          disputeData.arbitrableContractAddress
        )
        // timestamp
        const blockTimestamp = this._Arbitrator._Web3Wrapper.getBlock(
          event.blockNumber
        ).timestamp
        const appealCreatedAt = disputeData.appealCreatedAt
        appealCreatedAt[disputeData.numberOfAppeals] = blockTimestamp * 1000

        await this._StoreProvider.updateDispute(arbitratorAddress, disputeId, {
          contractAddress: disputeData.arbitrableContractAddress,
          partyA: arbitrableContractData.partyA,
          partyB: arbitrableContractData.partyB,
          status: disputeData.status,
          appealCreatedAt
        })
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
        const disputes = await this._getDisputes(arbitratorAddress, address)
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

              if (this._hasStoreProvider()) {
                // get ruledAt from block timestamp
                const blockNumber = event.blockNumber
                const blockTimestamp = this._Arbitrator._Web3Wrapper.getBlock(
                  blockNumber
                ).timestamp

                const disputeData = await this.getDataForDispute(
                  arbitratorAddress,
                  disputeId,
                  address
                )
                const appealRuledAt = disputeData.appealRuledAt
                appealRuledAt[disputeData.numberOfAppeals] =
                  blockTimestamp * 1000

                this._StoreProvider.updateDispute(
                  arbitratorAddress,
                  disputeId,
                  {
                    appealRuledAt
                  }
                )
              }

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
      if (!this._hasStoreProvider()) return

      const newPeriod = event.args._period.toNumber()
      // send appeal possible notifications
      if (newPeriod === arbitratorConstants.PERIOD.VOTE) {
        this._checkArbitratorWrappersSet()
        const disputes = await this._getDisputes(arbitratorAddress, address)
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
              const disputeData = await this.getDataForDispute(
                arbitratorAddress,
                disputeId,
                address
              )
              const appealDeadlines = disputeData.appealDeadlines
              appealDeadlines[disputeData.numberOfAppeals] = deadline

              this._StoreProvider.updateDispute(arbitratorAddress, disputeId, {
                appealDeadlines
              })
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
      this._ArbitrableContract.getEvidenceForArbitrableContract(
        arbitrableContractAddress
      )
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
