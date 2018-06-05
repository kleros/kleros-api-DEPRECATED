import _ from 'lodash'

import PromiseQueue from '../utils/PromiseQueue'
import isRequired from '../utils/isRequired'
import * as errorConstants from '../constants/error'

/**
 * EventListener is used to watch events on the blockchain for a set of contracts.
 * Handlers for specific events can be added. When an event log is found EventListener
 * will fire all handlers registered for the contract.
 */
class EventListener {
  /**
   * Listen for events in contract and handles callbacks with registered event handlers.
   * @param {object[]} _contractImplementations - Contract Implementation instances to fetch event logs for.
   */
  constructor(_contractImplementations = []) {
    this.contractInstances = []
    // map address -> { event: [handlers], ... }
    this.contractEventHandlerMap = {}
    // map address -> watcher instance
    this.watcherInstances = {}
    // event handler queue
    this.eventHandlerQueue = new PromiseQueue()
    // initialize class variables for new contract instances
    _contractImplementations.forEach(instance => {
      this.addContractImplementation(instance)
    })
  }

  /**
   * Fetch all logs from contractInstance in a block range.
   * @param {object} contractImplementationInstance - Contract Implementation instance.
   * @param {number} firstBlock - Lower bound of search range.
   * @param {number} lastBlock - Upper bound of search range.
   * @returns {Promise} All events in block range.
   */
  static getAllEventLogs = async (
    contractImplementationInstance = isRequired(
      'contractImplementationInstance'
    ),
    firstBlock = 0,
    lastBlock = 'latest'
  ) =>
    Promise.all(
      (await contractImplementationInstance.loadContract())
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
   * Fetch logs from contractInstance for a specific event in a block range.
   * @param {object} contractImplementationInstance - contract Implementation instance.
   * @param {string} eventName - Name of the event.
   * @param {number} firstBlock - Lower bound of search range.
   * @param {number} lastBlock - Upper bound of search range.
   * @param {object} filters - Extra filters
   * @returns {Promise} All events in block range.
   */
  static getNextEventLogs = async (
    contractImplementationInstance = isRequired(
      'contractImplementationInstance'
    ),
    eventName = isRequired('eventName'),
    firstBlock = 0,
    lastBlock = 'latest',
    filters = {}
  ) => {
    await contractImplementationInstance.loadContract()

    return new Promise((resolve, reject) => {
      contractImplementationInstance.contractInstance[eventName](filters, {
        fromBlock: firstBlock,
        toBlock: lastBlock
      }).get((error, result) => {
        if (error) reject(errorConstants.ERROR_FETCHING_EVENTS(error))

        resolve(result)
      })
    })
  }

  /**
   * Add a contract instance to watch for new event logs.
   * @param {object} contractImplementationInstance - Contract Implementation instance
   */
  addContractImplementation = contractImplementationInstance => {
    this.contractInstances.push(contractImplementationInstance)
    this.contractEventHandlerMap[
      contractImplementationInstance.getContractAddress()
    ] = {}
  }

  /**
   * Remove contract instance being watched. Will also remove all handlers.
   * @param {string} contractImplementationInstance - contract implementation instance
   */
  removeContractInstance = (
    contractImplementationInstance = isRequired(
      'contractImplementationInstance'
    )
  ) => {
    const contractAddress = contractImplementationInstance.getContractAddress()
    // remove instance from this.contractInstances
    const removedInstance = _.remove(
      this.contractInstances,
      instance => instance.getContractAddress() === contractAddress
    )
    // if we didn't remove anything throw error
    if (removedInstance.length === 0)
      throw new Error(errorConstants.MISSING_CONTRACT_INSTANCE(contractAddress))
    // stop watching on these instances
    removedInstance.forEach(instance => this.stopWatchingForEvents(instance))

    // remove handlers for contract instance
    delete this.contractEventHandlerMap[contractAddress]
  }

  /**
   * Add event handler that will be called when event log is found.
   * @param {string} contractImplementationInstance - Contract implementation instance
   * @param {string} eventName - Name of event.
   * @param {function} handler - Function to be called when event is consumed.
   */
  addEventHandler = (
    contractImplementationInstance = isRequired('contractAddress'),
    eventName = isRequired('eventName'),
    handler = isRequired('handler')
  ) => {
    const contractAddress = contractImplementationInstance.getContractAddress()
    if (!this.contractEventHandlerMap[contractAddress][eventName])
      this.contractEventHandlerMap[contractAddress][eventName] = []
    this.contractEventHandlerMap[contractAddress][eventName].push(handler)
  }

  /**
   * Watch for events on all contract instances. Call registered handlers when logs are found.
   * @param {number} fromBlock - A block number can be passed to catch up on missed logs
   * @returns {Promise} - Promise resolves when all watchers have been started
   */
  watchForEvents = async (fromBlock = 'latest') =>
    Promise.all(
      this.contractInstances.map(async contractImplementation => {
        const instance = await contractImplementation.loadContract()
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
    )

  /**
   * Stop listening on contract. If no contractAddress supplied it stops all listeners.
   * @param {string} contractImplementationInstance - Address of the contract to stop watching
   */
  stopWatchingForEvents = contractImplementationInstance => {
    if (contractImplementationInstance)
      this.watcherInstances[
        contractImplementationInstance.getContractAddress()
      ].stopWatching()
    else
      this.contractInstances.forEach(instance => {
        this.watcherInstances[instance.getContractAddress()].stopWatching()
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
