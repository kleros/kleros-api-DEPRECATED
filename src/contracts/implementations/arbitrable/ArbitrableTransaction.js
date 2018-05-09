import arbitrableTransactionArtifact from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as contractConstants from '../../../constants/contract'
import * as errorConstants from '../../../constants/error'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'

/**
 * Provides interaction with an Arbitrable Transaction contract deployed on the blockchain.
 */
class ArbitrableTransaction extends ContractImplementation {
  /**
   * Constructor ArbitrableTransaction.
   * @param {object} web3Provider instance
   * @param {string} contractAddress of the contract
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, arbitrableTransactionArtifact, contractAddress)
  }

  /**
   * Deploy ArbitrableTransaction.
   * @param {object} account Ethereum account (default account[0])
   * @param {number} value funds to be placed in contract
   * @param {string} hashContract Keccak hash of the plain English contract. (default null hashed)
   * @param {string} arbitratorAddress The address of the arbitrator contract
   * @param {number} timeout Time after which a party automatically loose a dispute. (default 3600)
   * @param {string} partyB The recipient of the transaction. (default account[1])
   * @param {bytes} arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @param {object} web3Provider web3 provider object
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  static deploy = async (
    account,
    value = ethConstants.TRANSACTION.VALUE,
    hashContract,
    arbitratorAddress,
    timeout,
    partyB,
    arbitratorExtraData = '',
    web3Provider
  ) => {
    const contractDeployed = await deployContractAsync(
      account,
      value,
      arbitrableTransactionArtifact,
      web3Provider,
      arbitratorAddress,
      hashContract,
      timeout,
      partyB,
      arbitratorExtraData
    )

    return contractDeployed
  }

  /**
   * Pay the party B. To be called when the good is delivered or the service rendered.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {string} contractAddress - The address of the arbitrator contract.
   * @returns {object} - The result transaction object.
   */
  pay = async (account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    try {
      return this.contractInstance.pay({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_SELLER)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {number} arbitrationCost - Amount to pay the arbitrator. (default 0.15 ether).
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByPartyA = async (
    account = this._Web3Wrapper.getAccount(0),
    arbitrationCost = 0.15
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByPartyA({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param {string} account Ethereum account (default account[1]).
   * @param {number} arbitrationCost Amount to pay the arbitrator. (default 10000 wei).
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByPartyB = async (
    account = this._Web3Wrapper.getAccount(1),
    arbitrationCost = 0.15
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByPartyB({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Submit evidence.
   * @param {string} account ETH address of user.
   * @param {string} name name of evidence.
   * @param {string} description description of evidence.
   * @param {string} url A link to an evidence using its URI.
   * @returns {string} txHash Hash transaction.
   */
  submitEvidence = async (
    account = this._Web3Wrapper.getAccount(0),
    name,
    description = '',
    url
  ) => {
    await this.loadContract()

    const txHashObj = await this.contractInstance.submitEvidence(
      JSON.stringify(name, description, url),
      {
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      }
    )

    return txHashObj.tx
  }

  /**
   * Call by partyA if partyB is timeout
   * @param {string} account ETH address of user
   * @returns {object} The result transaction object.
   */
  callTimeOutPartyA = async (account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    const status = (await this.contractInstance.status()).toNumber()
    const timeout = (await this.contractInstance.timeout()).toNumber()
    const lastInteraction = (await this.contractInstance.lastInteraction()).toNumber()

    if (status !== contractConstants.STATUS.WAITING_PARTY_B) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Date.now() >= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutByPartyA({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CALL_TIMEOUT)
    }
  }

  /**
   * Call by partyB if partyA is timeout.
   * @param {string} account - ETH address of user.
   * @param {string} contractAddress - ETH address of contract.
   * @returns {object} The result transaction object.
   */
  callTimeOutPartyB = async (account = this._Web3Wrapper.getAccount(1)) => {
    await this.loadContract()

    const status = await this.contractInstance.status()
    const timeout = await this.contractInstance.timeout()
    const lastInteraction = await this.contractInstance.lastInteraction()

    if (status !== contractConstants.STATUS.WAITING_PARTY_A) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Date.now() >= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutByPartyB({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CALL_TIMEOUT)
    }
  }

  /**
   * Appeal an appealable ruling.
   * @param {string} account Ethereum account (default account[1]).
   * @param {bytes} extraData for the arbitrator appeal procedure.
   * @param {number} appealCost Amount to pay the arbitrator. (default 0.35 ether).
   * @returns {object} - The result transaction object.
   */
  appeal = async (
    account = this._Web3Wrapper.getAccount(1),
    extraData = 0x0,
    appealCost = 0.35
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.appeal(extraData, {
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: this._Web3Wrapper.toWei(appealCost, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_RAISE_AN_APPEAL)
    }
  }

  /**
   * Get ruling options from dispute via event
   * @param {string} arbitratorAddress address of arbitrator contract
   * @param {number} disputeId index of dispute
   * @returns {object[]} an array of objects that specify the name and value of the resolution option
   */
  getRulingOptions = async (arbitratorAddress, disputeId) => {
    await this.loadContract()

    // fetch dispute resolution options
    const statusNumber = (await this.contractInstance.status()).toNumber()

    // should this just be !== ?
    if (statusNumber < contractConstants.STATUS.DISPUTE_CREATED) return []

    // FIXME we should have a block number to start from so we don't have to rip through the entire chain
    const disputeEvents = await new Promise((resolve, reject) => {
      this.contractInstance
        .Dispute({}, { fromBlock: 0, toBlock: 'latest' })
        .get((error, eventResult) => {
          if (error) reject(error)

          resolve(eventResult)
        })
    })

    const disputeOption = _.filter(disputeEvents, event => {
      const optionDisputeId = event.args._disputeID.toNumber()
      // filter by arbitrator address and disputeId
      return (
        event.args._arbitrator === arbitratorAddress &&
        optionDisputeId === disputeId
      )
    })
    // should only be 1 at this point
    if (disputeOption.length !== 1) return []

    const rulingOptions = disputeOption[0].args._rulingOptions.split(';')
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
   * Data of the contract
   * @returns {object} Object Data of the contract.
   */
  getData = async () => {
    await this.loadContract()

    const [
      arbitrator,
      extraData,
      timeout,
      partyA,
      partyB,
      status,
      arbitratorExtraData,
      disputeId,
      partyAFee,
      partyBFee,
      lastInteraction,
      amount
    ] = await Promise.all([
      this.contractInstance.arbitrator(),
      this.contractInstance.arbitratorExtraData(),
      //  this.contractInstance.hashContract(),
      this.contractInstance.timeout(),
      this.contractInstance.partyA(),
      this.contractInstance.partyB(),
      this.contractInstance.status(),
      this.contractInstance.arbitratorExtraData(),
      this.contractInstance.disputeID(),
      this.contractInstance.partyAFee(),
      this.contractInstance.partyBFee(),
      this.contractInstance.lastInteraction(),
      this.contractInstance.amount()
    ])

    return {
      address: this.getContractAddress(),
      arbitrator,
      extraData,
      timeout: timeout.toNumber(),
      partyA,
      partyB,
      status: status.toNumber(),
      arbitratorExtraData,
      disputeId: disputeId.toNumber(),
      partyAFee: this._Web3Wrapper.fromWei(partyAFee, 'ether'),
      partyBFee: this._Web3Wrapper.fromWei(partyBFee, 'ether'),
      lastInteraction: lastInteraction.toNumber(),
      amount: amount.toNumber()
    }
  }
}

export default ArbitrableTransaction
