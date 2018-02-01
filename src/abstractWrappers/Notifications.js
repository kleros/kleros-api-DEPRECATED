import AbstractWrapper from './AbstractWrapper'
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

  /**
  * Helper method to create handler with correct params
  */
  _createHandler = (handler, account, callback) => {
    return (
      args,
      account = account,
      callback = callback
    ) => handler(args, account, callback)
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
    return _.filter(profile, notification => {
      return !notification.read
    })
  }

  markNotificationAsRead = async (
    account,
    notificationId
  ) => {
    const profile = await this._StoreProvider.getUserProfile(account)
    const notificationIndex = _.findIndex(profile.notifications, notification => {
      return notification.notificationId === notificationId
    })

    if (!notificationId) {
      throw new Error(`No notification with id ${notificationId} exists`)
    }

    profile.notifications[notificationIndex].read = true
    this._StoreProvider.updateUserProfile(account, profile)
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
  _newPeriodHandler = async (eventArgs, account, callback) => {}

  _disputeCreationHandler = async (eventArgs, account, callback) => {

  }
  _appealPossibleHandler = async (eventArgs, account, callback) => {}
  _appealingDecisionHandler = async (eventArgs, account, callback) => {}
  _tokenShiftHandler = async (eventArgs, account, callback) => {}
  _arbitrationRewardHandler = async (eventArgs, account, callback) => {}
}

export default Notifications
