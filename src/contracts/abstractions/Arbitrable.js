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
    const contractInstance = await this._contractImplementation.deploy(
      account,
      value,
      hashContract,
      arbitratorAddress,
      timeout,
      partyB,
      arbitratorExtraData,
      ...args
    )

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
   * @param {string} name - Name of evidence.
   * @param {string} description - Description of evidence.
   * @param {string} url - A link to an evidence using its URI.
   * @returns {string} - txHash Hash transaction.
   */
  submitEvidence = async (account, name, description = '', url) => {
    const txHash = await this._contractImplementation.submitEvidence(
      account,
      name,
      description,
      url
    )

    await this._StoreProvider.addEvidenceContract(
      this._contractImplementation.contractAddress,
      account,
      {
        name,
        description,
        url
      }
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
    const userProfile = await this._StoreProvider.setUpUserProfile(account)

    return userProfile.contracts
  }

  /**
   * Get evidence for contract.
   * @param {string} contractAddress - Address of arbitrable contract.
   * @returns {object[]} - Array of evidence objects.
   */
  getEvidenceForArbitrableContract = async () => {
    const arbitrableContractData = await this._contractImplementation.getData()
    const partyAContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyA,
      this._contractImplementation.contractAddress
    )
    const partyBContractData = await this._StoreProvider.getContractByAddress(
      arbitrableContractData.partyB,
      this._contractImplementation.contractAddress
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
   * @param {string} account - ETH address of user.
   * @returns {object} - Contract data.
   */
  getData = async account => {
    const contractData = await this._contractImplementation.getData()

    const storeData = await this._StoreProvider.getContractByAddress(
      account,
      this._contractImplementation.contractAddress
    )

    return Object.assign({}, storeData, contractData)
  }
}

export default ArbitrableContract
