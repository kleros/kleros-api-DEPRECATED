import ContractWrapper from '../ContractWrapper'
import * as errorConstants from '../../constants/error'

class ArbitratorContract extends ContractWrapper {
  constructor(web3Wrapper, contractAddress, artifact) {
    super(web3Wrapper)
    this.contractAddress = contractAddress
    this.artifact = artifact
    this.contractInstance = null
  }

  /**
   * Load an existing contract from the current arbitrator artifact and address
   * @returns {object} - The contract instance.
   */
  _load = async () => {
    try {
      this.contractInstance = await this._instantiateContractIfExistsAsync(
        this.artifact,
        this.contractAddress
      )

      return this.contractInstance
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_LOAD_ARBITRATOR)
    }
  }

  /**
   * Checks if contractInstace is set. If it can it will load contract instance.
   * If not throw an error.
   * @returns {object} contractInstance object
   */
  _checkContractInstanceSet = async () => {
    if (!this.contractInstance) {
      if (this.contractAddress && this.artifact) return this._load()

      throw new Error(errorConstants.ARBITRATOR_NOT_SET)
    }
  }

  /**
   * Set a new arbitrator
   * @param {string} contractAddress - The address of the contract
   * @param {object} artifact - Contract artifact to use to load contract
   * @returns {object} contractInstance object
   */
  setArbitrator = async (contractAddress, artifact) => {
    this.contractAddress = contractAddress || this.contractAddress
    this.artifact = artifact || this.artifact
    return this._load()
  }

  getContractInstance = () => this.contractInstance
}

export default ArbitratorContract
