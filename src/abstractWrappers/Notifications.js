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
  /**
  * TODO Send push notifications for period state events?
  * FIXME how to we get a list of subscribers?
  */
  _newPeriodHandler = async (event, account, callback) => {}

  /**
  * handler for DisputeCreation event
  * sends notification to partyA and partyB when dispute is created
  */
  _disputeCreationHandler = async (event, account, callback) => {
    console.log("_disputeCreationHandler")
    console.log(event)
    const disputeId = event.args._disputeID.toNumber()
    const arbitratorAddress = this._eventListener.arbitratorAddress
    const txHash = event.transactionHash

    const dispute = await this._Arbitrator.getDispute(arbitratorAddress, disputeId)
    const arbitrableData = await this._ArbitrableContract.getData(dispute.arbitratedContract)

    let subscribers
    try {
      subscribers = await this._getSubscribersForDispute(arbitratorAddress, disputeId)
    } catch (e) {
      // if dispute isn't in db do nothing
      subscribers = [arbitrableData.partyA, arbitrableData.partyB]
    }

    await Promise.all(subscribers.map(async subscriber => {
      await this._StoreProvider.newNotification(
        subscriber,
        txHash,
        NOTIFICATION_TYPES.DISPUTE_CREATED,
        'New Dispute Created',
        {
          disputeId: disputeId,
          arbitratorAddress: arbitratorAddress
        }
      )
    }))

    await this._sendPushNotification(subscribers, txHash, account, callback)
    console.log("_disputeCreationHandler done")
  }

  /**
  * handler for AppealPossible event
  * sends notification informing subscribers that a ruling has been made and an appeal possible
  */
  _appealPossibleHandler = async (event, account, callback) => {
    console.log("_appealPossibleHandler")
    const disputeId = event.args._disputeID.toNumber()
    const arbitratorAddress = this._eventListener.arbitratorAddress
    const ruling = await this._Arbitrator.currentRulingForDispute(arbitratorAddress, disputeId)

    subscribers = await this._getSubscribersForDispute(arbitratorAddress, disputeId)

    await Promise.all(subscribers.map(async subscriber => {
      await this._StoreProvider.newNotification(
        subscriber,
        event.transactionHash,
        NOTIFICATION_TYPES.APPEAL_POSSIBLE,
        'A ruling has been made. Appeal is possible',
        {
          disputeId,
          arbitratorAddress,
          ruling
        }
      )
    }))

    await this._sendPushNotification(subscribers, event.transactionHash, account, callback)
    console.log("_appealPossibleHandler done")
  }

  /**
  * handler for AppealDecision event
  * sends notification informing subscribers that a ruling has been appealed
  */
  _appealingDecisionHandler = async (event, account, callback) => {
    console.log("_appealingDecisionHandler")
    const disputeId = event.args._disputeID.toNumber()
    const arbitratorAddress = this._eventListener.arbitratorAddress

    subscribers = await this._getSubscribersForDispute(arbitratorAddress, disputeId)

    await Promise.all(subscribers.map(async (subscriber) => {
      await this._StoreProvider.newNotification(
        subscriber,
        event.transactionHash,
        NOTIFICATION_TYPES.RULING_APPEALED,
        'A ruling been appealed',
        {
          disputeId,
          arbitratorAddress
        }
      )
    }))

    await this._sendPushNotification(subscribers, event.transactionHash, account, callback)
    console.log("_appealingDecisionHandler done")
  }

  /**
  * handler for TokenShift event
  * sends notification informing
  */
  _tokenShiftHandler = async (event, account, callback) => {
    console.log("_tokenShiftHandler")
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()
    const arbitratorAddress = this._eventListener.arbitratorAddress

    await this._StoreProvider.newNotification(
      address,
      event.transactionHash,
      NOTIFICATION_TYPES.TOKEN_SHIFT,
      'Tokens have be redistributed',
      {
        disputeId,
        arbitratorAddress,
        account: address,
        amount
      }
    )

    await this._sendPushNotification([address], event.transactionHash, account, callback)
    console.log("_tokenShiftHandler done")
  }

  _arbitrationRewardHandler = async (event, account, callback) => {
    console.log("_arbitrationRewardHandler")
    // address indexed _account, uint _disputeID, int _amount
    const disputeId = event.args._disputeID.toNumber()
    const address = event.args._account
    const amount = event.args._amount.toNumber()
    const arbitratorAddress = this._eventListener.arbitratorAddress

    await this._StoreProvider.newNotification(
      address,
      event.transactionHash,
      NOTIFICATION_TYPES.ARBITRATION_REWARD,
      'Juror awarded arbitration fee',
      {
        disputeId,
        arbitratorAddress,
        account: address,
        amount
      }
    )

    await this._sendPushNotification([address], event.transactionHash, account, callback)
    console.log("_arbitrationRewardHandler done")
  }

  // **************************** //
  // *        Helpers           * //
  // **************************** //
  /**
  * Helper method to create handler with correct params
  */
  _createHandler = (handler, account, callback) => {
    return (
      args
    ) => handler(args, account, callback)
  }

  _getSubscribersForDispute = async (arbitratorAddress, disputeId) => {
    const disputeProfile = await this._StoreProvider.getDispute(arbitratorAddress, disputeId)

    return disputeProfile.subscribers
  }

  _sendPushNotification = async (subscribers, txHash, account, callback) => {
    if (callback) {
      // if account supplied then we know that we only want to receive relavent notifications
      if (account) {
        // if this user is subscriber of notification, push it
        if (_.indexOf(subscribers, account) >= 0) {
          const userProfile = await this._StoreProvider.getUserProfile(account)
          const notification = _.filter(userProfile.notifications, notification => {
            return notification.txHash === txHash
          })

          if (notification) {
            callback(notification[0])
          }
        }
      } else {
        // if no account supplied forward all notifications
        const userProfile = await this._StoreProvider.getUserProfile(subscribers[0])
        const notification = _.filter(userProfile.notifications, notification => {
          return notification.txHash === txHash
        })

        if (notification)
          callback(notification[0])
      }
    }
  }
}

export default Notifications
