import Web3Wrapper from '../util/Web3Wrapper'
import StoreProviderWrapper from '../util/StoreProviderWrapper'
import KlerosWrapper from '../contract_wrapper/KlerosWrapper'
import ArbitrableTransactionWrapper from '../contract_wrapper/ArbitrableTransactionWrapper'
import PinakionWrapper from '../contract_wrapper/PinakionWrapper'
import BlockHashRNGWrapper from '../contract_wrapper/BlockHashRNGWrapper'
import DisputesApi from './abstractWrappers/disputes'
import ArbitratorApi from './abstractWrappers/arbitrator'
import ArbitrableContractApi from './abstractWrappers/arbitrableContract'
import { LOCALHOST_STORE_PROVIDER, LOCALHOST_ETH_PROVIDER } from '../constants'

class Kleros {
  /**
   * An private instance of the Web3 for interacting with the
   * smart contract.
   */
  _web3Wrapper = {}

  /**
   * An private instance of the Web3 for interacting with the
   * smart contract.
   */
  _storeWrapper = {}

  /**
   * Instantiates a new Kelros instance that provides the public interface
   * to the 0x.js library.
   * @param ethereumProvider The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @param storeProvider The storage provider instance used by the contract to
   *                      get data from the cloud. e.g. Kleros-Store,
   *                      IPFS, Swarm etc.
   * @return An instance of the Kleros.js class.
   */
  constructor(
    ethereumProvider = LOCALHOST_ETH_PROVIDER,
    storeProvider = LOCALHOST_STORE_PROVIDER
  ) {
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
