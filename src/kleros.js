import Web3Wrapper from './utils/Web3Wrapper'
import StoreProviderWrapper from './utils/StoreProviderWrapper'
import KlerosWrapper from './contractWrappers/KlerosWrapper'
import ArbitrableTransactionWrapper from './contractWrappers/ArbitrableTransactionWrapper'
import PinakionWrapper from './contractWrappers/PinakionWrapper'
import BlockHashRNGWrapper from './contractWrappers/BlockHashRNGWrapper'
import DisputesApi from './abstractWrappers/Disputes'
import ArbitratorApi from './abstractWrappers/Arbitrator'
import ArbitrableContractApi from './abstractWrappers/ArbitrableContract'
import EventListeners from './abstractWrappers/EventListeners'
import Notifications from './abstractWrappers/Notifications'

class Kleros {
  _web3Wrapper = {}

  _storeWrapper = {}

  /**
   * Instantiates a new Kelros instance that provides the public interface
   * to Kleros contracts and library.
   * @param {string} ethereumProvider The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @param {string} storeProvider <optional> The storage provider instance used by the contract to
   *                      get data from the cloud. e.g. Kleros-Store,
   *                      IPFS, Swarm etc.
   */
  constructor(ethereumProvider, storeProvider) {
    this._web3Wrapper = new Web3Wrapper(ethereumProvider)

    // low level contract api
    this.klerosPOC = new KlerosWrapper(this._web3Wrapper)
    this.arbitrableTransaction = new ArbitrableTransactionWrapper(
      this._web3Wrapper
    )
    this.pinakion = new PinakionWrapper(this._web3Wrapper)
    this.blockHashRng = new BlockHashRNGWrapper(this._web3Wrapper)

    // FIXME allow user to pass which court and arbitrable contract they are using
    // shared event listener for abstract wrappers
    this.eventListener = new EventListeners(
      this.klerosPOC,
      this.arbitrableTransaction
    )
    // abstracted api
    this.disputes = new DisputesApi(
      this.klerosPOC,
      this.arbitrableTransaction,
      this.eventListener
    )
    this.arbitrator = new ArbitratorApi(this.klerosPOC, this.eventListener)
    this.arbitrableContract = new ArbitrableContractApi(
      this.arbitrableTransaction,
      this.eventListener
    )
    this.notifications = new Notifications(
      this.klerosPOC,
      this.arbitrableTransaction,
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
    await this._storeWrapper.setUpUserProfile(account)
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
   */
  setStoreProvider = storeProvider => {
    this._storeWrapper = new StoreProviderWrapper(storeProvider)

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
