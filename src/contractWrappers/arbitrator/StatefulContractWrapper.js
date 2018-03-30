import ContractWrapper from '../ContractWrapper'
import isRequired from '../../utils/isRequired'

class StatefulContract extends ContractWrapper {
  constructor(
    web3Provider,
    contractAddress = isRequired('contractAddress'),
    artifact = isRequired('artifact')
  ) {
    super(web3Provider)
    this.contractAddress = contractAddress
    this.artifact = artifact
    this.contractInstance = null
    // loading params
    // NOTE it does not load on init because catching async errors is super messy
    this._contractLoadedResolver = null
    this._contractLoadedRejecter = null
    this._loadingContractInstance = null
    this.isLoading = false
  }

  loadContract = async () => {
    if (this.isLoading) return this._loadingContractInstance
    if (this.contractInstance) return this.contractInstance

    const newLoadingPromise = this._newLoadingPromise()
    this._loadingContractInstance = newLoadingPromise
    this._load()
    return newLoadingPromise
  }

  /**
   * Load an existing contract from the current artifact and address
   */
  _load = async () => {
    this.isLoading = true
    try {
      this.contractInstance = await this._instantiateContractIfExistsAsync(
        this.artifact,
        this.contractAddress
      )

      this.isLoading = false
      this._contractLoadedResolver(this.contractInstance)
    } catch (err) {
      this.isLoading = false
      this._contractLoadedRejecter(err)
    }
  }

  _newLoadingPromise = () =>
    new Promise((resolve, reject) => {
      this._contractLoadedResolver = resolve
      this._contractLoadedRejecter = reject
    })

  /**
   * Set a new contract instance
   * @param {string} contractAddress - The address of the contract
   * @param {object} artifact - Contract artifact to use to load contract
   * @returns {object} contractInstance object
   */
  setContractInstance = async (
    contractAddress = this.contractAddress,
    artifact = this.artifact
  ) => {
    this.contractAddress = contractAddress
    this.artifact = artifact
    this.contractInstance = null
    return this.loadContract()
  }

  getContractAddress = () => this.contractAddress
}

export default StatefulContract
