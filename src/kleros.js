import Web3Wrapper from '../util/Web3Wrapper'
import KlerosWrapper from '../contract_wrapper/KlerosWrapper'
import CentralizedArbitratorWrapper from '../contract_wrapper/CentralizedArbitratorWrapper'
import ArbitrableTransactionWrapper from '../contract_wrapper/ArbitrableTransactionWrapper'

class Kleros {
  /**
   * An private instance of the Web3 for interacting with the
   * smart contract.
   */
  _web3Wrapper = {}

  /**
   * An instance court
   */
  court = {}

  /**
   * An instance centralCourt
   */
  centralCourt = {}

  /**
   * Default contract TwoPartyArbitrable
   */
  twoPartyArbitrable = {}

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
    ethereumProvider,
    storeProvider=null
  ) {
    this._web3Wrapper = new Web3Wrapper(provider)
    // TODO storeProviderWrapper
    this.court = new KlerosWrapper(this._web3Wrapper, storeProvider)
    this.centralCourt = new CentralizedArbitratorWrapper(this._web3Wrapper, storeProvider)
    this.arbitrableTransaction = new ArbitrableTransactionWrapper(this._web3Wrapper, storeProvider)
  }

  getWeb3Wrapper = () => this._web3Wrapper
}

export default Kleros
