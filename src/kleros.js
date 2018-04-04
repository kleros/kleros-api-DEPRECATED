import isRequired from './utils/isRequired'
import Web3Wrapper from './utils/Web3Wrapper'
import StoreProviderWrapper from './utils/StoreProviderWrapper'
import * as contracts from './contracts'
import * as resources from './resourceWrappers'
// import EventListener from './eventListener'

class Kleros {
  web3Wrapper = {}

  storeWrapper = {}

  /**
   * Instantiates a new Kelros instance that provides the public interface
   * to Kleros contracts and library. All params are required. To use an individual
   * portion of the API import a class and initialize it yourself.
   * @param {string} ethereumProvider - The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @param {string} storeUri - <optional> The storage provider uri used to
   *                      get metadata from the cloud for the UI. e.g. Kleros-Store,
   *                      IPFS, Swarm etc.
   * @param {string} arbitratorAddress - Address of the arbitrator contract we should
   *                 use when initializing KlerosPOC
   * @param {string} arbitrableContractAddress - Address of the arbitrator contract we should
   *                 use when initializing KlerosPOC
   */
  constructor(
    ethereumProvider = isRequired('ethereumProvider'),
    storeUri = isRequired('storeUri'),
    arbitratorAddress,
    arbitrableContractAddress
  ) {
    // NOTE we default to KlerosPOC and ArbitrableTransaction
    const _klerosPOC = new contracts.arbitrator.KlerosPOC(
      ethereumProvider,
      arbitratorAddress
    )
    const _arbitrableTransaction = new contracts.arbitrableContracts.ArbitrableTransaction(
      ethereumProvider,
      arbitrableContractAddress
    )

    // **************************** //
    // *   INITIALIZED CLASSES    * //
    // **************************** //
    // KLEROS WRAPPERS
    this.web3Wrapper = new Web3Wrapper(ethereumProvider)
    this.storeWrapper = new StoreProviderWrapper(storeUri)
    // ARBITRATOR
    this.arbitrator = new contracts.Arbitrator(_klerosPOC, this.storeWrapper)
    // ARBITRABLE CONTRACTS
    this.arbitrableContracts = new contracts.ArbitrableContracts(
      _arbitrableTransaction,
      this.storeWrapper
    )
    // EVENT LISTENER
    this.eventListener = new resources.EventListeners(
      this.arbitrator,
      this.arbitrableContracts,
      this.storeWrapper
    )
    // DISPUTES
    this.disputes = new resources.Disputes(
      this.arbitrator,
      this.arbitrableContracts,
      this.eventListener,
      this.storeWrapper
    )
    // NOTIFICATIONS
    this.notifications = new resources.Notifications(
      this.arbitrator,
      this.arbitrableContracts,
      this.eventListener,
      this.storeWrapper
    )
  }

  setArbitrableContractAddress = contractAddress =>
    this.arbitrableContracts.setContractInstance(contractAddress)

  /**
   * Entry point to set up all event listerners and to start the events watcher
   * @param {string} account Address of the user
   * @param {function} callback The function to be called once a notification
   */
  watchForEvents = async (
    account,
    callback // for notification callback
  ) => {
    this.eventListener.clearArbitratorHandlers()
    await this.disputes.addNewDisputeEventListener()
    await this.disputes.addTokenShiftToJurorProfileEventListener(
      account,
      callback
    )
    await this.disputes.addDisputeDeadlineHandler(account)
    await this.disputes.addDisputeRulingHandler(account, callback)
    await this.notifications.registerNotificationListeners(account, callback)
    await this.eventListener.watchForArbitratorEvents(account)
  }

  /**
   * set store provider in all high level wrappers
   * @param {string} storeUri - The URI that the store provider will use
   */
  setStoreProvider = storeUri => {
    this.storeWrapper = new StoreProviderWrapper(storeUri)

    this.eventListener.setStoreProvider(this.storeWrapper)
    this.disputes.setStoreProvider(this.storeWrapper)
    this.arbitrableContract.setStoreProvider(this.storeWrapper)
    this.arbitrator.setStoreProvider(this.storeWrapper)
    this.notifications.setStoreProvider(this.storeWrapper)
  }
}

export default Kleros
