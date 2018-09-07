import Eth from 'ethjs'

import getContractAddress from '../../utils/getContractAddress'
import AbstractContract from '../AbstractContract'

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
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {int} timeout - Time after which a party automatically loose a dispute.
   * @param {string} partyB - Ethereum address of the other party in the contract.
   * @param {bytes} arbitratorExtraData - Extra data for the arbitrator.
   * @param {string} email - Email address of the contract creator (default empty string).
   * @param {object} metaEvidence - The metaEvidence object associated with the Arbitarble Contract.
   * @param {...any} args - Extra arguments for the contract.
   * @returns {object | Error} - The contract object or an error.
   */
  deploy = async (
    account,
    value,
    arbitratorAddress,
    timeout,
    partyB,
    arbitratorExtraData = '',
    email = '',
    metaEvidence = {},
    ...args
  ) => {
    const web3Provider = this._contractImplementation.getWeb3Provider()
    const eth = new Eth(web3Provider)
    const txCount = await eth.getTransactionCount(account)
    // determine the contract address WARNING if the nonce changes this will produce a different address
    const contractAddress = getContractAddress(account, txCount)
    const metaEvidenceUri = this._StoreProvider.getMetaEvidenceUri(
      account,
      contractAddress
    )
    const contractInstance = await this._contractImplementation.constructor.deploy(
      account,
      value,
      arbitratorAddress,
      timeout,
      partyB,
      arbitratorExtraData,
      metaEvidenceUri,
      web3Provider,
      ...args
    )

    if (contractInstance.address !== contractAddress)
      throw new Error('Contract address does not match meta-evidence uri')

    const newContract = await this._StoreProvider.updateContract(
      account,
      contractInstance.address,
      {
        partyA: account,
        partyB,
        email,
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
    const evidenceUri = this._StoreProvider.getEvidenceUri(
      account,
      contractAddress,
      evidenceIndex
    )
    const txHash = await this._contractImplementation.submitEvidence(
      account,
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
}

export default ArbitrableContract
