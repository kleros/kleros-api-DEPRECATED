import centralizedArbitrator from 'kleros-interaction/build/contracts/CentralizedArbitrator'
import _ from 'lodash'

import * as ethConstants from '../constants/eth'

import ContractWrapper from './ContractWrapper'

/**
 * CentralizedArbitrator API
 */
class CentralizedArbitratorWrapper extends ContractWrapper {
  /**
   * Constructor CentralizedArbitrator.
   * @param {object} web3Provider - instance
   * @param {string} address - of the contract (optionnal)
   */
  constructor(web3Provider, address) {
    super(web3Provider)

    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null

    centralizedArbitrator.abi.filter(abi => abi.type === 'function').forEach(abi => {
      this[abi.name] = async address => {
        const instance = await this.load(address)

        const result = await instance[abi.name].call()

        if(abi.outputs.length === 1) {
          const output = abi.outputs[0]
          if(output.type.includes('int')) {
            result = result.toNumber()
          }
        }

        return result
      }
    })
  }

  /**
   * Deploy CentralizedArbitrator.
   * @param {string} account - Ethereum account
   * @param {number} value - gas price value
   * @param {number} priceArbitration - Set the initial arbitration price. (default: 10000 wei)
   * @returns {object} - truffle-contract Object | err The contract object deployed or an error
   */
  deploy = async (
    account,
    value = ethConstants.TRANSACTION.VALUE,
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
   * @param {string} address - contract address
   * @returns {object} - Conract Instance | Error
   */
  load = async address => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(
        centralizedArbitrator,
        address
      )
      this.contractInstance = contractInstance
      this.address = address
      return contractInstance
    } catch (err) {
      throw new Error(err)
    }
  }
}

export default CentralizedArbitratorWrapper
