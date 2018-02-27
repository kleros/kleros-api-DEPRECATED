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
import * as ethConstants from './constants/eth'

class Kleros {
  _web3Wrapper = {}

  _storeWrapper = {}

  /**
   * Instantiates a new Kelros instance that provides the public interface
   * to Kleros contracts and library.
   * @param {string} ethereumProvider The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @param {string} storeProvider The storage provider instance used by the contract to
   *                      get data from the cloud. e.g. Kleros-Store,
   *                      IPFS, Swarm etc.
   */
  constructor(
    ethereumProvider = ethConstants.LOCALHOST_ETH_PROVIDER,
    storeProvider = ethConstants.LOCALHOST_STORE_PROVIDER
  ) {
    this._web3Wrapper = new Web3Wrapper(ethereumProvider)
    this._storeWrapper = new StoreProviderWrapper(storeProvider)
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
      this._storeWrapper,
      this.klerosPOC,
      this.arbitrableTransaction
    )
    // abstracted api
    this.disputes = new DisputesApi(
      this._storeWrapper,
      this.klerosPOC,
      this.arbitrableTransaction,
      this.eventListener
    )
    this.arbitrator = new ArbitratorApi(
      this._storeWrapper,
      this.klerosPOC,
      this.eventListener
    )
    this.arbitrableContract = new ArbitrableContractApi(
      this._storeWrapper,
      this.arbitrableTransaction,
      this.eventListener
    )
    this.notifications = new Notifications(
      this._storeWrapper,
      this.klerosPOC,
      this.arbitrableTransaction,
      this.eventListener
    )
  }

  getWeb3Wrapper = () => this._web3Wrapper
  getStoreWrapper = () => this._storeWrapper

  watchForEvents = async (
    arbitratorAddress,
    account,
    callback // for notification callback
  ) => {
    await this._storeWrapper.setUpUserProfile(account)
    this.eventListener.clearArbitratorHandlers()
    await this.disputes.addDisputeEventListener(arbitratorAddress, account)
    await this.disputes.addTokenShiftToJurorProfileEventListener(
      arbitratorAddress,
      account,
      callback
    )
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
}

export default Kleros
