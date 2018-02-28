import PinakionPOC from 'kleros/build/contracts/PinakionPOC' // FIXME: mock
import _ from 'lodash'

import * as ethConstants from '../constants/eth'

import ContractWrapper from './ContractWrapper'

/**
 * Kleros API
 */
class PinakionWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
   * @param {object} web3Provider - web3 instance.
   * @param {string} address - of the contract (optionnal).
   */
  constructor(web3Provider, address) {
    super(web3Provider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null

    PinakionPOC.abi.filter(abi => abi.type === 'function').forEach(abi => {
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
   * @param {string} account - (default: accounts[0]).
   * @returns {object} - 'truffle-contract' Object | err The contract object or error deploy.
   */
  deploy = async (account = this._Web3Wrapper.getAccount(0)) => {
    const contractDeployed = await this._deployAsync(
      account,
      ethConstants.TRANSACTION.value,
      PinakionPOC
    )

    this.address = contractDeployed.address

    return contractDeployed
  }

  /**
   * Load an existing contract.
   * @param {string} address - Contract address.
   * @returns {object} - Contract Instance | Error.
   */
  load = async address => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(
        PinakionPOC,
        address
      )
      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * change the kleros contract in the PNK contract.
   * @param {string} contractAddress - Address of PNK contract.
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {string} - Tx hash.
   */
  setKleros = async (
    contractAddress,
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    try {
      let contractInstance = await this.load(contractAddress)
      const txHashObj = await contractInstance.setKleros(klerosAddress, {
        from: account,
        gas: ethConstants.TRANSACTION.GAS
      })

      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * transfer ownership of the PNK contract to the kleros POC contract.
   * @param {string} contractAddress - Address of PNK contract.
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {string} - Tx hash.
   */
  transferOwnership = async (
    contractAddress,
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    try {
      const contractInstance = await this.load(contractAddress)
      const txHashObj = await contractInstance.transferOwnership(
        klerosAddress,
        {
          from: account,
          gas: ethConstants.TRANSACTION.GAS
        }
      )

      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Get data from PNK contract.
   * @param {string} contractAddress - Address of PNK contract.
   * @param {string} account - Address for user.
   * @returns {object} - Data from PNK contract.
   */
  getData = async contractAddress => {
    const contractInstance = await this.load(contractAddress)

    const [owner, kleros] = await Promise.all([
      contractInstance.owner.call(),
      contractInstance.kleros.call()
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      owner,
      kleros
    }
  }
}

export default PinakionWrapper
