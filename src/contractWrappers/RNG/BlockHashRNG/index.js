import RNG from 'kleros-interaction/build/contracts/BlockHashRNG'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import ContractWrapper from '../../ContractWrapper'
import deployContractAsync from '../../../utils/deployContractAsync'

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
   * @param {string} account - users account
   * @param {object} web3Provider - web3 provider object
   * @returns {object} - truffle-contract Object | err The contract object or error deploy
   */
  static deploy = async (account, web3Provider) => {
    const contractDeployed = await deployContractAsync(
      account,
      ethConstants.TRANSACTION.VALUE,
      RNG,
      web3Provider
    )

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
