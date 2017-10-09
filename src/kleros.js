import Web3Wrapper from '../util/Web3Wrapper'
import CentralizedArbitratorWrapper from '../contract_wrapper/CentralizedArbitratorWrapper'
import KlerosWrapper from '../contract_wrapper/KlerosWrapper'

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
   * Instantiates a new Kelros instance that provides the public interface
   * to the 0x.js library.
   * @param provider The Web3.js Provider instance you would like the
   *                 Kleros.js library to use for interacting with the
   *                 Ethereum network.
   * @return An instance of the Kleros.js class.
   */
  constructor(provider) {
    this._web3Wrapper = new Web3Wrapper(provider)
    this.court = new KlerosWrapper(this._web3Wrapper)
    this.centralCourt = new CentralizedArbitratorWrapper(this._web3Wrapper) // FIXME mock in waiting the decentralized court contract
  }

  getWeb3Wrapper = () => this._web3Wrapper
}

export default Kleros
