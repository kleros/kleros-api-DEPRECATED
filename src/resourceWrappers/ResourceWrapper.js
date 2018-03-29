import _ from 'lodash'

import * as errorConstants from '../constants/error'

class ResourceWrapper {
  /**
   * AbstractWrapper is the parent class for abstract classes that interact with the
   * store and instances of contracts. These are different from store wrappers in that
   * they do not act as extensions of a contract wrapper but instead provide new functionality
   * that utilize both the store and the blockchain
   * @param {object} arbitratorWrapper - Arbitrator contract wrapper object.
   * @param {object} arbitrableWrapper - Arbitrable contract wrapper object.
   * @param {object} eventListener - EventListener instance.
   * @param {object} storeProviderWrapper - StoreProvider wrapper object.
   */
  constructor(
    arbitratorWrapper,
    arbitrableWrapper,
    eventListener,
    storeProviderWrapper
  ) {
    this._Arbitrator = arbitratorWrapper
    this._ArbitrableContract = arbitrableWrapper
    this._eventListener = eventListener
    this._StoreProvider = storeProviderWrapper
  }

  /**
   * set store wrapper
   * @param {object} storeWrapper wrapper for store
   */
  setStoreProvider = storeWrapper => {
    this._StoreProvider = storeWrapper
  }

  /**
   * set Arbitrator wrapper
   * @param {object} arbitratorWrapper wrapper for arbitrator contract
   */
  setArbitrator = arbitratorWrapper => {
    this._Arbitrator = arbitratorWrapper
  }

  /**
   * set Arbitrable wrapper
   * @param {object} arbitrableWrapper wrapper for arbitrable contract
   */
  setArbitrable = arbitrableWrapper => {
    this._ArbitrableContract = arbitrableWrapper
  }

  /**
   * set event listner
   * @param {object} eventListener event listener objec
   */
  setEventListener = eventListener => {
    this._eventListener = eventListener
  }

  /**
   * throws an error if Arbitrator contract wrappers are not set yet
   */
  _checkArbitratorWrappersSet = () => {
    if (!this._Arbitrator)
      throw new Error(errorConstants.NO_ARBITRATOR_WRAPPER_SPECIFIED)
  }

  /**
   * throws an error if Arbitable contract wrappers are not set yet
   */
  _checkArbitrableWrappersSet = () => {
    if (!this._ArbitrableContract)
      throw new Error(errorConstants.NO_ARBITRABLE_WRAPPER_SPECIFIED)
  }

  /**
   * throws an error if Store Provider Wrapper is not set yet
   */
  _checkStoreProviderSet = () => {
    if (_.isNull(this._StoreProvider))
      throw new Error(errorConstants.NO_STORE_PROVIDER_SPECIFIED)
  }

  /**
   * Returns boolean indicating if there is a StoreProvider
   * @returns {boolean} is Store Provider set
   */
  _hasStoreProvider = () => !!this._StoreProvider

  /**
   * Load instance of arbitrator contract.
   * @param {string} arbitratorAddress - Address.
   * @returns {Promise<object>} - Instance of arbitrator contract wrapper.
   */
  _loadArbitratorInstance = () => {
    this._checkArbitratorWrappersSet()
    return this._Arbitrator.getContractInstance()
  }

  /**
   * Load instance of arbitrable contract.
   * @param {string} arbitrableAddress - Address.
   * @returns {Promise<object>} - Instance of arbitrable contract wrapper.
   */
  _loadArbitrableInstance = async arbitrableAddress => {
    this._checkArbitrableWrappersSet()
    return this._ArbitrableContract.load(arbitrableAddress)
  }

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
    if (this._hasStoreProvider()) {
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
    } else {
      // If we have no store provider simply return object of params.
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
    if (this._hasStoreProvider()) {
      const userProfile = await this._StoreProvider.getUserProfile(account)

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
    if (this._hasStoreProvider()) {
      await this._StoreProvider.getDisputesForUser(account)
    } else if (isJuror) {
      // We have no way to get contracts. Get disputes from current session
      // TODO make a function to get open disputes for parites
      disputes = await this._Arbitrator.getDisputesForJuror(account)
    }

    return disputes
  }
}

export default ResourceWrapper
