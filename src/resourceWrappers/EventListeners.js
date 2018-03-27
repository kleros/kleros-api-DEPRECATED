import PromiseQueue from '../utils/PromiseQueue'

import ResourceWrapper from './ResourceWrapper'

class EventListeners extends ResourceWrapper {
  /**
   * Listen for events in contract and handles callbacks with registered event handlers
   * @param {object} arbitratorWrapper - Arbitrator contract instance.
   * @param {object} arbitrableWrapper - Arbitrable contract instance.
   * @param {object} storeProviderWrapper - StoreProvider instance.
   */
  constructor(arbitratorWrapper, arbitrableWrapper, storeProviderWrapper) {
    super(arbitratorWrapper, arbitrableWrapper, storeProviderWrapper)
    this._arbitratorEventMap = {} // key: event name, value: [event handlers, ...]
    this._arbitrableEventMap = {} // key: event name, value: [event handlers, ...]
    this._arbitratorEventsWatcher = null
    this._arbitrableEventsWatcher = null
    // store these here so we can switch accounts/contracts on the fly
    this.arbitratorAddress = ''
    this.account = ''
    // event handler queue
    this.eventHandlerQueue = new PromiseQueue()
  }

  /**
   * Update store for events we missed and watch for events on arbitrator contract. FIXME DRY this out for arbitrable.
   * @param {string} arbitratorAddress - Address of arbitrator contract.
   * @param {string} account - The account.
   */
  watchForArbitratorEvents = async (arbitratorAddress, account) => {
    this._checkArbitratorWrappersSet()
    if (arbitratorAddress) this.arbitratorAddress = arbitratorAddress
    if (account) this.account = account

    // Return all events if there is no Store Provider.
    let lastBlock = 0
    if (this._hasStoreProvider())
      lastBlock = await this._StoreProvider.getLastBlock(this.account)

    const contractInstance = await this._loadArbitratorInstance(
      this.arbitratorAddress
    )
    // don't need to add another listener if we already have one
    if (this._arbitratorEventsWatcher)
      this._arbitratorEventsWatcher.stopWatching()
    this._arbitratorEventsWatcher = contractInstance.allEvents({
      fromBlock: lastBlock + 1,
      toBlock: 'latest'
    })
    this._arbitratorEventsWatcher.watch(async (error, result) => {
      if (!error) {
        const handlers = this._arbitratorEventMap[result.event]
        if (handlers) {
          handlers.forEach(handler => {
            this._queueEvent(handler, result)
          })
        }
      }
    })
  }

  /**
   * Stop listening on contract.
   */
  stopWatchingArbitratorEvents = () => {
    if (this._arbitratorEventsWatcher)
      this._arbitratorEventsWatcher.stopWatching()
    this.clearArbitratorHandlers()
  }

  /**
   * Register event listener callback for event.
   * @param {string} eventName - Name of event.
   * @param {function} eventHandler - Will be called when event is found.
   */
  registerArbitratorEvent = (eventName, eventHandler) => {
    const handlers = this._arbitratorEventMap[eventName]
    if (!handlers) {
      this._arbitratorEventMap[eventName] = [eventHandler]
    } else {
      this._arbitratorEventMap[eventName].push(eventHandler)
    }
  }

  /**
   * Clear arbitrator handlers.
   */
  clearArbitratorHandlers = () => {
    this._arbitratorEventMap = {}
  }

  /**
   * Deletes event listeners for event.
   * FIXME make a way to unregister a single event listener
   * @param {string} eventName - Name of event to stop doing actions for.
   */
  deregisterArbitratorEvent = eventName => {
    delete this._arbitratorEventMap[eventName]
  }

  /**
   * Registers an event.
   * @param {string} eventName - The event name.
   * @param {object} eventHandler - The event handler.
   */
  registerArbitrableEvent = (eventName, eventHandler) => {
    this._arbitrableEventMap[eventName] = eventHandler
  }

  /**
   * Deregisters an event.
   * @param {string} eventName - The event name.
   */
  deregisterArbitrableEvent = eventName => {
    delete this._arbitrableEventMap[eventName]
  }

  /**
   * Changes the account.
   * @param {string} account - The account.
   */
  changeAccount = account => {
    this.account = account

    this.stopWatchingArbitratorEvents()
    this.watchForArbitratorEvents()
  }

  /**
   * Changes the arbitrator.
   * @param {string} arbitratorAddress - The arbitrator address.
   */
  changeArbitrator = arbitratorAddress => {
    this.arbitratorAddress = arbitratorAddress
  }

  /**
   * Queues an event.
   * @param {function} handler - The handler.
   * @param {object} event - The event.
   */
  _queueEvent = async (handler, event) => {
    const eventTask = async () => {
      await handler(event)
      if (this._hasStoreProvider())
        await this._StoreProvider.updateUserProfile(this.account, {
          lastBlock: event.blockNumber
        })
    }

    this.eventHandlerQueue.push(eventTask)
  }
}

export default EventListeners
