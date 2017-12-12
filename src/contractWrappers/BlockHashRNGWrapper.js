import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import RNG from 'kleros-interaction/build/contracts/BlockHashRNG'
import config from '../../config'

/**
 * Kleros API
 */
class BlockHashRNGWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
   * @param {object} web3 instance
   * @param {string} address of the contract (optionnal)
   */
  constructor(web3Provider, address) {
    super(web3Provider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Kleros deploy.
   * @param {string} account (default: accounts[0])
   * @param {number} value (default: 10000)
   * @return {object} truffle-contract Object | err The contract object or error deploy
   */
  deploy = async (
      account = this._Web3Wrapper.getAccount(0),
    ) => {
    const contractDeployed = await this._deployAsync(
      account,
      config.value,
      RNG
    )

    this.address = contractDeployed.address

    return contractDeployed
  }

  /**
   * Load an existing contract
   * @param {string} address contract address
   * @return {object} Conract Instance | Error
   */
  load = async (
    address
  ) => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(RNG, address)
      this.contractInstance = contractInstance
      this.address = address
      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }
}

export default BlockHashRNGWrapper
