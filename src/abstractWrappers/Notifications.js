import _ from 'lodash'

import * as ethConstants from '../constants/eth'
import * as arbitratorConstants from '../constants/arbitrator'
import * as notificationConstants from '../constants/notification'
import * as disputeConstants from '../constants/dispute'

import AbstractWrapper from './AbstractWrapper'

/**
 * Notifications API
 */
class Notifications extends AbstractWrapper {
  // **************************** //
  // *         Public           * //
  // **************************** //
  /**
   * register event listeners for arbitrator.
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - Filter notifications for account.
   * @param {function} callback - If we want notifications to be "pushed" provide a callback function to call when a new notificiation is created.
   */
  registerNotificationListeners = async (
    arbitratorAddress,
    account,
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
        await this._eventListener.registerArbitratorEvent(
          event,
          this._createHandler(
            eventHandlerMap[event],
            arbitratorAddress,
            account,
            callback
          )
        )
      }
    }
  }

  /**
   * Get stateful notifications. Stateful notifications change based on the state of the arbitrator contract.
   * @param {string} arbitratorAddress - The arbitrator contract's address.
   * @param {string} account - Filter notifications for account.
   * @param {function} isJuror - If the account is a juror.
   * @returns {object[]} - Array of stateful notification objects.
   */
  getStatefulNotifications = async (
    arbitratorAddress,
    account,
    isJuror = true
  ) => {
    const notifications = []
    const userProfile = await this._StoreProvider.getUserProfile(account) // FIXME have caller pass this instead?
    const currentPeriod = await this._Arbitrator.getPeriod(arbitratorAddress)
    const currentSession = await this._Arbitrator.getSession(arbitratorAddress)

    if (isJuror) {
      /* Juror notifications:
      * - Activate tokens
      * - Need to vote (get from store. client should call getDisputesForUser to populate) NOTE: or we could populate here and have disputes read from store?
      * - Ready to repartition (shared)
      * - Ready to execute (shared)
      */
      if (currentPeriod === arbitratorConstants.PERIOD.ACTIVATION) {
        // FIXME use estimateGas
        const contractInstance = await this._loadArbitratorInstance(
          arbitratorAddress
        )
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
        userProfile.disputes.forEach(dispute => {
          if (
            dispute.isJuror &&
            dispute.votes.length > 0 &&
            !dispute.hasRuled
          ) {
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
        })
      }
    } else {
      /* Counterparty notifications:
      * - Need to pay fee
      * - Ready to repartition (shared)
      * - Ready to execute (shared)
      */
      await Promise.all(
        userProfile.contracts.map(async contract => {
          const contractData = await this._ArbitrableContract.getData(
            contract.address
          )
          const arbitrationCost = await this._Arbitrator.getArbitrationCost(
            arbitratorAddress,
            contractData.arbitratorExtraData
          )
          if (contractData.partyA === account) {
            if (contractData.partyAFee < arbitrationCost) {
              notifications.push(
                this._createNotification(
                  notificationConstants.TYPE.CAN_PAY_FEE,
                  'Arbitration fee required',
                  {
                    arbitratorAddress,
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
                    arbitratorAddress,
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
    if (currentPeriod === PERIODS.EXECUTE) {
      console.log("Starting....")
      await Promise.all(userProfile.disputes.map(async dispute => {
        const disputeData = await this._Arbitrator.getDispute(dispute.arbitratorAddress, dispute.disputeId)
        if (disputeData.firstSession + disputeData.numberOfAppeals === currentSession) {
          if (disputeData.state <= DISPUTE_STATES.RESOLVING) {
            notifications.push(this._createNotification(
              NOTIFICATION_TYPES.CAN_REPARTITION,
              "Ready to repartition dispute",
              {
                disputeId: dispute.disputeId,
                arbitratorAddress: dispute.arbitratorAddress
              }
            ))
            console.log("did stuff")
          } else if (disputeData.state === DISPUTE_STATES.EXECUTABLE) {
            notifications.push(this._createNotification(
              NOTIFICATION_TYPES.CAN_EXECUTE,
              "Ready to execute dispute",
              {
                disputeId: dispute.disputeId,
                arbitratorAddress: dispute.arbitratorAddress
              }
            ))
          }
        }
      }))
      console.log("Done....")
    }

    return notifications
  }

  /**
   * Fetch all unread notifications.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of notification objects.
   */
  getUnreadNotifications = async account => {
    const profile = await this._StoreProvider.getUserProfile(account)
    return _.filter(profile.notifications, notification => !notification.read)
  }

  /**
   * Fetch all unread notifications
   * @param {string} account address of user
   * @param {string} txHash hash of transaction that produced event
   * @param {number} logIndex index of the log. used to differentiate logs if multiple logs per tx
   */
  markNotificationAsRead = async (account, txHash, logIndex) => {
    const profile = await this._StoreProvider.getUserProfile(account)
    const notificationIndex = await _.findIndex(
      profile.notifications,
      notification =>
        notification.txHash === txHash && notification.logIndex === logIndex
    )

    if (_.isNull(notificationIndex)) {
      throw new TypeError(`No notification with txHash ${txHash} exists`)
    }

    profile.notifications[notificationIndex].read = true
    await this._StoreProvider.updateUserProfile(account, profile)
  }

  /**
   * Fetch all user notifications.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of notification objects.
   */
  getNotifications = async account => {
    const profile = await this._StoreProvider.getUserProfile(account)
    return profile.notifications
  }

  // **************************** //
  // *        Handlers          * //
  // **************************** //
  /**
   * TODO Send push notifications for period state events?
   * We can get a list of subscribers by having jurors subscribe to an arbitrator. Raises new problems however
   * @param {object} event - The event.
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _newPeriodHandler = async (event, arbitratorAddress, account, callback) => {
    const newPeriod = event.args._period.toNumber()

    // send appeal possible notifications
    if (newPeriod === arbitratorConstants.PERIOD.APPEAL) {
      this._checkArbitratorWrappersSet()
      const userProfile = await this._StoreProvider.getUserProfile(account)
      // contract data
      const arbitratorData = await this._Arbitrator.getData(
        arbitratorAddress,
        account
      )
      let disputeId = 0
      const currentSession = arbitratorData.session

      let dispute
      const findDisputeIndex = dispute =>
        dispute.disputeId === disputeId &&
        dispute.arbitratorAddress === arbitratorAddress

      while (1) {
        // iterate over all disputes (FIXME inefficient)
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
          // FIXME DRY this out with _appealPossibleHandler. Cant call directly because we don't have the actual event being called
          const ruling = await this._Arbitrator.currentRulingForDispute(
            arbitratorAddress,
            disputeId
          )

          if (_.findIndex(userProfile.disputes, findDisputeIndex) >= 0) {
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
          // check next dispute
          disputeId += 1
          // eslint-disable-next-line no-unused-vars
        } catch (err) {
          // getDispute(n) throws an error if index out of range
          break
        }
      }
    }
  }

  /**
   * Handler for DisputeCreation event
   * sends notification to partyA and partyB when dispute is created
   * @param {object} event - The event.
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _disputeCreationHandler = async (
    event,
    arbitratorAddress,
    account,
    callback
  ) => {
    const disputeId = event.args._disputeID.toNumber()
    const txHash = event.transactionHash
    const arbitrableData = await this._ArbitrableContract.getData(
      event.args._arbitrable
    )

    if (
      arbitrableData.partyA === account ||
      arbitrableData.partyB === account
    ) {
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
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _appealPossibleHandler = async (
    event,
    arbitratorAddress,
    account,
    callback
  ) => {
    const userProfile = await this._StoreProvider.getUserProfile(account)
    const disputeId = event.args._disputeID.toNumber()
    const ruling = await this._Arbitrator.currentRulingForDispute(
      arbitratorAddress,
      disputeId
    )

    if (
      _.findIndex(
        userProfile.disputes,
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
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _appealingDecisionHandler = async (
    event,
    arbitratorAddress,
    account,
    callback
  ) => {
    const userProfile = await this._StoreProvider.getUserProfile(account)
    const disputeId = event.args._disputeID.toNumber()

    if (
      _.findIndex(
        userProfile.disputes,
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
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _tokenShiftHandler = async (event, arbitratorAddress, account, callback) => {
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()

    if (account === address) {
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
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   */
  _arbitrationRewardHandler = async (
    event,
    arbitratorAddress,
    account,
    callback
  ) => {
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()

    if (account === address) {
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
      await this._StoreProvider.getUserProfile(account)

      if (notification) await this._sendPushNotification(callback, notification)
    }
  }

  // **************************** //
  // *        Helpers           * //
  // **************************** //
  /**
   * Helper method to create handler with correct params
   * @param {function} handler - The handler.
   * @param {string} arbitratorAddress - The arbitratorAddress.
   * @param {string} account - The account.
   * @param {function} callback - The callback.
   * @returns {object} - The created handler.
   */
  _createHandler = (handler, arbitratorAddress, account, callback) => args =>
    handler(args, arbitratorAddress, account, callback)

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
    logIndex,
    notificationType,
    message = '',
    data = {},
    read = false
  ) => {
    const response = await this._StoreProvider.newNotification(
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
  }
}

export default Notifications
