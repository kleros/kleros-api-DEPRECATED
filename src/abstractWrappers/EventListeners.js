import AbstractWrapper from './AbstractWrapper'

class EventListeners extends AbstractWrapper {
  /** Listen for events in contract
  *   Handles callbacks with registered event handlers
  *   @param {object} storeProvider store provider object
  *   @param {object} arbitratorWrapper arbitrator contract wrapper object
  *   @param {object} arbitrableWrapper arbitrable contract wrapper object
  */
  constructor(storeProvider, arbitratorWrapper, arbitrableWrapper) {
    super(storeProvider, arbitratorWrapper, arbitrableWrapper)
    // key: event name, value: [event handlers, ...]
    this._arbitratorEventMap = {}
    this._arbitrableEventMap = {}
    // key: contract address, value: true/false
    this._arbitratorEventsWatcher
    this._arbitrableEventsWatcher
    // store these here so we can switch accounts/contracts on the fly
    this.arbitratorAddress
    this.account
  }

  /** Update store for events we missed and watch for events on arbitrator contract.
  *   Handles callbacks with registered event handlers
  *   FIXME DRY this out for arbitrable
  *   @param {string} arbitratorAddress address of arbitrator contract
  */
  watchForArbitratorEvents = async (
    arbitratorAddress,
    account
  ) => {
    this._checkArbitratorWrappersSet()
    // don't need to add another listener if we already have one
    if (this._arbitratorEventsWatcher) return
    if (arbitratorAddress) this.arbitratorAddress = arbitratorAddress
    if (account) this.account = account

    const lastBlock = await this._StoreProvider.getLastBlock(this.account)
    const currentBlock = await this._Arbitrator._getCurrentBlockNumber()
    const contractInstance = await this._loadArbitratorInstance(this.arbitratorAddress)
    const eventWatcher = contractInstance.allEvents({}, {fromBlock: lastBlock, toBlock: 'latest'})

    this._arbitratorEventsWatcher = eventWatcher

    if (!lastBlock || lastBlock < currentBlock) {
      // FETCH EVENTS WE MIGHT HAVE MISSED
      eventWatcher.get((error, eventResult) => {
        if (!error) {
          eventResult.map(result => {
            const handlers = this._arbitratorEventMap[result.event]
            if (handlers.length > 0) {
              handlers.map(callback => {
                callback(result)
              })
            }
          })

          this._StoreProvider.updateLastBlock(this.account, currentBlock)
        }
      })
    }

    eventWatcher.watch((error, result) => {
      if (!error) {
        const handlers = this._arbitratorEventMap[result.event]
        if (handlers) {
          handlers.map(callback => {
            callback(result)
          })
        }
        this._StoreProvider.updateLastBlock(this.account, result.blockNumber)
      }
    })
  }

  /** stop listening on contract
  *   @param {string} arbitratorAddress address of arbitrator contract
  */
  stopWatchingArbitratorEvents = arbitratorAddress => {
    if (this._arbitratorEventsWatcher) this._arbitratorEventsWatcher.stopWatching()
    this.arbitratorAddress = null
  }

  /** register event listener callback for event
  *   @param {string} eventName name of event
  *   @param {function} eventHandler will be called when event is found
  */
  registerArbitratorEvent = async (eventName, eventHandler) => {
    const handlers = this._arbitratorEventMap[eventName]
      if (!handlers) {
        this._arbitratorEventMap[eventName] = [eventHandler]
      } else {
        this._arbitratorEventMap[eventName].push(eventHandler)
      }
  }

  /** deletes event listeners for event
  *   FIXME make a way to unregister a single event listener
  *   @param {string} eventName name of event to stop doing actions for
  */
  deregisterArbitratorEvent = eventName => {
    delete this._arbitratorEventMap[eventName]
  }

  registerArbitrableEvent = (eventName, eventHandler) => {
    this._arbitrableEventMap[eventName] = eventHandler
  }

  deregisterArbitrableEvent = eventName => {
    delete this._arbitrableEventMap[eventName]
  }

  changeAccount = account => {
    this.account = account

    this.stopWatchingArbitratorEvents()
    this.watchForArbitratorEvents()
  }

  changeArbitrator = arbitratorAddress => {
    this.arbitratorAddress = arbitratorAddress
  }
}

export default EventListeners
