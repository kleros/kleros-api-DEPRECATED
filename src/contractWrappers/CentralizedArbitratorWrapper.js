import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import ArbitrableTransactionWrapper from './ArbitrableTransactionWrapper'
import centralizedArbitrator from 'kleros-interaction/build/contracts/CentralizedArbitrator'
import config from '../../config'

/**
 * CentralizedArbitrator API
 */
class CentralizedArbitratorWrapper extends ContractWrapper {
  /**
   * Constructor CentralizedArbitrator.
   * @param {object} web3 instance
   * @param {string} address of the contract (optionnal)
   */
  constructor(web3Provider, address) {
    super(web3Provider, storeProvider)

    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Deploy CentralizedArbitrator.
   * @param {string} account Ethereum account
   * @param {number} value gas price value
   * @param {number} priceArbitration Set the initial arbitration price. (default: 10000 wei)
   * @return {object} truffle-contract Object | err The contract object deployed or an error
   */
  deploy = async (
      account,
      value = config.VALUE,
      priceArbitration = 10000
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      centralizedArbitrator,
      priceArbitration
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
      const contractInstance = await this._instantiateContractIfExistsAsync(centralizedArbitrator, address)
      this.contractInstance = contractInstance
      this.address = address
      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }
}

export default CentralizedArbitratorWrapper
