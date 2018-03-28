import RNG from 'kleros-interaction/build/contracts/BlockHashRNG'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import ContractWrapper from '../../ContractWrapper'

/**
 * Kleros API
 */
class BlockHashRNGWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
   * @param {object} web3Provider - instance
   * @param {string} address - of the contract (optionnal)
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
   * @param {string} account - (default: accounts[0])
   * @param {number} value - (default: 10000)
   * @returns {object} - truffle-contract Object | err The contract object or error deploy
   */
  deploy = async (account = this._Web3Wrapper.getAccount(0)) => {
    const contractDeployed = await this._deployAsync(
      account,
      ethConstants.TRANSACTION.VALUE,
      RNG
    )

    this.address = contractDeployed.address

    return contractDeployed
  }

  /**
   * Load an existing contract
   * @param {string} address - contract address
   * @returns {object} - The contract instance.
   */
  load = async address => {
    this.contractInstance = await this._instantiateContractIfExistsAsync(
      RNG,
      address
    )
    this.address = address
    return this.contractInstance
  }
}

export default BlockHashRNGWrapper
