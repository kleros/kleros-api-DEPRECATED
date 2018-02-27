import contract from 'truffle-contract'
import _ from 'lodash'

import * as ethConstants from '../constants/eth'

/**
 * Contract wrapper
 */
class ContractWrapper {
  /**
   * Constructor contract wrapper
   * @param {object} web3Wrapper instance
   */
  constructor(web3Wrapper) {
    this._Web3Wrapper = web3Wrapper
  }

  /**
   * Instantiate contract.
   * @private
   * @param {object} artifact - The contract artifact.
   * @param {string} address - The hex encoded contract Ethereum address
   * @returns {object} - truffle-contract object | Error
   */
  _instantiateContractIfExistsAsync = async (artifact, address) => {
    const c = await contract(artifact)

    const providerObj = await this._Web3Wrapper.getProvider()

    await c.setProvider(providerObj)

    try {
      const contractInstance = _.isUndefined(address)
        ? await c.deployed()
        : await c.at(address)

      return contractInstance
    } catch (err) {
      const errMsg = `${err}`

      if (_.includes(errMsg, 'not been deployed to detected network')) {
        throw new Error('ContractDoesNotExist')
      } else {
        throw new Error('UnhandledError')
      }
    }
  }

  /**
   * Deploy contract.
   * @param {string} account - The account to deploy it under.
   * @param {number} value - The value to send.
   * @param {object} artifact - JSON artifact of the contract.
   * @param {...any} args - Extra arguments.
   * @returns {object} - truffle-contract Object | err The contract object or an error
   */
  _deployAsync = async (account, value, artifact, ...args) => {
    if (_.isEmpty(account)) {
      account = this._Web3Wrapper.getAccount(0)
    }

    const MyContract = contract({
      abi: artifact.abi,
      unlinked_binary: artifact.bytecode
        ? artifact.bytecode
        : artifact.unlinked_binary
    })

    const provider = await this._Web3Wrapper.getProvider()
    MyContract.setProvider(provider)
    try {
      let contractDeployed = await MyContract.new(...args, {
        from: account,
        value: value,
        gas: ethConstants.TRANSACTION.GAS
      })
      return contractDeployed
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Metamask safe, syncronous method to fetch current block number
   * @returns {number} current block number
   */
  _getCurrentBlockNumber = async () =>
    new Promise((resolve, reject) => {
      this._Web3Wrapper._web3.eth.getBlockNumber((error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
}

export default ContractWrapper
