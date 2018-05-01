import isRequired from './utils/isRequired'
import Web3Wrapper from './utils/Web3Wrapper'
import StoreProviderWrapper from './utils/StoreProviderWrapper'
import * as contracts from './contracts'
import * as resources from './resources'
import EventListener from './utils/EventListener'

/**
 * The Kleros Api provides access to the full suite of functionality. It will initialize
 * contract instances for you when possible and creates an object that you can use to
 * call all of the other api modules. If you are only going to be interacting with
 * specific apis, or you don't want certain functionality such as the off chain store,
 * you might find it easier to initialze a specific instance of the api you want.
 */
class Kleros {
  web3Wrapper = {}

  storeWrapper = {}

  eventListener = null

  /**
   * Instantiates a new Kelros instance that provides the public interface
   * to Kleros contracts and library. All params are required. To use an individual
   * portion of the API import a class and initialize it yourself.
   * @param {string} ethereumProvider - The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @param {string} storeUri - The storage provider uri used to
   *                      get metadata from the cloud for the UI. e.g. Kleros-Store,
   *                      IPFS, Swarm etc.
   * @param {string} arbitratorAddress - Address of the arbitrator contract we should
   *                 use when initializing KlerosPOC
   * @param {string} arbitrableContractAddress - Address of the arbitrator contract we should
   *                 use when initializing KlerosPOC
   * @param {string} authToken - Signed token cooresponding to the user profile address.
   */
  constructor(
    ethereumProvider = isRequired('ethereumProvider'),
    storeUri = isRequired('storeUri'),
    arbitratorAddress,
    arbitrableContractAddress,
    authToken
  ) {
    // NOTE we default to KlerosPOC and ArbitrableTransaction
    const _klerosPOC = new contracts.implementations.arbitrator.KlerosPOC(
      ethereumProvider,
      arbitratorAddress
    )
    const _arbitrableTransaction = new contracts.implementations.arbitrable.ArbitrableTransaction(
      ethereumProvider,
      arbitrableContractAddress
    )

    // **************************** //
    // *   INITIALIZED CLASSES    * //
    // **************************** //
    // KLEROS WRAPPERS
    this.web3Wrapper = new Web3Wrapper(ethereumProvider)
    this.storeWrapper = new StoreProviderWrapper(storeUri, authToken)
    // ARBITRATOR
    this.arbitrator = new contracts.abstractions.Arbitrator(
      _klerosPOC,
      this.storeWrapper
    )
    // ARBITRABLE CONTRACTS
    this.arbitrable = new contracts.abstractions.Arbitrable(
      _arbitrableTransaction,
      this.storeWrapper
    )
    // DISPUTES
    this.disputes = new resources.Disputes(
      this.arbitrator,
      this.arbitrable,
      this.storeWrapper
    )
    // NOTIFICATIONS
    this.notifications = new resources.Notifications(
      this.arbitrator,
      this.arbitrable,
      this.storeWrapper
    )
    // AUTH
    this.auth = new resources.Auth(this.web3Wrapper, this.storeWrapper)
  }

  /**
   * Set a new arbitrable contract for Kleros instance of arbitrableContracts
   * @param {string} contractAddress - Address of arbitrable contract
   */
  setArbitrableContractAddress = contractAddress => {
    this.arbitrable.setContractInstance(contractAddress)
  }

  /**
   * Bootstraps an EventListener and adds all Kleros handlers for event logs. Use
   * this if you want to watch the chain for notifications, or are using the off chain
   * store for metadata.
   * @param {string} account Address of the user
   * @param {function} callback The function to be called once a notification
   */
  watchForEvents = async (
    account,
    callback // for notification callback
  ) => {
    // stop current event listeners
    if (this.eventListener) {
      this.eventListener.stopWatchingForEvents()
    }
    // reinitialize with current arbitrator contract instance
    this.eventListener = new EventListener([this.arbitrator])
    // add handlers for notifications
    this.notifications.registerArbitratorNotifications(
      account,
      this.eventListener,
      callback
    )
    // add handlers for event driven store updates
    this.disputes.registerStoreUpdateEventListeners(account, this.eventListener)
    // fetch last block for user
    const fromBlock = await this.storeWrapper.getLastBlock(account)
    // start event listener
    this.eventListener.watchForEvents(fromBlock)
  }

  /**
   * Stop watching for events on the Arbitrator initialized in the Kleros Instance.
   */
  stopWatchingForEvents = () => {
    this.eventListener.stopWatchingForEvents(this.arbitrator)
  }

  /**
   * Sets the store provider uri for all higher level apis in the Kleros Instance.
   * @param {string} storeUri - The URI that the store provider will use
   */
  setStoreProvider = storeUri => {
    this.storeWrapper = new StoreProviderWrapper(storeUri)

    this.disputes.setStoreProviderInstance(this.storeWrapper)
    this.arbitrable.setStoreProviderInstance(this.storeWrapper)
    this.arbitrator.setStoreProviderInstance(this.storeWrapper)
    this.notifications.setStoreProviderInstance(this.storeWrapper)
    this.auth.setStoreProviderInstance(this.storeWrapper)
  }
}

export default Kleros
