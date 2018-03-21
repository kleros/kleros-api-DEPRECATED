import contract from 'truffle-contract'
import _ from 'lodash'

import * as ethConstants from '../constants/eth'
import * as errorConstants from '../constants/error'

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
   * @returns {object} - The contract instance.
   */
  _instantiateContractIfExistsAsync = async (artifact, address) => {
    try {
      const c = await contract(artifact)
      await c.setProvider(await this._Web3Wrapper.getProvider())
      const contractInstance = _.isUndefined(address)
        ? await c.deployed()
        : await c.at(address)

      // Estimate gas before sending transactions
      for (const funcABI of contractInstance.abi) {
        // Check for non-constant functions
        if (funcABI.type === 'function' && funcABI.constant === false) {
          const func = contractInstance[funcABI.name]

          // eslint-disable-next-line no-loop-func
          contractInstance[funcABI.name] = async (...args) => {
            await func.estimateGas(...args) // Estimate gas (also checks for possible failures)
            return func(...args) // Call original function
          }

          // Keep reference to the original function for special cases
          contractInstance[funcABI.name].original = func

          // Forward other accessors to the original function
          Object.setPrototypeOf(contractInstance[funcABI.name], func)
        }
      }

      return contractInstance
    } catch (err) {
      console.error(err)

      if (_.includes(err.message, 'not been deployed to detected network'))
        throw new Error(errorConstants.CONTRACT_NOT_DEPLOYED)

      throw new Error(errorConstants.UNABLE_TO_LOAD_CONTRACT)
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
    if (_.isEmpty(account)) account = this._Web3Wrapper.getAccount(0)

    try {
      const MyContract = contract({
        abi: artifact.abi,
        unlinked_binary: artifact.bytecode
          ? artifact.bytecode
          : artifact.unlinked_binary
      })
      MyContract.setProvider(await this._Web3Wrapper.getProvider())

      return MyContract.new(...args, {
        from: account,
        value: value,
        gas: ethConstants.TRANSACTION.GAS
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_DEPLOY_CONTRACT)
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
