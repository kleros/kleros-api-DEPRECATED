import _ from 'lodash'

import * as ethConstants from '../../constants/eth'
import * as arbitratorConstants from '../../constants/arbitrator'
import * as notificationConstants from '../../constants/notification'
import * as disputeConstants from '../../constants/dispute'
import * as errorConstants from '../../constants/error'
import ResourceWrapper from '../ResourceWrapper'

/**
 * Notifications API.
 */
class Notifications extends ResourceWrapper {
  // **************************** //
  // *         Public           * //
  // **************************** //
  /**
   * register event listeners for arbitrator.
   * @param {string} account - Filter notifications for account.
   * @param {function} callback - If we want notifications to be "pushed" provide a callback function to call when a new notification is created.
   */
  registerNotificationListeners = async (account, callback) => {
    const eventHandlerMap = {
      DisputeCreation: this._disputeCreationHandler,
      AppealPossible: this._appealPossibleHandler,
      AppealDecision: this._appealingDecisionHandler,
      TokenShift: this._tokenShiftHandler,
      ArbitrationReward: this._arbitrationRewardHandler,
      NewPeriod: this._newPeriodHandler
    }

    for (let event in eventHandlerMap) {
      if (eventHandlerMap.hasOwnProperty(event)) {
        await this._eventListener.registerArbitratorEvent(
          event,
          this._createHandler(eventHandlerMap[event], account, callback)
        )
      }
    }
  }

  /**
   * Get stateful notifications. Stateful notifications change based on the state of the arbitrator contract.
   * @param {string} account - Filter notifications for account.
   * @param {function} isJuror - If the account is a juror.
   * @returns {object[]} - Array of stateful notification objects.
   */
  getStatefulNotifications = async (account, isJuror = true) => {
    const notifications = []
    const [contracts, disputes] = await Promise.all([
      this._getContracts(account),
      this._getDisputes(account, isJuror)
    ])
    const currentPeriod = await this._Arbitrator.getPeriod()
    const currentSession = await this._Arbitrator.getSession()
    if (isJuror) {
      /* Juror notifications:
      * - Activate tokens
      * - Need to vote
      * - Ready to repartition (shared)
      * - Ready to execute (shared)
      */
      if (currentPeriod === arbitratorConstants.PERIOD.ACTIVATION) {
        // FIXME use estimateGas
        const contractInstance = await this._loadArbitratorInstance()
        const lastActivatedSession = (await contractInstance.jurors(
          account
        ))[2].toNumber()
        if (lastActivatedSession < currentSession) {
          notifications.push(
            this._createNotification(
              notificationConstants.TYPE.CAN_ACTIVATE,
              'Ready to activate tokens',
              {}
            )
          )
        }
      } else if (currentPeriod === arbitratorConstants.PERIOD.VOTE) {
        for (let dispute of disputes) {
          const draws = dispute.appealDraws[dispute.appealDraws.length - 1]
          if (draws) {
            const canVote = await this._Arbitrator.canRuleDispute(
              dispute.disputeId,
              draws,
              account
            )
            if (canVote) {
              notifications.push(
                this._createNotification(
                  notificationConstants.TYPE.CAN_VOTE,
                  'Need to vote on dispute',
                  {
                    disputeId: dispute.disputeId,
                    arbitratorAddress: dispute.arbitratorAddress
                  }
                )
              )
            }
          }
        }
      }
    } else {
      /* Counterparty notifications:
      * - Need to pay fee
      * - Ready to repartition (shared)
      * - Ready to execute (shared)
      */
      await Promise.all(
        contracts.map(async contract => {
          const contractData = await this._ArbitrableContract.getData(
            contract.address
          )
          const arbitrationCost = await this._Arbitrator.getArbitrationCost(
            contractData.arbitratorExtraData
          )
          if (contractData.partyA === account) {
            if (contractData.partyAFee < arbitrationCost) {
              notifications.push(
                this._createNotification(
                  notificationConstants.TYPE.CAN_PAY_FEE,
                  'Arbitration fee required',
                  {
                    arbitratorAddress: contractData.arbitrator,
                    arbitrableContractAddress: contract.address,
                    feeToPay: arbitrationCost - contractData.partyAFee
                  }
                )
              )
            }
          } else if (contractData.partyB === account) {
            if (contractData.partyBFee < arbitrationCost) {
              notifications.push(
                this._createNotification(
                  notificationConstants.TYPE.CAN_PAY_FEE,
                  'Arbitration fee required',
                  {
                    arbitratorAddress: contractData.arbitrator,
                    arbitrableContractAddress: contract.address,
                    feeToPay: arbitrationCost - contractData.partyBFee
                  }
                )
              )
            }
          }
        })
      )
    }

    // Repartition and execute
    if (currentPeriod === arbitratorConstants.PERIOD.EXECUTE) {
      await Promise.all(
        disputes.map(async dispute => {
          const disputeData = await this._Arbitrator.getDispute(
            dispute.disputeId
          )
          if (
            disputeData.firstSession + disputeData.numberOfAppeals ===
            currentSession
          ) {
            if (disputeData.state <= disputeConstants.STATE.RESOLVING) {
              notifications.push(
                this._createNotification(
                  notificationConstants.TYPE.CAN_REPARTITION,
                  'Ready to repartition dispute',
                  {
                    disputeId: dispute.disputeId,
                    arbitratorAddress: dispute.arbitratorAddress
                  }
                )
              )
            } else if (
              disputeData.state === disputeConstants.STATE.EXECUTABLE
            ) {
              notifications.push(
                this._createNotification(
                  notificationConstants.TYPE.CAN_EXECUTE,
                  'Ready to execute dispute',
                  {
                    disputeId: dispute.disputeId,
                    arbitratorAddress: dispute.arbitratorAddress
                  }
                )
              )
            }
          }
        })
      )
    }
    return notifications
  }

  /**
   * Fetch all unread notifications.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of notification objects.
   */
  getUnreadNotifications = async account => {
    this._checkStoreProviderSet()

    const profile = await this._StoreProvider.getUserProfile(account)
    return _.filter(profile.notifications, notification => !notification.read)
  }

  /**
   * Fetch all unread notifications
   * @param {string} account address of user
   * @param {string} txHash hash of transaction that produced event
   * @param {number} logIndex index of the log. used to differentiate logs if multiple logs per tx
   * @returns {promise} promise that can be waited on for syncronousity
   */
  markNotificationAsRead = (account, txHash, logIndex) => {
    this._checkStoreProviderSet()

    return this._StoreProvider.markNotificationAsRead(
      account,
      txHash,
      logIndex,
      true
    )
  }

  /**
   * Fetch all user notifications.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of notification objects.
   */
  getNotifications = async account => {
    this._checkStoreProviderSet()

    return (await this._StoreProvider.getUserProfile(account)).notifications
  }

  // **************************** //
  // *        Handlers          * //
  // **************************** //
  /**
   * FIXME use this._Arbitrator.getOpenDisputesForSession
   * We can get a list of subscribers by having jurors subscribe to an arbitrator. Raises new problems however
   * @param {object} event - The event.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _newPeriodHandler = async (event, account, callback) => {
    const newPeriod = event.args._period.toNumber()

    // send appeal possible notifications
    if (newPeriod === arbitratorConstants.PERIOD.APPEAL) {
      this._checkArbitratorWrappersSet()
      const disputes = await this._getDisputes(account)
      // contract data
      const arbitratorData = await this._Arbitrator.getData(account)

      let disputeId = 0
      let arbitratorAddress
      const currentSession = arbitratorData.session

      let dispute
      const findDisputeIndex = dispute =>
        dispute.disputeId === disputeId &&
        dispute.arbitratorAddress === arbitratorAddress

      while (1) {
        // iterate over all disputes (FIXME inefficient)
        try {
          dispute = await this._Arbitrator.getDispute(disputeId)
          arbitratorAddress = dispute.arbitratorAddress
          if (dispute.arbitrableContractAddress === ethConstants.NULL_ADDRESS)
            break
          // session + number of appeals
          const disputeSession = dispute.firstSession + dispute.numberOfAppeals
          // if dispute not in current session skip
          if (disputeSession !== currentSession) {
            disputeId++
            continue
          }
          // FIXME DRY this out with _appealPossibleHandler. Cant call directly because we don't have the actual event being called
          const ruling = await this._Arbitrator.currentRulingForDispute(
            disputeId
          )

          if (_.findIndex(disputes, findDisputeIndex) >= 0) {
            const notification = await this._newNotification(
              account,
              event.transactionHash,
              disputeId, // use disputeId instead of logIndex since it doens't have its own event
              notificationConstants.TYPE.APPEAL_POSSIBLE,
              'A ruling has been made. Appeal is possible',
              {
                disputeId,
                arbitratorAddress,
                ruling
              }
            )

            await this._sendPushNotification(callback, notification)
          }

          // Check the next dispute
          disputeId++
        } catch (err) {
          // Dispute out of range, break
          if (err.message === errorConstants.UNABLE_TO_FETCH_DISPUTE) break
          console.error(err)
          throw err
        }
      }
    }
  }

  /**
   * Handler for DisputeCreation event
   * sends notification to partyA and partyB when dispute is created
   * @param {object} event - The event.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _disputeCreationHandler = async (event, account, callback) => {
    const disputeId = event.args._disputeID.toNumber()
    const txHash = event.transactionHash
    const arbitrableData = await this._ArbitrableContract.getData(
      event.args._arbitrable
    )

    if (
      arbitrableData.partyA === account ||
      arbitrableData.partyB === account
    ) {
      const arbitratorAddress = this._Arbitrator.getContractAddress()
      const notification = await this._newNotification(
        account,
        txHash,
        event.logIndex,
        notificationConstants.TYPE.DISPUTE_CREATED,
        'New Dispute Created',
        {
          disputeId: disputeId,
          arbitratorAddress: arbitratorAddress
        }
      )
      if (notification) await this._sendPushNotification(callback, notification)
    }
  }

  /**
   * handler for AppealPossible event
   * sends notification informing accounts that a ruling has been made and an appeal possible
   * @param {object} event - The event.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _appealPossibleHandler = async (event, account, callback) => {
    const disputes = await this._getDisputes(account)
    const disputeId = event.args._disputeID.toNumber()
    const ruling = await this._Arbitrator.currentRulingForDispute(disputeId)
    const arbitratorAddress = this._Arbitrator.getContractAddress()

    if (
      _.findIndex(
        disputes,
        dispute =>
          dispute.disputeId === disputeId &&
          dispute.arbitratorAddress === arbitratorAddress
      ) >= 0
    ) {
      const notification = await this._newNotification(
        account,
        event.transactionHash,
        event.logIndex,
        notificationConstants.TYPE.APPEAL_POSSIBLE,
        'A ruling has been made. Appeal is possible',
        {
          disputeId,
          arbitratorAddress,
          ruling
        }
      )

      if (notification) await this._sendPushNotification(callback, notification)
    }
  }

  /**
   * Handler for AppealDecision event
   * sends notification informing subscribers that a ruling has been appealed
   * @param {object} event - The event.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _appealingDecisionHandler = async (event, account, callback) => {
    const disputes = await this._getDisputes(account)
    const disputeId = event.args._disputeID.toNumber()
    const arbitratorAddress = this._Arbitrator.getContractAddress()

    if (
      _.findIndex(
        disputes,
        dispute =>
          dispute.disputeId === disputeId &&
          dispute.arbitratorAddress === arbitratorAddress
      ) >= 0
    ) {
      const notification = await this._newNotification(
        account,
        event.transactionHash,
        event.logIndex,
        notificationConstants.TYPE.RULING_APPEALED,
        'A ruling been appealed',
        {
          disputeId,
          arbitratorAddress
        }
      )

      if (notification) await this._sendPushNotification(callback, notification)
    }
  }

  /**
   * Handler for TokenShift event
   * Sends notification informing
   * NOTE: you will get a notification for each vote. So a juror that has 3 votes will receive 3 notifications
   * @param {object} event - The event.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _tokenShiftHandler = async (event, account, callback) => {
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()

    if (account === address) {
      const arbitratorAddress = this._Arbitrator.getContractAddress()
      const notification = await this._newNotification(
        account,
        event.transactionHash,
        event.logIndex,
        notificationConstants.TYPE.TOKEN_SHIFT,
        'Tokens have been redistributed',
        {
          disputeId,
          arbitratorAddress,
          account: address,
          amount
        }
      )

      if (notification) await this._sendPushNotification(callback, notification)
    }
  }

  /**
   * Handler for arbitration reward event.
   * @param {object} event - The event.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _arbitrationRewardHandler = async (event, account, callback) => {
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()

    if (account === address) {
      const arbitratorAddress = this._Arbitrator.getContractAddress()
      const notification = await this._newNotification(
        account,
        event.transactionHash,
        event.logIndex,
        notificationConstants.TYPE.ARBITRATION_REWARD,
        'Juror awarded arbitration fee',
        {
          disputeId,
          arbitratorAddress,
          account: address,
          amount
        }
      )

      if (notification) await this._sendPushNotification(callback, notification)
    }
  }

  // **************************** //
  // *        Helpers           * //
  // **************************** //
  /**
   * Helper method to create handler with correct params
   * @param {function} handler - The handler.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   * @returns {object} - The created handler.
   */
  _createHandler = (handler, account, callback) => args =>
    handler(args, account, callback)

  /**
   * Sends a push notification.
   * @param {function} callback - The callback.
   * @param {object} notification - The notification.
   */
  _sendPushNotification = async (callback, notification) => {
    if (callback && notification) {
      callback(notification)
    }
  }

  /**
   * Creates a notification object.
   * @param {number} notificationType - The notificationType.
   * @param {string} message - The message.
   * @param {object} data - The data.
   * @returns {function} - The notification object.
   */
  _createNotification = (notificationType, message, data) => ({
    notificationType,
    message,
    data
  })
}

export default Notifications
