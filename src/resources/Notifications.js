import _ from 'lodash'

import * as arbitratorConstants from '../constants/arbitrator'
import * as notificationConstants from '../constants/notification'
import * as disputeConstants from '../constants/dispute'
import { MISSING_STORE_PROVIDER } from '../constants/error'
import isRequired from '../utils/isRequired'

/**
 * Notifications API. Use this object to fetch notifications from the store, register
 * event log handlers to update store and send push notifications.
 */
class Notifications {
  constructor(
    arbitratorInstance = isRequired('arbitratorInstance'),
    arbitrableInstance = isRequired('arbitrableInstance'),
    storeProviderInstance
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
  // *         Public           * //
  // **************************** //

  /**
   * Register event handlers for the arbitrator instance.
   * @param {string} account - Filter notifications for account.
   * @param {object} eventListener - Event Listener that will fetch logs and call callbacks
   * @param {function} callback - If we want notifications to be "pushed" provide a callback function to call when a new notification is created.
   */
  registerArbitratorNotifications = (
    account = isRequired('account'),
    eventListener = isRequired('eventListener'),
    callback
  ) => {
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
        eventListener.addEventHandler(
          this._ArbitratorInstance,
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
    const currentPeriod = await this._ArbitratorInstance.getPeriod()
    const currentSession = await this._ArbitratorInstance.getSession()
    if (isJuror) {
      /* Juror notifications:
      * - Activate tokens
      * - Need to vote
      * - Ready to repartition (shared)
      * - Ready to execute (shared)
      */
      if (currentPeriod === arbitratorConstants.PERIOD.ACTIVATION) {
        // FIXME use estimateGas
        const contractInstance = await this._ArbitratorInstance.loadContract()
        const lastActivatedSession = (await contractInstance.jurors(
          account
        ))[2].toNumber()
        if (lastActivatedSession < currentSession) {
          notifications.push(
            this._createNotification(
              notificationConstants.TYPE.CAN_ACTIVATE,
              'Ready to deposit tokens',
              {}
            )
          )
        }
      } else if (currentPeriod === arbitratorConstants.PERIOD.VOTE) {
        for (let dispute of disputes) {
          const draws = dispute.appealDraws[dispute.appealDraws.length - 1]
          if (draws) {
            const canVote = await this._ArbitratorInstance.canRuleDispute(
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
          // load arbitrable contract
          await this._ArbitrableInstance.setContractInstance(contract.address)
          const contractData = await this._ArbitrableInstance.getData(
            contract.partyA
          )
          const arbitrationCost = await this._ArbitratorInstance.getArbitrationCost(
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
          const disputeData = await this._ArbitratorInstance.getDispute(
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
   * Fetch all unread notifications from store.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of notification objects.
   */
  getUnreadStoredNotifications = async account => {
    this._requireStoreProvider()
    const profile = await this._StoreProviderInstance.newUserProfile(account)
    const currentArbitrator = this._ArbitratorInstance.getContractAddress()
    // return notifications that are for current arbitrator and are unread
    return _.filter(
      profile.notifications,
      notification =>
        notification.data.arbitratorAddress === currentArbitrator &&
        !notification.read
    )
  }

  /**
   * Mark stored notification as read.
   * @param {string} account address of user
   * @param {string} txHash hash of transaction that produced event
   * @param {number} logIndex index of the log. used to differentiate logs if multiple logs per tx
   * @returns {promise} promise that can be waited on for syncronousity
   */
  markStoredNotificationAsRead = async (account, txHash, logIndex) => {
    this._requireStoreProvider()
    const result = await this._StoreProviderInstance.markNotificationAsRead(
      account,
      txHash,
      logIndex,
      true
    )
    return result
  }

  /**
   * Fetch all user notifications from store.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of notification objects.
   */
  getStoredNotifications = async account => {
    this._requireStoreProvider()

    return (await this._StoreProviderInstance.getUserProfile(account))
      .notifications
  }

  // **************************** //
  // *        Handlers          * //
  // **************************** //

  /**
   * Checks for appeal possible notifications during APPEAL period.
   * @param {object} event - The event log.
   * @param {string} account - The user account.
   * @param {function} callback - The callback.
   */
  _newPeriodHandler = async (event, account, callback) => {
    const newPeriod = event.args._period.toNumber()
    const eventSession = event.args._session.toNumber()
    const currentSession = await this._ArbitratorInstance.getSession()
    // send appeal possible notifications if in current session
    if (
      newPeriod === arbitratorConstants.PERIOD.APPEAL &&
      eventSession === currentSession
    ) {
      const disputes = await this._getDisputes(account) // get users disputes
      const openDisputes = await this._ArbitratorInstance.getOpenDisputesForSession() // get all disputes for session
      const arbitratorAddress = this._ArbitratorInstance.getContractAddress()

      await Promise.all(
        openDisputes.map(async openDispute => {
          if (
            _.findIndex(
              disputes,
              dispute =>
                dispute.disputeId === openDispute.disputeId &&
                dispute.arbitratorAddress === arbitratorAddress
            ) >= 0
          ) {
            const ruling = await this._ArbitratorInstance.currentRulingForDispute(
              openDispute.disputeId,
              openDispute.numberOfAppeals
            )

            const notification = await this._newNotification(
              account,
              event.transactionHash,
              event.blockNumber,
              openDispute.disputeId, // use disputeId instead of logIndex since it doens't have its own event
              notificationConstants.TYPE.APPEAL_POSSIBLE,
              'A ruling has been made. Appeal is possible',
              {
                disputeId: openDispute.disputeId,
                arbitratorAddress,
                ruling
              }
            )

            await this._sendPushNotification(callback, notification)
          }
        })
      )
    }
  }

  /**
   * Handler for DisputeCreation event
   * sends notification to partyA and partyB when dispute is created
   * @param {object} event - The event log.
   * @param {string} account - The user account.
   * @param {function} callback - The callback.
   */
  _disputeCreationHandler = async (event, account, callback) => {
    const disputeId = event.args._disputeID.toNumber()
    const txHash = event.transactionHash
    // load arbitrable contract
    await this._ArbitrableInstance.setContractInstance(event.args._arbitrable)

    const arbitrableData = await this._ArbitrableInstance.getData()

    if (
      arbitrableData.partyA === account ||
      arbitrableData.partyB === account
    ) {
      const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
      const notification = await this._newNotification(
        account,
        txHash,
        event.blockNumber,
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
   * @param {object} event - The event log.
   * @param {string} account - The user account.
   * @param {function} callback - The callback.
   */
  _appealPossibleHandler = async (event, account, callback) => {
    const disputes = await this._getDisputes(account)
    const disputeId = event.args._disputeID.toNumber()
    const ruling = await this._ArbitratorInstance.currentRulingForDispute(
      disputeId
    )
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()

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
        event.blockNumber,
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
   * @param {object} event - The event log.
   * @param {string} account - The user account.
   * @param {function} callback - The callback.
   */
  _appealingDecisionHandler = async (event, account, callback) => {
    const disputes = await this._getDisputes(account)
    const disputeId = event.args._disputeID.toNumber()
    const arbitratorAddress = this._ArbitratorInstance.getContractAddress()

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
        event.blockNumber,
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
   * Handler for TokenShift event.
   * NOTE: you will get a notification for each vote. So a juror that has 3 votes will receive 3 notifications
   * @param {object} event - The event log.
   * @param {string} account - The user account.
   * @param {function} callback - The callback.
   */
  _tokenShiftHandler = async (event, account, callback) => {
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()

    if (account === address) {
      const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
      const notification = await this._newNotification(
        account,
        event.transactionHash,
        event.blockNumber,
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
   * @param {object} event - The event log.
   * @param {string} account - The user account.
   * @param {function} callback - The callback.
   */
  _arbitrationRewardHandler = async (event, account, callback) => {
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()

    if (account === address) {
      const arbitratorAddress = this._ArbitratorInstance.getContractAddress()
      const notification = await this._newNotification(
        account,
        event.transactionHash,
        event.blockNumber,
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

  /**
   * Creates a new notification object in the store.
   * @param {string} account - The account.
   * @param {string} txHash - The txHash.
   * @param {string} blockNumber - The block number of the event log.
   * @param {number} logIndex - The logIndex.
   * @param {number} notificationType - The notificationType.
   * @param {string} message - The message.
   * @param {object} data - The data.
   * @param {bool} read - Wether the notification has been read or not.
   * @returns {function} - The notification object.
   */
  _newNotification = async (
    account,
    txHash,
    blockNumber,
    logIndex,
    notificationType,
    message = '',
    data = {},
    read = false
  ) => {
    if (this._StoreProviderInstance) {
      // update last block we have processed an event for
      await this._StoreProviderInstance.updateLastBlock(account, blockNumber)

      const response = await this._StoreProviderInstance.newNotification(
        account,
        txHash,
        logIndex,
        notificationType,
        message,
        data,
        read
      )

      if (response.status === 201) {
        const notification = response.body.notifications.filter(
          notification =>
            notification.txHash === txHash && notification.logIndex === logIndex
        )
        return notification[0]
      }
    } else {
      // If we have no store provider simply return object of params for a push notification
      return {
        txHash,
        logIndex,
        notificationType,
        message,
        data,
        read
      }
    }
  }

  /**
   * Get contracts from store if set or return empty array. Used for notifications
   * @param {string} account - Filter notifications for account.
   * @returns {object[]} - Array of dispute objects
   */
  _getContracts = async account => {
    let contracts = []

    // If we have store provider fetch contracts and disputes from the store.
    if (this._StoreProviderInstance) {
      const userProfile = await this._StoreProviderInstance.newUserProfile(
        account
      )

      contracts = userProfile.contracts
    }

    return contracts
  }

  /**
   * Get disputes either from store or from arbitrator if Store Provider is not set. Used for notifications
   * @param {string} account - Filter notifications for account.
   * @param {function} isJuror - If the account is a juror.
   * @returns {object[]} - Array of dispute objects
   */
  _getDisputes = async (account, isJuror = true) => {
    let disputes = []

    // If we have store provider fetch contracts and disputes from the store.
    if (this._StoreProviderInstance) {
      disputes = await this._StoreProviderInstance.getDisputes(account)
    } else if (isJuror) {
      // We have no way to get contracts. Get disputes from current session
      // TODO make a function to get open disputes for parites
      disputes = await this._ArbitratorInstance.getDisputesForJuror(account)
    }

    return disputes
  }

  _requireStoreProvider = () => {
    if (!this._StoreProviderInstance) throw new Error(MISSING_STORE_PROVIDER)
  }
}

export default Notifications
