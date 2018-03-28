import Web3Wrapper from './utils/Web3Wrapper'
import StoreProviderWrapper from './utils/StoreProviderWrapper'
import contracts from './contractWrappers'
import resources from './resourceWrappers'
import Arbitrator from './abstractWrappers/arbitrator'
import ArbitrableContracts from './abstractWrappers/arbitrableContracts'

class Kleros {
  _web3Wrapper = {}

  _storeWrapper = {}

  /**
   * Instantiates a new Kelros instance that provides the public interface
   * to Kleros contracts and library.
   * @param {string} arbitratorAddress - Address of the arbitrator contract we should
   *                 use when initializing KlerosPOC
   * @param {string} ethereumProvider - The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @param {string} storeProvider - <optional> The storage provider instance used by the contract to
   *                      get data from the cloud. e.g. Kleros-Store,
   *                      IPFS, Swarm etc.
   */
  constructor(arbitratorAddress, ethereumProvider, storeProvider) {
    this._web3Wrapper = new Web3Wrapper(ethereumProvider)
    // GIVE ACCESS TO ALL CONTRACT WRAPPERS
    this.contracts = contracts

    // **************************** //
    // *          Private         * //
    // **************************** //
    // NOTE we default to KlerosPOC and ArbitrableTransaction
    this._klerosPOC = new this.contracts.arbitrator.KlerosPOC(
      this._web3Wrapper,
      arbitratorAddress
    )
    this._arbitrableTransaction = new this.contracts.arbitrableTransaction.ArbitrableTransaction(
      this._web3Wrapper
    )

    // **************************** //
    // *          Public          * //
    // **************************** //
    // ABSTRACT ENDPOINTS
    this.arbitrator = new Arbitrator(this._klerosPOC)
    this.arbitrableContracts = new ArbitrableContracts(
      this._arbitrableTransaction
    )

    // EVENT LISTENER
    this.eventListener = new resources.EventListeners(
      this.arbitrator,
      this.arbitrableContract
    )
    // DISPUTES
    this.disputes = new resources.Disputes(
      this.arbitrator,
      this.arbitrableContract,
      this.eventListener
    )
    // NOTIFICATIONS
    this.notifications = new resources.Notifications(
      this.arbitrator,
      this.arbitrableContract,
      this.eventListener
    )

    // set store provider in wrappers
    if (storeProvider) this.setStoreProvider(storeProvider)
  }

  /**
   * Entry point to set up all event listerners and to start the events watcher
   * @param {string} arbitratorAddress Address of the arbitrator contract
   * @param {string} account Address of the user
   * @param {function} callback The function to be called once a notification
   */
  watchForEvents = async (
    arbitratorAddress,
    account,
    callback // for notification callback
  ) => {
    this.eventListener.clearArbitratorHandlers()
    await this.disputes.addNewDisputeEventListener(arbitratorAddress, account)
    await this.disputes.addTokenShiftToJurorProfileEventListener(
      arbitratorAddress,
      account,
      callback
    )
    await this.disputes.addDisputeDeadlineHandler(arbitratorAddress, account)
    await this.disputes.addDisputeRulingHandler(
      arbitratorAddress,
      account,
      callback
    )
    await this.notifications.registerNotificationListeners(
      arbitratorAddress,
      account,
      callback
    )
    await this.eventListener.watchForArbitratorEvents(
      arbitratorAddress,
      account
    )
  }

  /**
   * set store provider in all abstract wrappers
   * @param {string} storeUri - The URI that the store provider will use
   */
  setStoreProvider = storeUri => {
    this._storeWrapper = new StoreProviderWrapper(storeUri)

    this.eventListener.setStoreProvider(this._storeWrapper)
    this.disputes.setStoreProvider(this._storeWrapper)
    this.arbitrableContract.setStoreProvider(this._storeWrapper)
    this.arbitrator.setStoreProvider(this._storeWrapper)
    this.notifications.setStoreProvider(this._storeWrapper)
  }

  getWeb3Wrapper = () => this._web3Wrapper
  getStoreWrapper = () => this._storeWrapper
}

export default Kleros
