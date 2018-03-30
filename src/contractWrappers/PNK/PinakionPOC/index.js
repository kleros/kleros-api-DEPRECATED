import PinakionPOC from 'kleros/build/contracts/PinakionPOC' // FIXME: mock
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as errorConstants from '../../../constants/error'
import ContractWrapper from '../../ContractWrapper'
import deployContractAsync from '../../../utils/deployContractAsync'

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
  }

  /**
   * Kleros deploy.
   * @param {string} account - account of user
   * @param {object} web3Provider - web3 provider object
   * @returns {object} - 'truffle-contract' Object | err The contract object or error deploy.
   */
  static deploy = async (account, web3Provider) => {
    const contractDeployed = await deployContractAsync(
      account,
      ethConstants.TRANSACTION.VALUE,
      PinakionPOC,
      web3Provider
    )

    return contractDeployed
  }

  /**
   * Load an existing contract.
   * @param {string} address - Contract address.
   * @returns {object} - Contract Instance | Error.
   */
  load = async address => {
    this.contractInstance = await this._instantiateContractIfExistsAsync(
      PinakionPOC,
      address
    )
    this.address = address
    return this.contractInstance
  }

  /**
   * change the kleros contract in the PNK contract.
   * @param {string} contractAddress - Address of PNK contract.
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {object} - The result transaction object.
   */
  setKleros = async (
    contractAddress,
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.load(contractAddress)

    try {
      return this.contractInstance.setKleros(klerosAddress, {
        from: account,
        gas: ethConstants.TRANSACTION.GAS
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_SET_KLEROS)
    }
  }

  /**
   * transfer ownership of the PNK contract to the kleros POC contract.
   * @param {string} contractAddress - Address of PNK contract.
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {object} - The result transaction object.
   */
  transferOwnership = async (
    contractAddress,
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.load(contractAddress)

    try {
      return this.contractInstance.transferOwnership(klerosAddress, {
        from: account,
        gas: ethConstants.TRANSACTION.GAS
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_TRANSFER_OWNERSHIP)
    }
  }

  /**
   * Get data from PNK contract.
   * @param {string} contractAddress - Address of PNK contract.
   * @param {string} account - Address for user.
   * @returns {object} - Data from PNK contract.
   */
  getData = async contractAddress => {
    await this.load(contractAddress)

    const [owner, kleros] = await Promise.all([
      this.contractInstance.owner(),
      this.contractInstance.kleros()
    ])

    return {
      owner,
      kleros
    }
  }
}

export default PinakionWrapper
