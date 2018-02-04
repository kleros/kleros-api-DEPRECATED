import Web3Wrapper from '../util/Web3Wrapper'
import StoreProviderWrapper from '../util/StoreProviderWrapper'
import KlerosWrapper from './contractWrappers/KlerosWrapper'
import ArbitrableTransactionWrapper from './contractWrappers/ArbitrableTransactionWrapper'
import PinakionWrapper from './contractWrappers/PinakionWrapper'
import BlockHashRNGWrapper from './contractWrappers/BlockHashRNGWrapper'
import DisputesApi from './abstractWrappers/Disputes'
import ArbitratorApi from './abstractWrappers/Arbitrator'
import ArbitrableContractApi from './abstractWrappers/ArbitrableContract'
import { LOCALHOST_STORE_PROVIDER, LOCALHOST_ETH_PROVIDER } from '../constants'

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
   * @return {object} A n instance of the Kleros.js class.
   */
  constructor(
    ethereumProvider = LOCALHOST_ETH_PROVIDER,
    storeProvider = LOCALHOST_STORE_PROVIDER
  ) {
    console.log(storeProvider)
    this._web3Wrapper = new Web3Wrapper(ethereumProvider)
    this._storeWrapper = new StoreProviderWrapper(storeProvider)
    // low level contract api
    this.klerosPOC = new KlerosWrapper(this._web3Wrapper)
    this.arbitrableTransaction = new ArbitrableTransactionWrapper(this._web3Wrapper)
    this.pinakion = new PinakionWrapper(this._web3Wrapper)
    this.blockHashRng = new BlockHashRNGWrapper(this._web3Wrapper)
    // abstracted api
    // FIXME allow user to pass which court and arbitrable contract they are using
    this.disputes = new DisputesApi(this._storeWrapper, this.klerosPOC, this.arbitrableTransaction)
    this.arbitrator = new ArbitratorApi(this._storeWrapper, this.klerosPOC)
    this.arbitrableContract = new ArbitrableContractApi(this._storeWrapper, this.arbitrableTransaction)
  }

  getWeb3Wrapper = () => this._web3Wrapper
  getStoreWrapper = () => this._storeWrapper
}

export default Kleros
