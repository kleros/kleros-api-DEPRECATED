import AbstractContract from '../AbstractContract'

import getContractAddress from '../../utils/getContractAddress'

/**
 * Arbitrable Abstract Contarct API. This wraps an arbitrable contract. It provides
 * interaction with both the off chain store as well as the arbitrable instance. All
 * arbitrable methods from the supplied contract implementation can be called from this
 * object.
 */
class ArbitrableContract extends AbstractContract {
  /**
   * Deploy a contract and add to the Store.
   * @param {string} account - Ethereum address.
   * @param {int} value - funds to be placed in contract.
   * @param {string} hashContract - Keccak hash of the plain English contract.
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {int} timeout - Time after which a party automatically loose a dispute.
   * @param {string} partyB - Ethereum address of the other party in the contract.
   * @param {bytes} arbitratorExtraData - Extra data for the arbitrator.
   * @param {string} email - Email address of the contract creator (default empty string).
   * @param {string} title - Title of the contract (default empty string).
   * @param {string} description - Description of what the contract is about (default empty string).
   * @param {...any} args - Extra arguments for the contract.
   * @returns {object | Error} - The contract object or an error.
   */
  deploy = async (
    account,
    value,
    hashContract,
    arbitratorAddress,
    timeout,
    partyB,
    arbitratorExtraData = '',
    email = '',
    title = '',
    description = '',
    metaEvidence = {}
    ...args
  ) => {
    const web3Provider = this._contractImplementation.getWeb3Provider()
    // determine the contract address WARNING if the nonce changes this will produce a different address
    const contractAddress = getContractAddress(account, web3Provider)
    const metaEvidenceUri = this._StoreProvider.getMetaEvidenceUri(account, contractAddress)

    const contractInstance = await this._contractImplementation.constructor.deploy(
      account,
      value,
      hashContract,
      arbitratorAddress,
      timeout,
      partyB,
      arbitratorExtraData,
      metaEvidenceUri,
      web3Provider,
      ...args
    )

    if (contractInstance.address !== contractAddress)
      raise new Error('Contract address does not match meta-evidence uri')

    const newContract = await this._StoreProvider.updateContract(
      account,
      contractInstance.address,
      {
        hashContract,
        partyA: account,
        partyB,
        arbitrator: arbitratorAddress,
        timeout,
        email,
        title,
        description,
        metaEvidence
      }
    )

    return newContract
  }

  /**
   * Submit evidence. FIXME should we determine the hash for the user?
   * @param {string} account - ETH address of user.
   * @param {string} name - Name of evidence.
   * @param {string} description - Description of evidence.
   * @param {string} url - A link to an evidence using its URI.
   * @param {string} hash - A hash of the evidence at the URI. No hash if content is dynamic
   * @returns {string} - txHash Hash transaction.
   */
  submitEvidence = async (account, name, description, url, hash) => {
    const contractAddress = this._contractImplementation.contractAddress
    // get the index of the new evidence
    const evidenceIndex = await this._StoreProvider.addEvidenceContract(
      contractAddress,
      account,
      name,
      description,
      url,
      hash
    )
    // construct the unique URI
    const evidenceUri = this._StoreProvider.getEvidenceUri(account, contractAddress, evidenceIndex)

    const txHash = await this._contractImplementation.submitEvidence(
      account,
      name,
      description,
      evidenceUri
    )



    return txHash
  }

  /**
   * Get all contracts TODO do we need to get contract data from blockchain?
   * @param {string} account - Address of user.
   * @returns {object[]} - Contract data from store.
   */
  getContractsForUser = async account => {
    // fetch user profile
    const userProfile = await this._StoreProvider.newUserProfile(account)

    return userProfile.contracts
  }

  /**
   * Fetch all data from the store on the current contract.
   * @returns {object} - Store data for contract.
   */
  getDataFromStore = async () => {
    const contractInstance = await this._contractImplementation.loadContract()
    const partyA = await contractInstance.partyA()

    return this._StoreProvider.getContractByAddress(
      partyA,
      this._contractImplementation.contractAddress
    )
  }

  /**
   * Get data from the store and contract for Arbitrable Contract.
   * @param {string} account - ETH address of user.
   * @returns {object} - Contract data.
   */
  getData = async account => {
    const contractData = await this._contractImplementation.getData()

    let storeData = {}
    if (account)
      storeData = await this._StoreProvider.getContractByAddress(
        account,
        this._contractImplementation.contractAddress
      )

    return Object.assign({}, storeData, contractData)
  }
}

export default ArbitrableContract
