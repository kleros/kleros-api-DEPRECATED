import AbstractWrapper from './AbstractWrapper'

/**
 * Arbitrable Contract API.
 */
class ArbitrableContract extends AbstractWrapper {
  /**
   * ArbitrableContract Constructor.
   * @param {object} storeProvider - Store provider object.
   * @param {object} arbitrableWrapper - Arbitrable contract wrapper object.
   * @param {object} eventListener - EventListener instance.
   */
  constructor(storeProvider, arbitrableWrapper, eventListener) {
    super(storeProvider, undefined, arbitrableWrapper, eventListener)
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
  deployContract = async (
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
    this._checkArbitrableWrappersSet()

    const contractInstance = await this._ArbitrableContract.deploy(
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
    const txHash = await this._ArbitrableContract.submitEvidence(
      account,
      contractAddress,
      name,
      description,
      url
    )

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
   * Gets the arbitrator address of the contract.
   * @param {string} arbitrableContractAddress - The address of the contract.
   * @returns {string} - The arbitratror's address.
   */
  getArbitrator = async arbitrableContractAddress => {
    const contractInstance = await this._loadArbitrableInstance(
      arbitrableContractAddress
    )

    return contractInstance.arbitrator()
  }

  /**
   * Get data from the store and contract for Arbitrable Contract.
   * @param {string} contractAddress - Address of Arbitrable Contract.
   * @param {string} account - ETH address of user.
   * @returns {object} - Contract data.
   */
  getData = async (contractAddress, account) => {
    const contractData = await this._ArbitrableContract.getData(contractAddress)

    let storeData = {}
    if (account)
      storeData = await this._StoreProvider.getContractByAddress(
        account,
        contractAddress
      )

    return Object.assign({}, storeData, contractData)
  }
}

export default ArbitrableContract
