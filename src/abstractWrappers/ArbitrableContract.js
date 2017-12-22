import AbstractWrapper from './AbstractWrapper'
import {
  DEFAULT_ARBITRATION_COST,
  DISPUTE_STATUS
} from '../../constants'

/**
 * Arbitrable Contract api
 */
class ArbitrableContract extends AbstractWrapper {
  /**
   * Arbitrable Contract Constructor
   * @param {object} storeProvider store provider object
   * @param {object} arbitrableWrapper arbitrable contract wrapper object
   */
  constructor(storeProvider, arbitrableWrapper) {
    super(storeProvider, undefined, arbitrableWrapper)
  }

  /**
  * Deploy a contract and add to the Store
  * @param {string} account Ethereum address
  * @param {int} value funds to be placed in contract
  * @param {string} hashContract Keccak hash of the plain English contract
  * @param {string} arbitratorAddress The address of the arbitrator contract
  * @param {int} timeout Time after which a party automatically loose a dispute
  * @param {string} partyB Ethereum address of the other party in the contract
  * @param {bytes} arbitratorExtraData Extra data for the arbitrator
  * @param {string} email Email address of the contract creator (default empty string)
  * @param {string} description Description of what the contract is about (default empty string)
  * @param args Extra arguments for the contract
  * @return object | Error
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
      contractInstance.address,
      hashContract,
      account,
      partyB,
      arbitratorAddress,
      timeout,
      email,
      description
    )

    // return contract data
    return await this.getData(contractInstance.address, account)
  }

  /**
   * Submit evidence
   * @param {string} account ETH address of user
   * @param {string} contractAddress ETH address of contract
   * @param {string} name name of evidence
   * @param {string} description description of evidence
   * @param {string} evidence A link to an evidence using its URI.
   * @return {string} txHash Hash transaction
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
  * Get ruling options from dispute via event
  * @param {string} contractAddress
  * @returns {object[]} an array of objects that specify the name and value of the resolution option
  */
  getRulingOptions = async (
    contractAddress
  )  => {
    const contractInstance = await this._loadArbitrableInstance(contractAddress)

    // fetch dispute resolution options
    const statusNumber = (await contractInstance.status()).toNumber()

    // should this just be !== ?
    if (statusNumber < DISPUTE_STATUS) return []

    // FIXME we should have a block number to start from so we don't have to rip through the entire chain
    const disputeEvent = await new Promise((resolve, reject) => {
      contractInstance.Dispute({}, {fromBlock: 0, toBlock: 'latest'}).get((error, eventResult) => {
        if (error) reject(error)
        // this should be ok because there should only be 1 Dispute event per contract
        resolve(eventResult[0])
      })
    })

    if (!disputeEvent) return []

    // FIXME there should only be one create dispute event per contract for now. allow abstract number
    const rulingOptions = disputeEvent.args._rulingOptions.split(';')
    let optionIndex = 0
    const resolutionOptions = rulingOptions.map(option => {
      optionIndex += 1
      return {
        name: option,
        value: optionIndex
      }
    })

    return resolutionOptions
  }

  /**
  * Get data from the store and contract for Arbitrable Contract
  * @param {string} contractAddress address of Arbitrable Contract
  * @param {string} account ETH address of user
  * @return {object} contract data
  */
  getData = async (
    contractAddress,
    account
  ) => {
    const contractData = await this._ArbitrableContract.getData(contractAddress)

    const storeData = await this._StoreProvider.getContractByAddress(account, contractAddress)

    return Object.assign({}, storeData, contractData)
  }
}

export default ArbitrableContract
