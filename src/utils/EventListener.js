import _ from 'lodash'

import PromiseQueue from '../utils/PromiseQueue'
import isRequired from '../utils/isRequired'
import * as errorConstants from '../constants/error'

class EventListener {
  /**
   * Listen for events in contract and handles callbacks with registered event handlers.
   * @param {object[]} _contractInstances - truffle-contract instances to fetch event logs for.
   */
  constructor(_contractInstances = []) {
    this.contractInstances = []
    // map address -> { event: [handlers], ... }
    this.contractEventHandlerMap = {}
    // map address -> watcher instance
    this.watcherInstances = {}
    // event handler queue
    this.eventHandlerQueue = new PromiseQueue()
    // initialize class variables for new contract instances
    _contractInstances.forEach(instance => {
      this.addContractInstance(instance)
    })
  }

  /**
   * Fetch all logs from contractInstance in range.
   * @param {object} contractInstance - truffle-contract instance.
   * @param {number} firstBlock - Lower bound of search range.
   * @param {number} lastBlock - Upper bound of search range.
   * @returns {Promise} All events in block range.
   */
  static getAllEventLogs = (
    contractInstance = isRequired('contractInstance'),
    firstBlock = 0,
    lastBlock = 'latest'
  ) =>
    Promise.all(
      contractInstance
        .allEvents({
          fromBlock: firstBlock,
          toBlock: lastBlock
        })
        .get((error, result) => {
          if (error)
            throw new Error(errorConstants.ERROR_FETCHING_EVENTS(error))

          return result
        })
    )

  /**
   * Fetch all logs from contractInstance for event in range.
   * @param {object} contractInstance - truffle-contract instance.
   * @param {string} eventName - Name of the event.
   * @param {number} firstBlock - Lower bound of search range.
   * @param {number} lastBlock - Upper bound of search range.
   * @returns {Promise} All events in block range.
   */
  static getEventLogs = (
    contractInstance = isRequired('contractInstance'),
    eventName = isRequired('eventName'),
    firstBlock = 0,
    lastBlock = 'latest'
  ) =>
    Promise.all(
      contractInstance[eventName]({
        fromBlock: firstBlock,
        toBlock: lastBlock
      }).get((error, result) => {
        if (error) throw new Error(errorConstants.ERROR_FETCHING_EVENTS(error))

        if (eventName === result.event) return result
      })
    )

  /**
   * Add contract instance to poll for events.
   * @param {object} contractInstance - truffle-contract instance.
   */
  addContractInstance = contractInstance => {
    this.contractInstances.push(contractInstance)
    this.contractEventHandlerMap[contractInstance.address] = {}
  }

  /**
   * Remove contract instance. Will also remove all handlers.
   * @param {string} contractAddress - Address of contract.
   */
  removeContractInstance = (
    contractAddress = isRequired('contractAddress')
  ) => {
    // remove instance from this.contractInstances
    const removedInstance = _.remove(
      this.contractInstances,
      instance => instance.address === contractAddress
    )
    // if we didn't remove anything throw error
    if (removedInstance.length === 0)
      throw new Error(errorConstants.MISSING_CONTRACT_INSTANCE(contractAddress))
    // stop watching on these instances
    removedInstance.forEach(instance =>
      this.stopWatchingForEvents(instance.address)
    )
    // remove handlers for contract instance
    delete this.contractEventHandlerMap[contractAddress]
  }

  /**
   * Add event handler that will be called when event is broadcasted.
   * @param {string} contractAddress - Address of contract.
   * @param {string} eventName - Name of event.
   * @param {function} handler - Function to be called when event is consumed.
   */
  addEventHandler = (
    contractAddress = isRequired('contractAddress'),
    eventName = isRequired('eventName'),
    handler = isRequired('handler')
  ) => {
    if (!this.contractEventHandlerMap[contractAddress][eventName])
      this.contractEventHandlerMap[contractAddress][eventName] = []
    this.contractEventHandlerMap[contractAddress][eventName].push(handler)
  }

  /**
   * Watch for events on each contract instance. Call registered handlers on logs
   * @param {number} fromBlock - A block number can be passed to catch up on missed logs
   */
  watchForEvents = (fromBlock = 'latest') => {
    this.contractInstances.forEach(instance => {
      const newWatcherInstance = instance.allEvents({
        fromBlock: fromBlock,
        lastBlock: 'latest'
      })

      // NOTE: should we allow more than one listener per contract instance?
      if (this.watcherInstances[instance.address])
        this.watcherInstances[instance.address].stopWatching()

      this.watcherInstances[instance.address] = newWatcherInstance

      newWatcherInstance.watch((error, result) => {
        if (!error) {
          const handlers = this.contractEventHandlerMap[instance.address][
            result.event
          ]
          if (handlers) {
            handlers.forEach(handler => {
              this._queueEvent(handler, result)
            })
          }
        }
      })
    })
  }

  /**
   * Stop listening on contract. If no contractAddress supplied it stops all listeners
   * @param {string} contractAddress - Address of the contract to stop watching
   */
  stopWatchingForEvents = contractAddress => {
    if (contractAddress) this.watcherInstances[contractAddress].stopWatching()
    else
      this.contractInstances.forEach(instance => {
        this.watcherInstances[instance.address].stopWatching()
      })
  }

  /**
   * Queues an event.
   * @param {function} handler - The handler.
   * @param {object} event - The event.
   */
  _queueEvent = async (handler, event) => {
    const eventTask = async () => {
      await handler(event)
    }

    this.eventHandlerQueue.push(eventTask)
  }
}

export default EventListener
