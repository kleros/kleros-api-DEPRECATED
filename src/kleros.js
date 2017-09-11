// import contract from 'truffle-contract';
// import * as TokenArtifact from '../artifact/Token.json';
import Web3Wrapper from '../util/Web3Wrapper'
// import TokenContractWrapper from '../contract_wrapper/token_wrapper';

class Kleros {
  /**
   * An private instance of the Web3 for interacting with the
   * smart contract.
   */
  _web3Wrapper = {}

  /**
   * Instantiates a new Kelros instance that provides the public interface to the 0x.js library.
   * @param   provider    The Web3.js Provider instance you would like the Kleros.js library to use for interacting with
   *                      the Ethereum network.
   * @return  An instance of the Kleros.js class.
   */
  constructor(provider) {
    this._web3Wrapper = new Web3Wrapper(provider)
  }

  getWeb3Wrapper = () => this._web3Wrapper
}

export default Kleros
