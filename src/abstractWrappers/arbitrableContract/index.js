import AbstractWrapper from '../AbstractWrapper'
import { DEFAULT_ARBITRATION_COST } from '../../../constants'

/**
 * Arbitrable Contract api
 */
class ArbitrableContract extends AbstractWrapper {
  /**
   * Arbitrable Contract Constructor
   * @param storeProvider store provider object
   * @param arbitrableWrapper arbitrable contract wrapper object
   */
  constructor(storeProvider, arbitrableWrapper) {
    super(storeProvider, undefined, arbitrableWrapper)
  }

  // default to arbitrator method if none exists
  __noSuchMethod__ = async (id, args) => {
    this._checkArbitrableWrappersSet()

    arbitrableMethod = this._ArbitrableContract[id]
    if (arbitrableMethod) {
      return await arbitrableMethod(...args)
    } else {
      throw new Error(`Arbitrable Contract has no method ${id}`)
    }
  }

  /**
  * Deploy a contract and add to the Store
  * @param account Ethereum address
  * @param value funds to be placed in contract
  * @param hashContract Keccak hash of the plain English contract
  * @param arbitratorAddress The address of the arbitrator contract
  * @param timeout Time after which a party automatically loose a dispute
  * @param partyB Ethereum address of the other party in the contract
  * @param arbitratorExtraData Extra data for the arbitrator
  * @param email Email address of the contract creator (default empty string)
  * @param description Description of what the contract is about (default empty string)
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
   * @param evidence A link to an evidence using its URI.
   * @return txHash Hash transaction
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
