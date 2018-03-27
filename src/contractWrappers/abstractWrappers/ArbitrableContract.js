import delegateCalls from '../../utils/delegateCalls'

import AbstractWrapper from './AbstractWrapper'

/**
 * Arbitrable Contract API.
 */
class ArbitrableContract extends AbstractWrapper {
  constructor(contractWrapperInstance, storeProviderWrapperInstance) {
    super(contractWrapperInstance, storeProviderWrapperInstance)
    delegateCalls(this, contractWrapperInstance)
  }

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
    ...args
  ) => {
    const contractInstance = await this._contractWrapper.deploy(
      account,
      value,
      hashContract,
      arbitratorAddress,
      timeout,
      partyB,
      arbitratorExtraData,
      ...args
    )

    if (this._hasStoreProvider())
      await this._StoreProvider.updateContract(
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
          description
        }
      )

    // return contract data
    return this.getData(contractInstance.address, account)
  }

  /**
   * Submit evidence.
   * @param {string} account - ETH address of user.
   * @param {string} contractAddress - ETH address of contract.
   * @param {string} name - Name of evidence.
   * @param {string} description - Description of evidence.
   * @param {string} url - A link to an evidence using its URI.
   * @returns {string} - txHash Hash transaction.
   */
  submitEvidence = async (
    account,
    contractAddress,
    name,
    description = '',
    url
  ) => {
    const txHash = await this._contractWrapper.submitEvidence(
      account,
      contractAddress,
      name,
      description,
      url
    )

    if (this._hasStoreProvider())
      await this._StoreProvider.addEvidenceContract(
        contractAddress,
        account,
        name,
        description,
        url
      )

    return txHash
  }

  /**
   * Get all contracts TODO do we need to get contract data from blockchain?
   * @param {string} account - Address of user.
   * @returns {object[]} - Contract data from store.
   */
  getContractsForUser = async account => {
    if (!this._hasStoreProvider()) return []
    // fetch user profile
    const userProfile = await this._StoreProvider.setUpUserProfile(account)

    return userProfile.contracts
  }

  /**
   * Get evidence for contract.
   * @param {string} arbitrableContractAddress - Address of arbitrable contract.
   * @returns {object[]} - Array of evidence objects.
   */
  getEvidenceForArbitrableContract = async arbitrableContractAddress => {
    if (!this._hasStoreProvider()) return []

    const arbitrableContractData = await this._contractWrapper.getData(
      arbitrableContractAddress
    )
    const partyAContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      arbitrableContractAddress
    )
    const partyBContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyB,
      arbitrableContractAddress
    )

    const partyAEvidence = (partyAContractData
      ? partyAContractData.evidences
      : []
    ).map(evidence => {
      evidence.submitter = arbitrableContractData.partyA
      return evidence
    })
    const partyBEvidence = (partyBContractData
      ? partyBContractData.evidences
      : []
    ).map(evidence => {
      evidence.submitter = arbitrableContractData.partyB
      return evidence
    })

    return partyAEvidence.concat(partyBEvidence)
  }

  /**
   * Get data from the store and contract for Arbitrable Contract.
   * @param {string} contractAddress - Address of Arbitrable Contract.
   * @param {string} account - ETH address of user.
   * @returns {object} - Contract data.
   */
  getData = async (contractAddress, account) => {
    const contractData = await this._contractWrapper.getData(contractAddress)

    let storeData = {}
    if (account && this._hasStoreProvider())
      storeData = await this._StoreProvider.getContractByAddress(
        account,
        contractAddress
      )

    return Object.assign({}, storeData, contractData)
  }
}

export default ArbitrableContract
