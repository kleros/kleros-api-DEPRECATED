import RNG from 'kleros-interaction/build/contracts/BlockHashRNG'
import _ from 'lodash'

import * as ethConstants from '../constants/eth'

import ContractWrapper from './ContractWrapper'

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

    RNG.abi.filter(abi => abi.type === 'function').forEach(abi => {
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
   * @returns {object} - Conract Instance | Error
   */
  load = async address => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(
        RNG,
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

export default BlockHashRNGWrapper
