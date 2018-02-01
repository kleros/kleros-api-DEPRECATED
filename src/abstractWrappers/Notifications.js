import AbstractWrapper from './AbstractWrapper'
import { NOTIFICATION_TYPES } from '../../constants'
import _ from 'lodash'

/**
 * Notifications api
 */
class Notifications extends AbstractWrapper {
  /**
   * Notifications Constructor
   * @param {object} storeProvider store provider object
   * @param {object} arbitratorWrapper arbitrator contract wrapper object
   * @param {object} arbitrableWrapper arbitrable contract wrapper object
   * @param {object} eventListener event listner object
   */
  constructor(storeProvider, arbitratorWrapper, arbitrableWrapper, eventListener) {
    super(storeProvider, arbitratorWrapper, arbitrableWrapper, eventListener)
  }

  // **************************** //
  // *         Public           * //
  // **************************** //
  /**
  * start listening for events
  * @param {string} arbitratorAddress address of arbitrator
  */
  listenForEvents = async (
    arbitratorAddress
  ) => {
    this._eventListener.watchForArbitratorEvents(arbitratorAddress)
  }

  /**
  * register event listeners for arbitrator.
  * @param {string} account filter notifications for account
  * @param {function} callback if we want notifications to be "pushed" provide a callback function to call when a new notificiation is created
  */
  registerNotificationListeners = async (
    account,
    callback
  ) => {
    // Register all of the callbacks TODO DRY this out a little
    // await this._eventListener.registerArbitrableEvent('NewPeriod', (args) => this._newPeriodHandler(args, callback))
    await this._eventListener.registerArbitratorEvent('DisputeCreation', this._createHandler(this._disputeCreationHandler, account, callback))
    await this._eventListener.registerArbitratorEvent('AppealPossible', this._createHandler(this._appealPossibleHandler, account, callback))
    await this._eventListener.registerArbitratorEvent('AppealDecision', this._createHandler(this._appealingDecisionHandler, account, callback))
    await this._eventListener.registerArbitratorEvent('TokenShift', this._createHandler(this._tokenShiftHandler, account, callback))
    await this._eventListener.registerArbitratorEvent('ArbitrationReward', this._createHandler(this._arbitrationRewardHandler, account, callback))
  }

  getStatefulNotifications = async (
    account,
    isJuror = true
  ) => {

  }

  /**
  * Fetch all unread notifications
  * @param {string} account address of user
  */
  getUnreadNoticiations = async (
    account
  ) => {
    const profile = await this._StoreProvider.getUserProfile(account)
    return _.filter(profile.notifications, notification => {
      return !notification.read
    })
  }

  markNotificationAsRead = async (
    account,
    txHash
  ) => {
    const profile = await this._StoreProvider.getUserProfile(account)
    const notificationIndex = await _.findIndex(profile.notifications, notification => {
      return notification.txHash === txHash
    })

    if (_.isNull(notificationIndex)) {
      throw new Error(`No notification with txHash ${txHash} exists`)
    }

    profile.notifications[notificationIndex].read = true
    await this._StoreProvider.updateUserProfile(account, profile)
  }

  /**
  * Fetch all user notifications
  * @param {string} account address of user
  */
  getNoticiations = async (
    account
  ) => {
    const profile = await this._StoreProvider.getUserProfile(account)
    return profile.notifications
  }

  // **************************** //
  // *        Handlers          * //
  // **************************** //
  _newPeriodHandler = async (event, account, callback) => {}

  _disputeCreationHandler = async (event, account, callback) => {
    const disputeId = event.args._disputeID.toNumber()
    const arbitratorAddress = this._eventListener.arbitratorAddress

    const dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
    const arbitrableData = await this._ArbitrableContract.getData(dispute.arbitratedContract)

    // the two counterparties need notifications
    await this._StoreProvider.newNotification(
      arbitrableData.partyA,
      event.transactionHash,
      NOTIFICATION_TYPES.DISPUTE_CREATED,
      'New Dispute Created',
      {
        disputeId: disputeId
      }
    )

    await this._StoreProvider.newNotification(
      arbitrableData.partyB,
      event.transactionHash,
      NOTIFICATION_TYPES.DISPUTE_CREATED,
      'New Dispute Created',
      {
        disputeId: disputeId
      }
    )

    if (callback) {
      // if account supplied then we know that we only want to receive relavent notifications
      if (account) {
        // if this notification was about us forward notification
        if (account === arbitrableData.partyA || account === arbitrableData.partyB) {
          const userProfile = await this._StoreProvider.getUserProfile(account)
          const notification = _.filter(userProfile.notifications, notification => {
            return notification.txHash === event.transactionHash
          })

          if (notification) {
            callback(notification[0])
          }
        }
      } else {
        // if no account supplied forward all notifications
        const userProfile = await this._StoreProvider.getUserProfile(arbitrableData.partyA)
        const notification = _.filter(userProfile.notifications, notification => {
          return notification.txHash === event.transactionHash
        })

        if (notification)
          callback(notification[0])
      }
    }
  }
  _appealPossibleHandler = async (event, account, callback) => {}
  _appealingDecisionHandler = async (event, account, callback) => {}
  _tokenShiftHandler = async (event, account, callback) => {}
  _arbitrationRewardHandler = async (event, account, callback) => {}

  // **************************** //
  // *        Helpers           * //
  // **************************** //
  /**
  * Helper method to create handler with correct params
  */
  _createHandler = (handler, account, callback) => {
    const h = (
      args
    ) => handler(args, account, callback)
    return h
  }
}

export default Notifications
