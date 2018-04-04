import PinakionPOCArtifact from 'kleros/build/contracts/PinakionPOC' // FIXME: mock
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as errorConstants from '../../../constants/error'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'

/**
 * Kleros API
 */
class PinakionPOC extends ContractImplementation {
  /**
   * Constructor Kleros.
   * @param {object} web3Provider - web3 instance.
   * @param {string} contractAddress - of the contract (optionnal).
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, PinakionPOCArtifact, contractAddress)
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
      PinakionPOCArtifact,
      web3Provider
    )

    return contractDeployed
  }

  /**
   * change the kleros contract in the PNK contract.
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {object} - The result transaction object.
   */
  setKleros = async (
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

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
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {object} - The result transaction object.
   */
  transferOwnership = async (
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

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
   * @returns {object} - Data from PNK contract.
   */
  getData = async () => {
    await this.loadContract()
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

export default PinakionPOC
